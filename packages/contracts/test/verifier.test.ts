// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import {
    F,
    genRandomSalt,
    genStateTreeLeaf,
    IncrementalMerkleTree,
    stringifyBigInts,
} from '@unirep/utils'
import {
    Circuit,
    EpochKeyProof,
    EpochKeyLiteProof,
    ReputationProof,
    SignupProof,
    CircuitConfig,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import { deployVerifierHelper } from '../deploy'
const {
    STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    FIELD_COUNT,
    REPL_NONCE_BITS,
} = CircuitConfig.default

function randomBits(bit: number) {
    return genRandomSalt() % (BigInt(2) ** BigInt(bit) - BigInt(1))
}

describe('Epoch key lite verifier helper', function () {
    this.timeout(300000)

    let epochKeyLiteVerifierHelper
    let chainId
    const id = new Identity()
    const sigData = 1234
    const epoch = 352
    const nonce = 2
    const revealNonce = 1
    let circuitInputs = {
        identity_secret: id.secret,
        sig_data: sigData,
        epoch,
        nonce,
        attester_id: 0,
        reveal_nonce: revealNonce,
        chain_id: 0,
    }

    before(async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        epochKeyLiteVerifierHelper = await deployVerifierHelper(
            accounts[0],
            Circuit.epochKeyLite
        )
        const network = await accounts[0].provider.getNetwork()
        chainId = network.chainId
        circuitInputs = {
            ...circuitInputs,
            attester_id: attester.address,
            chain_id: chainId,
        }
    })

    {
        let snapshot
        beforeEach(async () => {
            snapshot = await ethers.provider.send('evm_snapshot', [])
        })

        afterEach(() => ethers.provider.send('evm_revert', [snapshot]))
    }

    it('should verify an epoch key lite proof', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.epochKeyLite,
                stringifyBigInts({
                    ...circuitInputs,
                    nonce,
                })
            )

            const v = await defaultProver.verifyProof(
                Circuit.epochKeyLite,
                r.publicSignals,
                r.proof
            )
            expect(v).to.be.true
            const { publicSignals, proof, ...proofData } =
                new EpochKeyLiteProof(r.publicSignals, r.proof)
            const signals = await epochKeyLiteVerifierHelper.verifyAndCheck(
                publicSignals,
                proof
            )

            expect(signals.nonce.toString()).to.equal(
                proofData.nonce.toString()
            )
            expect(signals.epoch.toString()).to.equal(
                proofData.epoch.toString()
            )
            expect(signals.attesterId.toString()).to.equal(
                proofData.attesterId.toString()
            )
            expect(signals.revealNonce).to.equal(true)

            expect(signals.chainId.toString()).to.equal(
                proofData.chainId.toString()
            )
            expect(signals.epochKey.toString()).to.equal(
                proofData.epochKey.toString()
            )
            expect(signals.data.toString()).to.equal(proofData.data.toString())
        }
    })

    it('should decode public signals', async () => {
        // should reveal nonce
        {
            const epoch = randomBits(48)
            const nonce = randomBits(8)
            const attesterId = randomBits(160)
            const revealNonce = BigInt(1)

            const control = EpochKeyLiteProof.buildControl({
                attesterId,
                epoch,
                nonce,
                revealNonce,
                chainId,
            })

            const decodedControl =
                await epochKeyLiteVerifierHelper.decodeEpochKeyControl(control)
            expect(decodedControl.epoch.toString()).to.equal(epoch.toString())
            expect(decodedControl.nonce.toString()).to.equal(nonce.toString())
            expect(decodedControl.attesterId.toString()).to.equal(
                attesterId.toString()
            )
            expect(decodedControl.revealNonce).to.equal(true)
            expect(decodedControl.chainId.toString()).to.equal(
                chainId.toString()
            )
        }

        // should not reveal nonce
        {
            const epoch = randomBits(48)
            const nonce = randomBits(8)
            const attesterId = randomBits(160)
            const revealNonce = BigInt(0)

            const control = EpochKeyLiteProof.buildControl({
                attesterId,
                epoch,
                nonce,
                revealNonce,
                chainId,
            })

            const decodedControl =
                await epochKeyLiteVerifierHelper.decodeEpochKeyControl(control)
            expect(decodedControl.epoch.toString()).to.equal(epoch.toString())
            expect(decodedControl.nonce.toString()).to.equal('0')
            expect(decodedControl.attesterId.toString()).to.equal(
                attesterId.toString()
            )
            expect(decodedControl.revealNonce).to.equal(false)
            expect(decodedControl.chainId.toString()).to.equal(
                chainId.toString()
            )
        }
    })

    it('should fail to verify an epoch key lite proof with invalid epoch key', async () => {
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.epochKeyLite,
            stringifyBigInts(circuitInputs)
        )

        const v = await defaultProver.verifyProof(
            Circuit.epochKeyLite,
            r.publicSignals,
            r.proof
        )
        expect(v).to.be.true
        const { publicSignals, proof, idx } = new EpochKeyLiteProof(
            r.publicSignals,
            r.proof
        )

        {
            const _publicSignals = [...publicSignals]
            _publicSignals[idx.epochKey] = F.toString()
            await expect(
                epochKeyLiteVerifierHelper.verifyAndCheck(_publicSignals, proof)
            ).to.be.revertedWithCustomError(
                epochKeyLiteVerifierHelper,
                'InvalidEpochKey'
            )
        }
    })

    it('should fail to verify an epoch key lite proof with invalid chain id', async () => {
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.epochKeyLite,
            stringifyBigInts({
                ...circuitInputs,
                chain_id: 123,
            })
        )

        const v = await defaultProver.verifyProof(
            Circuit.epochKeyLite,
            r.publicSignals,
            r.proof
        )
        expect(v).to.be.true
        const { publicSignals, proof } = new EpochKeyLiteProof(
            r.publicSignals,
            r.proof
        )

        await expect(
            epochKeyLiteVerifierHelper.verifyAndCheck(publicSignals, proof)
        ).to.be.revertedWithCustomError(
            epochKeyLiteVerifierHelper,
            'ChainIdNotMatch'
        )
    })

    it('should fail to verify an epoch key lite proof with invalid proof', async () => {
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.epochKeyLite,
            stringifyBigInts(circuitInputs)
        )

        const v = await defaultProver.verifyProof(
            Circuit.epochKeyLite,
            r.publicSignals,
            r.proof
        )
        expect(v).to.be.true
        const { publicSignals, proof } = new EpochKeyLiteProof(
            r.publicSignals,
            r.proof
        )
        {
            const _proof = [...proof]
            _proof[0] = (BigInt(proof[0]) + BigInt(1)).toString()
            await expect(
                epochKeyLiteVerifierHelper.verifyAndCheck(publicSignals, _proof)
            ).to.be.reverted
        }

        {
            const _publicSignals = [...publicSignals]
            _publicSignals[0] = (
                BigInt(publicSignals[0]) + BigInt(1)
            ).toString()
            await expect(
                epochKeyLiteVerifierHelper.verifyAndCheck(_publicSignals, proof)
            ).to.be.revertedWithCustomError(
                epochKeyLiteVerifierHelper,
                'InvalidProof'
            )
        }
    })

    it('verify that msg.sender is the same as attesterId', async () => {
        const accounts = await ethers.getSigners()
        const owner = accounts[0]
        {
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.epochKeyLite,
                stringifyBigInts({
                    ...circuitInputs,
                    attester_id: owner.address,
                })
            )

            const { publicSignals, proof } = new EpochKeyLiteProof(
                r.publicSignals,
                r.proof
            )
            await expect(
                epochKeyLiteVerifierHelper
                    .connect(owner)
                    .verifyAndCheckCaller(publicSignals, proof)
            ).to.not.be.reverted
        }
        {
            const randomAddress = BigInt(10)
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.epochKeyLite,
                stringifyBigInts({
                    ...circuitInputs,
                    attester_id: randomAddress,
                })
            )
            const { publicSignals, proof } = new EpochKeyLiteProof(
                r.publicSignals,
                r.proof
            )
            await expect(
                epochKeyLiteVerifierHelper
                    .connect(owner)
                    .verifyAndCheckCaller(publicSignals, proof)
            ).to.be.revertedWithCustomError(
                epochKeyLiteVerifierHelper,
                'CallerInvalid'
            )
        }
    })
})

