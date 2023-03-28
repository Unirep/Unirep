// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
    genRandomSalt,
    IncrementalMerkleTree,
    stringifyBigInts,
    ZkIdentity,
} from '@unirep/utils'
import {
    Circuit,
    EpochKeyProof,
    EpochKeyLiteProof,
    ReputationProof,
    SignupProof,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import { EPOCH_LENGTH } from '../src'
import { deployUnirep } from '../deploy'
import defaultConfig from '@unirep/circuits/config'
const { STATE_TREE_DEPTH, NUM_EPOCH_KEY_NONCE_PER_EPOCH, FIELD_COUNT } =
    defaultConfig

const signupUser = async (id, unirepContract, attesterId, account) => {
    const epoch = await unirepContract.attesterCurrentEpoch(attesterId)
    const r = await defaultProver.genProofAndPublicSignals(
        Circuit.signup,
        stringifyBigInts({
            epoch: epoch.toString(),
            identity_nullifier: id.identityNullifier,
            identity_trapdoor: id.trapdoor,
            attester_id: attesterId,
        })
    )
    const { publicSignals, proof } = new SignupProof(
        r.publicSignals,
        r.proof,
        defaultProver
    )
    const leafIndex = await unirepContract.attesterStateTreeLeafCount(
        attesterId,
        epoch
    )
    await unirepContract
        .connect(account)
        .userSignUp(publicSignals, proof)
        .then((t) => t.wait())
    return { leaf: publicSignals[1], index: leafIndex.toNumber(), epoch }
}

function randomBits(bit: number) {
    return genRandomSalt() % (BigInt(2) ** BigInt(bit) - BigInt(1))
}

describe('Epoch key lite proof verifier', function () {
    this.timeout(300000)
    let unirepContract

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])

        const attester = accounts[1]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
    })

    it('should verify an epoch key lite proof', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        const attesterId = attester.address
        const epoch = await unirepContract.attesterCurrentEpoch(attesterId)

        const sig_data = 0
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.epochKeyLite,
                stringifyBigInts({
                    identity_secret: id.secretHash,
                    sig_data,
                    epoch,
                    nonce,
                    attester_id: attester.address,
                    reveal_nonce: 0,
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
            await unirepContract
                .verifyEpochKeyLiteProof(publicSignals, proof)
                .then((t) => t.wait())
        }
    })

    it('should decode public signals', async () => {
        // should reveal nonce
        {
            const epoch = randomBits(64)
            const nonce = randomBits(8)
            const attesterId = randomBits(160)
            const revealNonce = 1

            const control = EpochKeyLiteProof.buildControl({
                attesterId,
                epoch,
                nonce,
                revealNonce,
            })

            const decodedControl = await unirepContract.decodeEpochKeyControl(
                control
            )
            expect(decodedControl.epoch.toString()).to.equal(epoch.toString())
            expect(decodedControl.nonce.toString()).to.equal(nonce.toString())
            expect(decodedControl.attesterId.toString()).to.equal(
                attesterId.toString()
            )
            expect(decodedControl.revealNonce.toString()).to.equal(
                revealNonce.toString()
            )
        }

        // should not reveal nonce
        {
            const epoch = randomBits(64)
            const nonce = randomBits(8)
            const attesterId = randomBits(160)
            const revealNonce = 0

            const control = EpochKeyLiteProof.buildControl({
                attesterId,
                epoch,
                nonce,
                revealNonce,
            })

            const decodedControl = await unirepContract.decodeEpochKeyControl(
                control
            )
            expect(decodedControl.epoch.toString()).to.equal(epoch.toString())
            expect(decodedControl.nonce.toString()).to.equal('0')
            expect(decodedControl.attesterId.toString()).to.equal(
                attesterId.toString()
            )
            expect(decodedControl.revealNonce.toString()).to.equal('0')
        }
    })

    it('should fail to verify an epoch key lite proof with invalid epoch', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        const attesterId = attester.address

        const data = 0
        const invalidEpoch = 3333
        const nonce = 0
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.epochKeyLite,
            stringifyBigInts({
                identity_secret: id.secretHash,
                sig_data: data,
                epoch: invalidEpoch,
                nonce,
                attester_id: attester.address,
                reveal_nonce: 0,
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
            unirepContract.verifyEpochKeyLiteProof(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidEpoch')
    })

    it('should fail to verify an epoch key lite proof with invalid proof', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        const attesterId = attester.address
        const epoch = await unirepContract.attesterCurrentEpoch(attesterId)
        const data = 0
        const nonce = 0
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.epochKeyLite,
            stringifyBigInts({
                identity_secret: id.secretHash,
                sig_data: data,
                epoch,
                nonce,
                attester_id: attester.address,
                reveal_nonce: 0,
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
        {
            const _proof = [...proof]
            _proof[0] = BigInt(proof[0].toString()) + BigInt(1)
            await expect(
                unirepContract.verifyEpochKeyLiteProof(publicSignals, _proof)
            ).to.be.reverted
        }

        {
            const _publicSignals = [...publicSignals]
            _publicSignals[0] = BigInt(publicSignals[0].toString()) + BigInt(1)
            await expect(
                unirepContract.verifyEpochKeyLiteProof(_publicSignals, proof)
            ).to.be.revertedWithCustomError(unirepContract, 'InvalidProof')
        }
    })
})

describe('Epoch key proof verifier', function () {
    this.timeout(500000)
    let unirepContract
    let snapshot

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])

        const attester = accounts[1]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
    })

    beforeEach(async () => {
        snapshot = await ethers.provider.send('evm_snapshot', [])
    })

    afterEach(async () => {
        await ethers.provider.send('evm_revert', [snapshot])
    })

    it('should verify an epoch key proof', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        // sign up a user
        const { leaf, index, epoch } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester
        )
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(leaf)

        const merkleProof = stateTree.createProof(index)
        const data = 0
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.epochKey,
                stringifyBigInts({
                    state_tree_elements: merkleProof.siblings,
                    state_tree_indexes: merkleProof.pathIndices,
                    identity_secret: id.secretHash,
                    data: Array(FIELD_COUNT).fill(0),
                    sig_data: data,
                    epoch,
                    nonce,
                    attester_id: attester.address,
                    reveal_nonce: 0,
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
            await unirepContract
                .verifyEpochKeyProof(publicSignals, proof)
                .then((t) => t.wait())
        }
    })

    it('should decode public signals', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        // sign up a user
        const { leaf, index, epoch } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester
        )
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(leaf)

        const merkleProof = stateTree.createProof(index)
        const data = 0
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.epochKey,
                stringifyBigInts({
                    state_tree_elements: merkleProof.siblings,
                    state_tree_indexes: merkleProof.pathIndices,
                    identity_secret: id.secretHash,
                    data: Array(FIELD_COUNT).fill(0),
                    sig_data: data,
                    epoch,
                    nonce,
                    attester_id: attester.address,
                    reveal_nonce: 0,
                })
            )

            const v = await defaultProver.verifyProof(
                Circuit.epochKey,
                r.publicSignals,
                r.proof
            )
            expect(v).to.be.true
            const proof = new EpochKeyProof(r.publicSignals, r.proof)
            const signals = await unirepContract.decodeEpochKeySignals(
                proof.publicSignals
            )
            expect(signals.epochKey.toString()).to.equal(
                proof.epochKey.toString()
            )
            expect(signals.stateTreeRoot.toString()).to.equal(
                proof.stateTreeRoot.toString()
            )
            expect(signals.data.toString()).to.equal(proof.data.toString())
            expect(signals.attesterId.toString()).to.equal(
                proof.attesterId.toString()
            )
            expect(signals.epoch.toString()).to.equal(proof.epoch.toString())
            expect(signals.nonce.toString()).to.equal(proof.nonce.toString())
            await unirepContract
                .verifyEpochKeyProof(proof.publicSignals, proof.proof)
                .then((t) => t.wait())
        }
    })

    it('should fail to verify an epoch key proof with invalid epoch', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        // sign up a user
        const { leaf, index } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester
        )
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(leaf)

        const merkleProof = stateTree.createProof(index)
        const data = 0
        const invalidEpoch = 3333
        const nonce = 0
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.epochKey,
            stringifyBigInts({
                state_tree_elements: merkleProof.siblings,
                state_tree_indexes: merkleProof.pathIndices,
                identity_secret: id.secretHash,
                data: Array(FIELD_COUNT).fill(0),
                sig_data: data,
                epoch: invalidEpoch,
                nonce,
                attester_id: attester.address,
                reveal_nonce: 0,
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
            unirepContract.verifyEpochKeyProof(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidEpoch')
    })

    it('should fail to verify an epoch key proof with invalid proof', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        // sign up a user
        const { leaf, index, epoch } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester
        )
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(leaf)

        const merkleProof = stateTree.createProof(index)
        const data = 0
        const nonce = 0
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.epochKey,
            stringifyBigInts({
                state_tree_elements: merkleProof.siblings,
                state_tree_indexes: merkleProof.pathIndices,
                identity_secret: id.secretHash,
                data: Array(FIELD_COUNT).fill(0),
                sig_data: data,
                epoch,
                nonce,
                attester_id: attester.address,
                reveal_nonce: 0,
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
        {
            const _proof = [...proof]
            _proof[0] = BigInt(proof[0].toString()) + BigInt(1)
            await expect(
                unirepContract.verifyEpochKeyProof(publicSignals, _proof)
            ).to.be.reverted
        }

        {
            const _publicSignals = [...publicSignals]
            _publicSignals[0] = BigInt(publicSignals[0].toString()) + BigInt(1)
            await expect(
                unirepContract.verifyEpochKeyProof(_publicSignals, proof)
            ).to.be.revertedWithCustomError(unirepContract, 'InvalidProof')
        }
    })

    it('should fail to verify an epoch key proof with bad state tree root', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        // sign up a user
        const { epoch } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester
        )

        const data = 0
        const nonce = 0
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.epochKey,
            stringifyBigInts({
                state_tree_elements: new Array(STATE_TREE_DEPTH).fill(0),
                state_tree_indexes: new Array(STATE_TREE_DEPTH).fill(0),
                identity_secret: id.secretHash,
                data: Array(FIELD_COUNT).fill(0),
                sig_data: data,
                epoch,
                nonce,
                attester_id: attester.address,
                reveal_nonce: 0,
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
            unirepContract.verifyEpochKeyProof(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidStateTreeRoot')
    })
})

