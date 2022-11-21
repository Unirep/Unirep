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
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    STATE_TREE_DEPTH,
    EpochKeyProof,
    ReputationProof,
    SignupProof,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import { EPOCH_LENGTH } from '../src'
import { deployUnirep } from '../deploy'

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

describe('Epoch key proof verifier', function () {
    this.timeout(500000)
    let unirepContract
    const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])

        const attester = accounts[1]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
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
        stateTree.insert(leaf)

        const merkleProof = stateTree.createProof(index)
        const posRep = 0
        const negRep = 0
        const graffiti = 0
        const timestamp = 0
        const data = 0
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.verifyEpochKey,
                stringifyBigInts({
                    state_tree_elements: merkleProof.siblings,
                    state_tree_indexes: merkleProof.pathIndices,
                    identity_nullifier: id.identityNullifier,
                    pos_rep: posRep,
                    neg_rep: negRep,
                    graffiti,
                    timestamp,
                    data,
                    control: EpochKeyProof.buildControlInput({
                        epoch: epoch.toNumber(),
                        nonce,
                        attesterId: attester.address,
                        revealNonce: 0,
                    }),
                })
            )

            const v = await defaultProver.verifyProof(
                Circuit.verifyEpochKey,
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
        stateTree.insert(leaf)

        const merkleProof = stateTree.createProof(index)
        const posRep = 0
        const negRep = 0
        const graffiti = 0
        const timestamp = 0
        const data = 0
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.verifyEpochKey,
                stringifyBigInts({
                    state_tree_elements: merkleProof.siblings,
                    state_tree_indexes: merkleProof.pathIndices,
                    identity_nullifier: id.identityNullifier,
                    pos_rep: posRep,
                    neg_rep: negRep,
                    graffiti,
                    timestamp,
                    data,
                    control: EpochKeyProof.buildControlInput({
                        epoch: epoch.toNumber(),
                        nonce,
                        attesterId: attester.address,
                        revealNonce: 0,
                    }),
                })
            )

            const v = await defaultProver.verifyProof(
                Circuit.verifyEpochKey,
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
        stateTree.insert(leaf)

        const merkleProof = stateTree.createProof(index)
        const posRep = 0
        const negRep = 0
        const graffiti = 0
        const timestamp = 0
        const data = 0
        const invalidEpoch = 3333
        const nonce = 0
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.verifyEpochKey,
            stringifyBigInts({
                state_tree_elements: merkleProof.siblings,
                state_tree_indexes: merkleProof.pathIndices,
                identity_nullifier: id.identityNullifier,
                pos_rep: posRep,
                neg_rep: negRep,
                graffiti,
                timestamp,
                data,
                control: EpochKeyProof.buildControlInput({
                    epoch: invalidEpoch,
                    nonce,
                    attesterId: attester.address,
                    revealNonce: 0,
                }),
            })
        )

        const v = await defaultProver.verifyProof(
            Circuit.verifyEpochKey,
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
        stateTree.insert(leaf)

        const merkleProof = stateTree.createProof(index)
        const posRep = 0
        const negRep = 0
        const graffiti = 0
        const timestamp = 0
        const data = 0
        const nonce = 0
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.verifyEpochKey,
            stringifyBigInts({
                state_tree_elements: merkleProof.siblings,
                state_tree_indexes: merkleProof.pathIndices,
                identity_nullifier: id.identityNullifier,
                pos_rep: posRep,
                neg_rep: negRep,
                graffiti,
                timestamp,
                data,
                control: EpochKeyProof.buildControlInput({
                    epoch: epoch.toNumber(),
                    nonce,
                    attesterId: attester.address,
                    revealNonce: 0,
                }),
            })
        )

        const v = await defaultProver.verifyProof(
            Circuit.verifyEpochKey,
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
        const _stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        _stateTree.insert(genRandomSalt())

        const index = 0
        const merkleProof = _stateTree.createProof(index)
        const posRep = 0
        const negRep = 0
        const graffiti = 0
        const timestamp = 0
        const data = 0
        const nonce = 0
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.verifyEpochKey,
            stringifyBigInts({
                state_tree_elements: merkleProof.siblings,
                state_tree_indexes: merkleProof.pathIndices,
                identity_nullifier: id.identityNullifier,
                pos_rep: posRep,
                neg_rep: negRep,
                graffiti,
                timestamp,
                data,
                control: EpochKeyProof.buildControlInput({
                    epoch: epoch.toNumber(),
                    nonce,
                    attesterId: attester.address,
                    revealNonce: 0,
                }),
            })
        )

        const v = await defaultProver.verifyProof(
            Circuit.verifyEpochKey,
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
    const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)

    before(async () => {
        const accounts = await ethers.getSigners()
        unirepContract = await deployUnirep(accounts[0])

        const attester = accounts[1]
        await unirepContract
            .connect(attester)
            .attesterSignUp(EPOCH_LENGTH)
            .then((t) => t.wait())
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
        stateTree.insert(leaf)

        const merkleProof = stateTree.createProof(index)
        const posRep = 0
        const negRep = 0
        const graffiti = 0
        const timestamp = 0
        const minRep = 0
        const proveGraffiti = 0
        const graffitiPreImage = 0
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const r = await defaultProver.genProofAndPublicSignals(
                Circuit.proveReputation,
                stringifyBigInts({
                    identity_nullifier: id.identityNullifier,
                    state_tree_indexes: merkleProof.pathIndices,
                    state_tree_elements: merkleProof.siblings,
                    pos_rep: posRep,
                    neg_rep: negRep,
                    graffiti: graffiti,
                    timestamp: timestamp,
                    graffiti_pre_image: graffitiPreImage,
                    control: ReputationProof.buildControlInput({
                        attesterId: attester.address,
                        epoch: epoch.toNumber(),
                        nonce,
                        minRep,
                        maxRep: 0,
                        proveGraffiti,
                        proveMinRep: !!minRep ? 1 : 0,
                    }),
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
        stateTree.insert(leaf)

        const invalidEpoch = 3333
        const nonce = 0
        const merkleProof = stateTree.createProof(index)
        const posRep = 0
        const negRep = 0
        const graffiti = 0
        const timestamp = 0
        const minRep = 0
        const proveGraffiti = 0
        const graffitiPreImage = 0
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.proveReputation,
            stringifyBigInts({
                identity_nullifier: id.identityNullifier,
                state_tree_indexes: merkleProof.pathIndices,
                state_tree_elements: merkleProof.siblings,
                pos_rep: posRep,
                neg_rep: negRep,
                graffiti: graffiti,
                timestamp: timestamp,
                graffiti_pre_image: graffitiPreImage,
                control: ReputationProof.buildControlInput({
                    attesterId: attester.address,
                    epoch: invalidEpoch,
                    nonce,
                    minRep,
                    maxRep: 0,
                    proveGraffiti,
                    proveMinRep: !!minRep ? 1 : 0,
                }),
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
        stateTree.insert(leaf)

        const nonce = 0
        const merkleProof = stateTree.createProof(index)
        const posRep = 0
        const negRep = 0
        const graffiti = 0
        const timestamp = 0
        const minRep = 0
        const proveGraffiti = 0
        const graffitiPreImage = 0
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.proveReputation,
            stringifyBigInts({
                identity_nullifier: id.identityNullifier,
                state_tree_indexes: merkleProof.pathIndices,
                state_tree_elements: merkleProof.siblings,
                pos_rep: posRep,
                neg_rep: negRep,
                graffiti: graffiti,
                timestamp: timestamp,
                graffiti_pre_image: graffitiPreImage,
                control: ReputationProof.buildControlInput({
                    attesterId: attester.address,
                    epoch: epoch.toNumber(),
                    nonce,
                    minRep,
                    maxRep: 0,
                    proveGraffiti,
                    proveMinRep: !!minRep ? 1 : 0,
                }),
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
        const _stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        _stateTree.insert(genRandomSalt())

        const nonce = 0
        const index = 0
        const merkleProof = _stateTree.createProof(index)
        const posRep = 0
        const negRep = 0
        const graffiti = 0
        const timestamp = 0
        const minRep = 0
        const proveGraffiti = 0
        const graffitiPreImage = 0
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.proveReputation,
            stringifyBigInts({
                identity_nullifier: id.identityNullifier,
                state_tree_indexes: merkleProof.pathIndices,
                state_tree_elements: merkleProof.siblings,
                pos_rep: posRep,
                neg_rep: negRep,
                graffiti: graffiti,
                timestamp: timestamp,
                graffiti_pre_image: graffitiPreImage,
                control: ReputationProof.buildControlInput({
                    attesterId: attester.address,
                    epoch: epoch.toNumber(),
                    nonce,
                    minRep,
                    maxRep: 0,
                    proveGraffiti,
                    proveMinRep: !!minRep ? 1 : 0,
                }),
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
