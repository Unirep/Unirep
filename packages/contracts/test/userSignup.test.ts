// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
    hash7,
    IncrementalMerkleTree,
    ZkIdentity,
    stringifyBigInts,
} from '@unirep/crypto'
import { STATE_TREE_DEPTH, Circuit } from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import { EPOCH_LENGTH, SignupProof } from '../src'
import { deployUnirep } from '../deploy'

describe('User Signup', function () {
    this.timeout(120000)

    let unirepContract

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])
    })

    it('attester sign up', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
    })

    it('should fail to signup with invalid proof', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.signup,
            stringifyBigInts({
                epoch: 0,
                identity_nullifier: id.identityNullifier,
                identity_trapdoor: id.trapdoor,
                attester_id: attester.address,
            })
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

    it('sign up many users should succeed', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const startEpoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const semaphoreTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        for (let epoch = startEpoch.toNumber(); epoch < 3; epoch++) {
            const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
            for (let i = 0; i < 3; i++) {
                console.log('epoch:', epoch, ', the', i, 'th user')
                const id = new ZkIdentity()
                const r = await defaultProver.genProofAndPublicSignals(
                    Circuit.signup,
                    stringifyBigInts({
                        epoch,
                        identity_nullifier: id.identityNullifier,
                        identity_trapdoor: id.trapdoor,
                        attester_id: attester.address,
                    })
                )
                const { publicSignals, proof } = new SignupProof(
                    r.publicSignals,
                    r.proof,
                    defaultProver
                )
                const tx = await unirepContract
                    .connect(attester)
                    .userSignUp(publicSignals, proof)
                await tx.wait()

                const gstLeaf = hash7([
                    id.identityNullifier,
                    BigInt(attester.address),
                    epoch,
                    0,
                    0,
                    0,
                    0,
                ])

                stateTree.insert(gstLeaf)
                const currentRoot = await unirepContract.attesterStateTreeRoot(
                    attester.address,
                    epoch
                )
                const rootExists =
                    await unirepContract.attesterStateTreeRootExists(
                        attester.address,
                        epoch,
                        stateTree.root
                    )
                const leafCount =
                    await unirepContract.attesterStateTreeLeafCount(
                        attester.address,
                        epoch
                    )
                expect(leafCount).to.equal(i + 1)
                expect(rootExists).to.be.true
                expect(currentRoot.toString(), 'state tree root').to.equal(
                    stateTree.root.toString()
                )
                semaphoreTree.insert(id.genIdentityCommitment())
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
    })

    it('double sign up should fail', async () => {
        const id = new ZkIdentity()
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const tx = await unirepContract.updateEpochIfNeeded(attester.address)
        await tx.wait()
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        {
            // first signup
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.signup,
                stringifyBigInts({
                    epoch,
                    identity_nullifier: id.identityNullifier,
                    identity_trapdoor: id.trapdoor,
                    attester_id: attester.address,
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
            stringifyBigInts({
                epoch,
                identity_nullifier: id.identityNullifier,
                identity_trapdoor: id.trapdoor,
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
        ).to.be.revertedWithCustomError(unirepContract, `UserAlreadySignedUp`)
    })

    it('should fail to signup for unregistered attester', async () => {
        const id = new ZkIdentity()
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const unregisteredAttester = accounts[5]
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.signup,
            stringifyBigInts({
                epoch,
                identity_nullifier: id.identityNullifier,
                identity_trapdoor: id.trapdoor,
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
        const id = new ZkIdentity()
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const wrongEpoch = 44444
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.signup,
            stringifyBigInts({
                epoch: wrongEpoch,
                identity_nullifier: id.identityNullifier,
                identity_trapdoor: id.trapdoor,
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
        ).to.be.revertedWithCustomError(unirepContract, 'EpochNotMatch')
    })

    it('should fail to signup with wrong msg.sender', async () => {
        const id = new ZkIdentity()
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const wrongAttester = accounts[2]
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.signup,
            stringifyBigInts({
                epoch,
                identity_nullifier: id.identityNullifier,
                identity_trapdoor: id.trapdoor,
                attester_id: attester.address,
            })
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

    it('should update current epoch if needed', async () => {
        const id = new ZkIdentity()
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const epoch = await unirepContract.attesterCurrentEpoch(
            attester.address
        )
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.signup,
            stringifyBigInts({
                epoch,
                identity_nullifier: id.identityNullifier,
                identity_trapdoor: id.trapdoor,
                attester_id: attester.address,
            })
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
})