describe('Reputation proof verifier', function () {
    this.timeout(120000)
    let unirepContract
    let snapshot
    const zeroCircuitInputs = {
        identity_secret: 0,
        state_tree_indexes: 0,
        state_tree_elements: 0,
        data: Array(FIELD_COUNT).fill(0),
        prove_graffiti: 0,
        graffiti_pre_image: 0,
        reveal_nonce: 0,
        attester_id: 0,
        epoch: 0,
        nonce: 0,
        min_rep: 0,
        max_rep: 0,
        prove_min_rep: 0,
        prove_max_rep: 0,
        prove_zero_rep: 0,
        sig_data: 696969,
    }

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])

        const attester = accounts[1]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
    })

    beforeEach(async () => {
        snapshot = await ethers.provider.send('evm_snapshot', [])
    })

    afterEach(async () => {
        await ethers.provider.send('evm_revert', [snapshot])
    })

    it('should verify a reputation proof', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        // sign up a user
        const { leaf, index, epoch } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester
        )
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(leaf)

        const merkleProof = stateTree.createProof(index)
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.proveReputation,
                stringifyBigInts({
                    ...zeroCircuitInputs,
                    identity_secret: id.secretHash,
                    state_tree_indexes: merkleProof.pathIndices,
                    state_tree_elements: merkleProof.siblings,
                    attester_id: attester.address,
                    epoch,
                    nonce,
                })
            )
            const v = await defaultProver.verifyProof(
                Circuit.proveReputation,
                r.publicSignals,
                r.proof
            )
            expect(v).to.be.true
            const { publicSignals, proof } = new ReputationProof(
                r.publicSignals,
                r.proof
            )
            await unirepContract
                .verifyReputationProof(publicSignals, proof)
                .then((t) => t.wait())
        }
    })

    it('should decode public signals', async () => {
        const epoch = randomBits(64)
        const nonce = randomBits(8)
        const attesterId = randomBits(160)
        const revealNonce = 0

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
                        })
                        const decodedControl =
                            await unirepContract.decodeReputationControl(
                                control[1]
                            )
                        expect(decodedControl.minRep.toString()).to.equal(
                            minRep.toString()
                        )
                        expect(decodedControl.maxRep.toString()).to.equal(
                            maxRep.toString()
                        )
                        expect(decodedControl.proveMinRep.toString()).to.equal(
                            proveMinRep.toString()
                        )
                        expect(decodedControl.proveMaxRep.toString()).to.equal(
                            proveMaxRep.toString()
                        )
                        expect(decodedControl.proveZeroRep.toString()).to.equal(
                            proveZeroRep.toString()
                        )
                        expect(
                            decodedControl.proveGraffiti.toString()
                        ).to.equal(proveGraffiti.toString())
                    }
                }
            }
        }
    })

    it('should fail to verify a reputation proof with invalid epoch', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        // sign up a user
        const { leaf, index } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester
        )
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(leaf)

        const invalidEpoch = 3333
        const merkleProof = stateTree.createProof(index)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.proveReputation,
            stringifyBigInts({
                ...zeroCircuitInputs,
                identity_secret: id.secretHash,
                state_tree_indexes: merkleProof.pathIndices,
                state_tree_elements: merkleProof.siblings,
                attester_id: attester.address,
                epoch: invalidEpoch,
            })
        )

        const v = await defaultProver.verifyProof(
            Circuit.proveReputation,
            r.publicSignals,
            r.proof
        )
        expect(v).to.be.true
        const { publicSignals, proof } = new ReputationProof(
            r.publicSignals,
            r.proof
        )
        await expect(
            unirepContract.verifyReputationProof(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidEpoch')
    })

    it('should fail to verify a reputation proof with invalid proof', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        // sign up a user
        const { leaf, index, epoch } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester
        )
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(leaf)

        const merkleProof = stateTree.createProof(index)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.proveReputation,
            stringifyBigInts({
                ...zeroCircuitInputs,
                identity_secret: id.secretHash,
                state_tree_indexes: merkleProof.pathIndices,
                state_tree_elements: merkleProof.siblings,
                attester_id: attester.address,
                epoch,
            })
        )

        const { publicSignals, proof } = new EpochKeyProof(
            r.publicSignals,
            r.proof
        )
        {
            const _proof = [...proof]
            _proof[0] = BigInt(proof[0].toString()) + BigInt(1)
            await expect(
                unirepContract.verifyEpochKeyProof(publicSignals, _proof)
            ).to.be.reverted
        }

        {
            const _publicSignals = [...publicSignals]
            _publicSignals[0] = BigInt(publicSignals[0].toString()) + BigInt(1)
            await expect(
                unirepContract.verifyReputationProof(_publicSignals, proof)
            ).to.be.revertedWithCustomError(unirepContract, 'InvalidProof')
        }
    })

    it('should fail to verify a reputation proof with invalid state tree', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        // sign up a user
        const { epoch } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester
        )

        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.proveReputation,
            stringifyBigInts({
                ...zeroCircuitInputs,
                identity_secret: id.secretHash,
                state_tree_elements: new Array(STATE_TREE_DEPTH).fill(0),
                state_tree_indexes: new Array(STATE_TREE_DEPTH).fill(0),
                attester_id: attester.address,
                epoch,
            })
        )

        const v = await defaultProver.verifyProof(
            Circuit.proveReputation,
            r.publicSignals,
            r.proof
        )
        expect(v).to.be.true
        const { publicSignals, proof } = new ReputationProof(
            r.publicSignals,
            r.proof
        )
        await expect(
            unirepContract.verifyReputationProof(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidStateTreeRoot')
    })
})
