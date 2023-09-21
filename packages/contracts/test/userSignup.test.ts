// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import {
    IncrementalMerkleTree,
    stringifyBigInts,
    genStateTreeLeaf,
    F,
    MAX_EPOCH,
    genIdentityHash,
} from '@unirep/utils'
import { Circuit, SignupProof, CircuitConfig } from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import { EPOCH_LENGTH } from './config'
import { deployUnirep } from '../deploy'

const { STATE_TREE_DEPTH, FIELD_COUNT, REPL_FIELD_BITS } = CircuitConfig.default

const epoch = 0
const id = new Identity()
let circuitInputs = {
    epoch,
    secret: id.secret,
    chain_id: 0,
    attester_id: 0,
}

describe('User Signup', function () {
    this.timeout(300000)

    let unirepContract
    let attester
    let chainId

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
        const network = await accounts[0].provider.getNetwork()
        chainId = network.chainId
        attester = accounts[1]
        circuitInputs = {
            ...circuitInputs,
            chain_id: chainId,
            attester_id: attester.address,
        }
    })

    {
        let snapshot
        beforeEach(async () => {
            snapshot = await ethers.provider.send('evm_snapshot', [])
            const accounts = await ethers.getSigners()
            const attester = accounts[1]
            await unirepContract
                .connect(attester)
                .attesterSignUp(EPOCH_LENGTH)
                .then((t) => t.wait())
        })

        afterEach(() => ethers.provider.send('evm_revert', [snapshot]))
    }

    it('should fail to signup with invalid proof', async () => {
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.signup,
            stringifyBigInts(circuitInputs)
        )
        const { publicSignals, proof } = new SignupProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        const _proof = [...proof]
        _proof[0] = BigInt(proof[0].toString()) + BigInt(1)
        await expect(
            unirepContract.connect(attester).userSignUp(publicSignals, _proof)
        ).to.be.reverted
        const _publicSignals = [...publicSignals]
        _publicSignals[0] = BigInt(publicSignals[0].toString()) + BigInt(1)
        await expect(
            unirepContract.connect(attester).userSignUp(_publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidProof')
    })

    it('should fail to signup with unregistered attester', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[2]
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.signup,
            stringifyBigInts({
                ...circuitInputs,
                attester_id: attester.address,
            })
        )
        const { publicSignals, proof } = new SignupProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await expect(
            unirepContract.connect(attester).userSignUp(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'AttesterNotSignUp')
    })

    it('sign up many users should succeed', async () => {
        const startEpoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const semaphoreTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const roots = {}
        for (let epoch = startEpoch; epoch < 3; epoch++) {
            const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
            roots[epoch] = []
            for (let i = 0; i < 3; i++) {
                const { secret, commitment } = new Identity()
                const r = await defaultProver.genProofAndPublicSignals(
                    Circuit.signup,
                    stringifyBigInts({
                        ...circuitInputs,
                        epoch,
                        secret,
                    })
                )
                const { publicSignals, proof } = new SignupProof(
                    r.publicSignals,
                    r.proof,
                    defaultProver
                )
                await unirepContract
                    .connect(attester)
                    .userSignUp(publicSignals, proof)
                    .then((t) => t.wait())

                const gstLeaf = genStateTreeLeaf(
                    secret,
                    BigInt(attester.address),
                    epoch,
                    Array(FIELD_COUNT).fill(0),
                    chainId
                )

                stateTree.insert(gstLeaf)
                const currentRoot = await unirepContract.attesterStateTreeRoot(
                    attester.address
                )
                roots[epoch].push(currentRoot.toString())
                const leafCount =
                    await unirepContract.attesterStateTreeLeafCount(
                        attester.address
                    )
                expect(leafCount).to.equal(i + 1)
                expect(currentRoot.toString(), 'state tree root').to.equal(
                    stateTree.root.toString()
                )
                semaphoreTree.insert(commitment)
                const semaphoreRoot =
                    await unirepContract.attesterSemaphoreGroupRoot(
                        attester.address
                    )
                expect(semaphoreRoot.toString(), 'semaphore root').to.equal(
                    semaphoreTree.root.toString()
                )
            }
            await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        }
        for (const epoch in roots) {
            for (const root of roots[epoch]) {
                const rootExists =
                    await unirepContract.attesterStateTreeRootExists(
                        attester.address,
                        epoch,
                        root
                    )
                expect(rootExists).to.be.true
            }
        }
    })

    it('should decode signup signals', async () => {
        await unirepContract
            .updateEpochIfNeeded(attester.address)
            .then((t) => t.wait())
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.signup,
            stringifyBigInts({
                ...circuitInputs,
                epoch,
            })
        )
        {
            const {
                publicSignals,
                control,
                identityCommitment,
                attesterId,
                epoch,
                chainId,
                stateTreeLeaf,
            } = new SignupProof(r.publicSignals, r.proof, defaultProver)

            const controlOut = await unirepContract.decodeSignupControl(control)
            expect(controlOut['attesterId'].toString()).equal(
                attesterId.toString()
            )
            expect(controlOut['epoch'].toString()).equal(epoch.toString())
            expect(controlOut['chainId'].toString()).equal(chainId.toString())

            const signals = await unirepContract.decodeSignupSignals(
                publicSignals
            )
            expect(signals['attesterId'].toString()).equal(
                attesterId.toString()
            )
            expect(signals['epoch'].toString()).equal(epoch.toString())
            expect(signals['chainId'].toString()).equal(chainId.toString())
            expect(signals['stateTreeLeaf'].toString()).equal(
                stateTreeLeaf.toString()
            )
            expect(signals['identityCommitment'].toString()).equal(
                identityCommitment.toString()
            )
        }
    })

    it('double sign up should fail', async () => {
        await unirepContract
            .updateEpochIfNeeded(attester.address)
            .then((t) => t.wait())
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        {
            // first signup
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.signup,
                stringifyBigInts({
                    ...circuitInputs,
                    epoch,
                })
            )
            const { publicSignals, proof } = new SignupProof(
                r.publicSignals,
                r.proof,
                defaultProver
            )
            await unirepContract
                .connect(attester)
                .userSignUp(publicSignals, proof)
                .then((t) => t.wait())
        }
        // second signup
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.signup,
            stringifyBigInts(circuitInputs)
        )
        const { publicSignals, proof } = new SignupProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await expect(
            unirepContract.connect(attester).userSignUp(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, `UserAlreadySignedUp`)
    })

    it('should fail to signup for unregistered attester', async () => {
        const accounts = await ethers.getSigners()
        const unregisteredAttester = accounts[5]
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.signup,
            stringifyBigInts({
                ...circuitInputs,
                attester_id: BigInt(unregisteredAttester.address),
            })
        )
        const { publicSignals, proof } = new SignupProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await expect(
            unirepContract
                .connect(unregisteredAttester)
                .userSignUp(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'AttesterNotSignUp')
    })

    it('should fail to signup with wrong zk epoch', async () => {
        const wrongEpoch = 44444
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.signup,
            stringifyBigInts({
                ...circuitInputs,
                epoch: wrongEpoch,
            })
        )
        const { publicSignals, proof } = new SignupProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await expect(
            unirepContract.connect(attester).userSignUp(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'EpochNotMatch')
    })

    it('should fail to signup with wrong msg.sender', async () => {
        const accounts = await ethers.getSigners()
        const wrongAttester = accounts[2]
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.signup,
            stringifyBigInts(circuitInputs)
        )
        const { publicSignals, proof } = new SignupProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await expect(
            unirepContract
                .connect(wrongAttester)
                .userSignUp(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'AttesterIdNotMatch')
    })

    it('should fail to signup with wrong chain ID', async () => {
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.signup,
            stringifyBigInts({
                ...circuitInputs,
                chain_id: 3,
            })
        )
        const { publicSignals, proof } = new SignupProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await expect(
            unirepContract.connect(attester).userSignUp(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'ChainIdNotMatch')
    })

    it('should update current epoch if needed', async () => {
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.signup,
            stringifyBigInts(circuitInputs)
        )
        const { publicSignals, proof } = new SignupProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await expect(
            unirepContract.connect(attester).userSignUp(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'EpochNotMatch')
    })

    it('should sign up user with initial data', async () => {
        const config = await unirepContract.config()
        const contractEpoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )

        const data = Array(config.fieldCount)
            .fill(0)
            .map((_, i) => {
                return i + 100
            })

        const expectedData = data.map((d, i) => {
            if (i < config.sumFieldCount) {
                return d
            } else {
                return BigInt(d) << BigInt(config.replNonceBits)
            }
        })
        const leaf = genStateTreeLeaf(
            id.secret,
            attester.address,
            contractEpoch,
            expectedData,
            chainId
        )
        const identityHash = genIdentityHash(
            id.secret,
            attester.address,
            contractEpoch,
            chainId
        )
        const tx = await unirepContract
            .connect(attester)
            .manualUserSignUp(contractEpoch, id.commitment, identityHash, data)
        const leafIndex = 0
        await expect(tx)
            .to.emit(unirepContract, 'UserSignedUp')
            .withArgs(contractEpoch, id.commitment, attester.address, leafIndex)
        await expect(tx)
            .to.emit(unirepContract, 'StateTreeLeaf')
            .withArgs(contractEpoch, attester.address, leafIndex, leaf)
        for (const [i, d] of Object.entries(expectedData)) {
            await expect(tx)
                .to.emit(unirepContract, 'Attestation')
                .withArgs(MAX_EPOCH, id.commitment, attester.address, i, d)
        }
    })

    it('should sign up users with zero init data', async () => {
        const zeroData = []

        const config = await unirepContract.config()
        const leaf = genStateTreeLeaf(
            id.secret,
            attester.address,
            epoch,
            Array(config.fieldCount).fill(0),
            chainId
        )
        const identityHash = genIdentityHash(
            id.secret,
            attester.address,
            epoch,
            chainId
        )
        const tx = await unirepContract
            .connect(attester)
            .manualUserSignUp(epoch, id.commitment, identityHash, zeroData)
        const leafIndex = 0
        await expect(tx)
            .to.emit(unirepContract, 'UserSignedUp')
            .withArgs(epoch, id.commitment, attester.address, leafIndex)
        await expect(tx)
            .to.emit(unirepContract, 'StateTreeLeaf')
            .withArgs(epoch, attester.address, leafIndex, leaf)
    })

    it('should fail to sign up with out of range replacement data', async () => {
        const config = await unirepContract.config()

        const data = Array(config.fieldCount)
            .fill(0)
            .map((_, i) => {
                if (i >= config.sumFieldCount) {
                    return BigInt(2) ** BigInt(REPL_FIELD_BITS)
                }
                return 0
            })

        const identityHash = genIdentityHash(
            id.secret,
            attester.address,
            epoch,
            chainId
        )
        const tx = unirepContract
            .connect(attester)
            .manualUserSignUp(epoch, id.commitment, identityHash, data)
        await expect(tx).to.be.revertedWithCustomError(
            unirepContract,
            'OutOfRange'
        )
    })

    it('should fail to sign up with too much user data', async () => {
        const config = await unirepContract.config()
        const hash = 1

        const tx = unirepContract
            .connect(attester)
            .manualUserSignUp(
                epoch,
                id.commitment,
                hash,
                Array(config.fieldCount + 1).fill(1)
            )
        await expect(tx).to.be.revertedWithCustomError(
            unirepContract,
            'OutOfRange'
        )
    })

    it('should fail to sign up with user data out of range', async () => {
        const idHash = 1
        const tx = unirepContract
            .connect(attester)
            .manualUserSignUp(epoch, id.commitment, idHash, [F])
        await expect(tx).to.be.revertedWithCustomError(
            unirepContract,
            'InvalidField'
        )
    })
})