describe('Epoch key verifier helper', function () {
    this.timeout(500000)

    let epochKeyVerifierHelper
    const id = new Identity()
    const epoch = 5352
    const data = 234333
    let chainId
    let circuitInputs = {
        state_tree_elements: [0],
        state_tree_indexes: [0],
        identity_secret: id.secret,
        data: Array(FIELD_COUNT).fill(0),
        sig_data: data,
        epoch,
        nonce: 0,
        attester_id: 0,
        reveal_nonce: 0,
        chain_id: 0,
    }

    before(async () => {
        const accounts = await ethers.getSigners()
        epochKeyVerifierHelper = await deployVerifierHelper(
            accounts[0],
            Circuit.epochKey
        )
        const attester = accounts[1]
        const attesterId = attester.address
        const network = await attester.provider.getNetwork()
        chainId = network.chainId

        // sign up a user
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.signup,
            stringifyBigInts({
                epoch: epoch.toString(),
                secret: id.secret,
                attester_id: attesterId,
                chain_id: chainId,
            })
        )
        const { stateTreeLeaf: leaf } = new SignupProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )

        const index = 0
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(leaf)

        const merkleProof = stateTree.createProof(index)
        circuitInputs = {
            ...circuitInputs,
            state_tree_elements: merkleProof.siblings,
            state_tree_indexes: merkleProof.pathIndices,
            attester_id: attester.address,
            chain_id: chainId,
        }
    })

    {
        let snapshot
        beforeEach(async () => {
            snapshot = await ethers.provider.send('evm_snapshot', [])
        })

        afterEach(() => ethers.provider.send('evm_revert', [snapshot]))
    }

    it('should verify an epoch key proof', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.epochKey,
                stringifyBigInts({
                    ...circuitInputs,
                    nonce,
                })
            )

            const v = await defaultProver.verifyProof(
                Circuit.epochKey,
                r.publicSignals,
                r.proof
            )
            expect(v).to.be.true
            const { publicSignals, proof } = new EpochKeyProof(
                r.publicSignals,
                r.proof
            )
            await epochKeyVerifierHelper.verifyAndCheck(publicSignals, proof)
        }
    })

    it('should decode public signals', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const revealNonce = 1
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.epochKey,
                stringifyBigInts({
                    ...circuitInputs,
                    nonce,
                    reveal_nonce: revealNonce,
                })
            )

            const v = await defaultProver.verifyProof(
                Circuit.epochKey,
                r.publicSignals,
                r.proof
            )
            expect(v).to.be.true
            const proof = new EpochKeyProof(r.publicSignals, r.proof)
            const signals = await epochKeyVerifierHelper.decodeEpochKeySignals(
                proof.publicSignals
            )
            expect(signals.epochKey.toString()).to.equal(
                proof.epochKey.toString()
            )
            expect(signals.stateTreeRoot.toString()).to.equal(
                proof.stateTreeRoot.toString()
            )
            expect(signals.nonce.toString()).to.equal(proof.nonce.toString())
            expect(signals.epoch.toString()).to.equal(proof.epoch.toString())
            expect(signals.revealNonce).to.equal(Boolean(revealNonce))
            expect(signals.attesterId.toString()).to.equal(
                proof.attesterId.toString()
            )
            expect(signals.chainId.toString()).to.equal(
                proof.chainId.toString()
            )
            expect(signals.data.toString()).to.equal(proof.data.toString())
        }
    })

    it('should fail to verify an epoch key proof with invalid epoch key', async () => {
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.epochKey,
            stringifyBigInts(circuitInputs)
        )
        const v = await defaultProver.verifyProof(
            Circuit.epochKey,
            r.publicSignals,
            r.proof
        )
        expect(v).to.be.true
        const { publicSignals, proof, idx } = new EpochKeyProof(
            r.publicSignals,
            r.proof
        )

        {
            const _publicSignals = [...publicSignals]
            _publicSignals[idx.epochKey] = F.toString()
            await expect(
                epochKeyVerifierHelper.verifyAndCheck(_publicSignals, proof)
            ).to.be.revertedWithCustomError(
                epochKeyVerifierHelper,
                'InvalidEpochKey'
            )
        }
    })

    it('should fail to verify an epoch key proof with invalid chain id', async () => {
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.epochKey,
            stringifyBigInts({
                ...circuitInputs,
                chain_id: 123,
            })
        )
        const v = await defaultProver.verifyProof(
            Circuit.epochKey,
            r.publicSignals,
            r.proof
        )
        expect(v).to.be.true
        const { publicSignals, proof } = new EpochKeyProof(
            r.publicSignals,
            r.proof
        )

        await expect(
            epochKeyVerifierHelper.verifyAndCheck(publicSignals, proof)
        ).to.be.revertedWithCustomError(
            epochKeyVerifierHelper,
            'ChainIdNotMatch'
        )
    })

    it('should fail to verify an epoch key proof with invalid proof', async () => {
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.epochKey,
            stringifyBigInts(circuitInputs)
        )

        const v = await defaultProver.verifyProof(
            Circuit.epochKey,
            r.publicSignals,
            r.proof
        )
        expect(v).to.be.true
        const { publicSignals, proof } = new EpochKeyProof(
            r.publicSignals,
            r.proof
        )
        {
            const _proof = [...proof].map((x) => BigInt(x))
            _proof[0] = BigInt(proof[0].toString()) + BigInt(1)
            await expect(
                epochKeyVerifierHelper.verifyAndCheck(publicSignals, _proof)
            ).to.be.reverted
        }

        {
            const _publicSignals = [...publicSignals]
            _publicSignals[0] = (
                BigInt(publicSignals[0]) + BigInt(1)
            ).toString()
            await expect(
                epochKeyVerifierHelper.verifyAndCheck(_publicSignals, proof)
            ).to.be.revertedWithCustomError(
                epochKeyVerifierHelper,
                'InvalidProof'
            )
        }
    })

    it('verify that msg.sender is the same as attesterId', async () => {
        const accounts = await ethers.getSigners()
        const owner = accounts[0]
        {
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.epochKey,
                stringifyBigInts({
                    ...circuitInputs,
                    attester_id: owner.address,
                })
            )

            const { publicSignals, proof } = new EpochKeyProof(
                r.publicSignals,
                r.proof
            )
            await expect(
                epochKeyVerifierHelper
                    .connect(owner)
                    .verifyAndCheckCaller(publicSignals, proof)
            ).to.not.be.revertedWithCustomError(
                epochKeyVerifierHelper,
                'CallerInvalid'
            )
        }
    })
})

describe('Reputation verifier helper', function () {
    this.timeout(120000)

    const id = new Identity()
    const epoch = 0
    const sigData = 696969
    const graffiti = BigInt(234524)
    const data = [0, 0, 0, 0, BigInt(graffiti) << BigInt(REPL_NONCE_BITS), 0]
    let circuitInputs = {
        identity_secret: id.secret,
        state_tree_indexes: [0],
        state_tree_elements: [0],
        data,
        prove_graffiti: 1,
        graffiti,
        reveal_nonce: false,
        attester_id: 0,
        epoch,
        nonce: 0,
        min_rep: 0,
        max_rep: 0,
        prove_min_rep: 0,
        prove_max_rep: 0,
        prove_zero_rep: 0,
        sig_data: sigData,
        chain_id: 0,
    }

    let repVerifierHelper
    let chainId

    before(async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        repVerifierHelper = await deployVerifierHelper(
            accounts[0],
            Circuit.reputation
        )
        const network = await attester.provider.getNetwork()
        chainId = network.chainId

        // sign up a user
        const leaf = genStateTreeLeaf(
            id.secret,
            attester.address,
            epoch,
            data,
            chainId
        )
        const index = 0
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(leaf)

        const merkleProof = stateTree.createProof(index)
        circuitInputs = {
            ...circuitInputs,
            state_tree_elements: merkleProof.siblings,
            state_tree_indexes: merkleProof.pathIndices,
            attester_id: attester.address,
            chain_id: chainId,
        }
    })

    {
        let snapshot
        beforeEach(async () => {
            snapshot = await ethers.provider.send('evm_snapshot', [])
        })

        afterEach(() => ethers.provider.send('evm_revert', [snapshot]))
    }

    it('should verify a reputation proof', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.reputation,
                stringifyBigInts({
                    ...circuitInputs,
                    nonce,
                })
            )
            const v = await defaultProver.verifyProof(
                Circuit.reputation,
                r.publicSignals,
                r.proof
            )
            expect(v).to.be.true
            const { publicSignals, proof, ...proofFields } =
                new ReputationProof(r.publicSignals, r.proof)
            const signals = await repVerifierHelper.verifyAndCheck(
                publicSignals,
                proof
            )
            expect(signals.epochKey.toString()).to.equal(
                proofFields.epochKey.toString()
            )
            expect(signals.stateTreeRoot.toString()).to.equal(
                proofFields.stateTreeRoot.toString()
            )
            expect(signals.nonce.toString()).to.equal(
                proofFields.nonce.toString()
            )
            expect(signals.epoch.toString()).to.equal(
                proofFields.epoch.toString()
            )
            expect(signals.attesterId.toString()).to.equal(
                proofFields.attesterId.toString()
            )
            expect(signals.revealNonce).to.equal(
                Boolean(proofFields.revealNonce)
            )
            expect(signals.chainId.toString()).to.equal(
                proofFields.chainId.toString()
            )
            expect(signals.minRep.toString()).to.equal(
                proofFields.minRep.toString()
            )
            expect(signals.maxRep.toString()).to.equal(
                proofFields.maxRep.toString()
            )
            expect(signals.proveMinRep).to.equal(
                Boolean(proofFields.proveMinRep)
            )
            expect(signals.proveMaxRep).to.equal(
                Boolean(proofFields.proveMaxRep)
            )
            expect(signals.proveZeroRep).to.equal(
                Boolean(proofFields.proveZeroRep)
            )
            expect(signals.proveGraffiti).to.equal(
                Boolean(proofFields.proveGraffiti)
            )
            expect(signals.graffiti.toString()).to.equal(
                proofFields.graffiti.toString()
            )
            expect(signals.data.toString()).to.equal(
                proofFields.data.toString()
            )
        }
    })

    it('should decode public signals', async () => {
        const epoch = randomBits(64)
        const nonce = randomBits(8)
        const attesterId = randomBits(160)
        const revealNonce = false

        for (let proveMinRep = 0; proveMinRep < 2; proveMinRep++) {
            for (let proveMaxRep = 0; proveMaxRep < 2; proveMaxRep++) {
                for (let proveZeroRep = 0; proveZeroRep < 2; proveZeroRep++) {
                    for (
                        let proveGraffiti = 0;
                        proveGraffiti < 2;
                        proveGraffiti++
                    ) {
                        const maxRep = randomBits(64)
                        const minRep = randomBits(64)
                        const control = ReputationProof.buildControl({
                            attesterId,
                            epoch,
                            nonce,
                            revealNonce,
                            proveGraffiti,
                            minRep,
                            maxRep,
                            proveMinRep,
                            proveMaxRep,
                            proveZeroRep,
                            chainId,
                        })
                        const decodedControl =
                            await repVerifierHelper.decodeReputationControl(
                                control[1]
                            )
                        expect(decodedControl.minRep.toString()).to.equal(
                            minRep.toString()
                        )
                        expect(decodedControl.maxRep.toString()).to.equal(
                            maxRep.toString()
                        )
                        expect(decodedControl.proveMinRep).to.equal(
                            Boolean(proveMinRep)
                        )
                        expect(decodedControl.proveMaxRep).to.equal(
                            Boolean(proveMaxRep)
                        )
                        expect(decodedControl.proveZeroRep).to.equal(
                            Boolean(proveZeroRep)
                        )
                        expect(decodedControl.proveGraffiti).to.equal(
                            Boolean(proveGraffiti)
                        )
                    }
                }
            }
        }
    })

    it('should fail to verify a reputation proof with invalid epoch key', async () => {
        const invalidEpoch = 3333
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.reputation,
            stringifyBigInts({
                ...circuitInputs,
                epoch: invalidEpoch,
            })
        )

        const v = await defaultProver.verifyProof(
            Circuit.reputation,
            r.publicSignals,
            r.proof
        )
        expect(v).to.be.true
        const { publicSignals, proof, idx } = new ReputationProof(
            r.publicSignals,
            r.proof
        )

        {
            const _publicSignals = [...publicSignals]
            _publicSignals[idx.epochKey] = F.toString()
            await expect(
                repVerifierHelper.verifyAndCheck(_publicSignals, proof)
            ).to.be.revertedWithCustomError(
                repVerifierHelper,
                'InvalidEpochKey'
            )
        }
    })

    it('should fail to verify a reputation proof with invalid chain id', async () => {
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.reputation,
            stringifyBigInts({
                ...circuitInputs,
                chain_id: 123,
            })
        )

        const v = await defaultProver.verifyProof(
            Circuit.reputation,
            r.publicSignals,
            r.proof
        )
        expect(v).to.be.true
        const { publicSignals, proof } = new ReputationProof(
            r.publicSignals,
            r.proof
        )

        await expect(
            repVerifierHelper.verifyAndCheck(publicSignals, proof)
        ).to.be.revertedWithCustomError(repVerifierHelper, 'ChainIdNotMatch')
    })

    it('should fail to verify a reputation proof with invalid proof', async () => {
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.reputation,
            stringifyBigInts(circuitInputs)
        )

        const { publicSignals, proof } = new ReputationProof(
            r.publicSignals,
            r.proof
        )
        {
            const _proof = [...proof]
            _proof[0] = (BigInt(proof[0]) + BigInt(1)).toString()
            await expect(
                repVerifierHelper.verifyAndCheck(publicSignals, _proof)
            ).to.be.reverted
        }

        {
            const _publicSignals = [...publicSignals]
            _publicSignals[0] = (
                BigInt(publicSignals[0]) + BigInt(1)
            ).toString()
            await expect(
                repVerifierHelper.verifyAndCheck(_publicSignals, proof)
            ).to.be.revertedWithCustomError(repVerifierHelper, 'InvalidProof')
        }
    })

    it('verify that caller is the same as attesterId', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[0]

        {
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.reputation,
                stringifyBigInts({
                    ...circuitInputs,
                    attester_id: attester.address,
                })
            )
            const { publicSignals, proof } = new ReputationProof(
                r.publicSignals,
                r.proof
            )
            await expect(
                repVerifierHelper
                    .connect(attester)
                    .verifyAndCheckCaller(publicSignals, proof)
            ).to.not.be.reverted
        }
        {
            const randomAddress = randomBits(160)
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.reputation,
                stringifyBigInts({
                    ...circuitInputs,
                    attester_id: randomAddress,
                })
            )
            const { publicSignals, proof } = new ReputationProof(
                r.publicSignals,
                r.proof
            )
            await expect(
                repVerifierHelper
                    .connect(attester)
                    .verifyAndCheckCaller(publicSignals, proof)
            ).to.be.revertedWithCustomError(repVerifierHelper, 'CallerInvalid')
        }
    })
})
