// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
    genRandomSalt,
    IncrementalMerkleTree,
    stringifyBigInts,
    ZkIdentity,
} from '@unirep/crypto'
import {
    Circuit,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    STATE_TREE_DEPTH,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import {
    EpochKeyProof,
    EPOCH_LENGTH,
    ReputationProof,
    SignupProof,
} from '../src'
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
                    nonce,
                    epoch: epoch.toNumber(),
                    pos_rep: posRep,
                    neg_rep: negRep,
                    graffiti,
                    timestamp,
                    attester_id: attester.address,
                    data,
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
            const isValid = await unirepContract.verifyEpochKeyProof(
                publicSignals,
                proof
            )
            expect(isValid).to.be.true
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
                nonce,
                epoch: invalidEpoch,
                pos_rep: posRep,
                neg_rep: negRep,
                graffiti,
                timestamp,
                attester_id: attester.address,
                data,
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
        const isValid = await unirepContract.verifyEpochKeyProof(
            publicSignals,
            proof
        )
        expect(isValid).to.be.false
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
                nonce,
                epoch: epoch.toNumber(),
                pos_rep: posRep,
                neg_rep: negRep,
                graffiti,
                timestamp,
                attester_id: attester.address,
                data,
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
            const isValid = await unirepContract.verifyEpochKeyProof(
                _publicSignals,
                proof
            )
            expect(isValid).to.be.false
        }
    })

    it('should fail to verify an epoch key proof with state tree root', async () => {
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
                nonce,
                epoch: epoch.toNumber(),
                pos_rep: posRep,
                neg_rep: negRep,
                graffiti,
                timestamp,
                attester_id: attester.address,
                data,
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
        const isValid = await unirepContract.verifyEpochKeyProof(
            publicSignals,
            proof
        )
        expect(isValid).to.be.false
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
                    epoch: epoch.toNumber(),
                    nonce,
                    identity_nullifier: id.identityNullifier,
                    state_tree_indexes: merkleProof.pathIndices,
                    state_tree_elements: merkleProof.siblings,
                    attester_id: attester.address,
                    pos_rep: posRep,
                    neg_rep: negRep,
                    graffiti: graffiti,
                    timestamp: timestamp,
                    min_rep: minRep,
                    prove_graffiti: proveGraffiti,
                    graffiti_pre_image: graffitiPreImage,
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
            const isValid = await unirepContract.verifyReputationProof(
                publicSignals,
                proof
            )
            expect(isValid).to.be.true
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
                epoch: invalidEpoch,
                nonce,
                identity_nullifier: id.identityNullifier,
                state_tree_indexes: merkleProof.pathIndices,
                state_tree_elements: merkleProof.siblings,
                attester_id: attester.address,
                pos_rep: posRep,
                neg_rep: negRep,
                graffiti: graffiti,
                timestamp: timestamp,
                min_rep: minRep,
                prove_graffiti: proveGraffiti,
                graffiti_pre_image: graffitiPreImage,
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
        const isValid = await unirepContract.verifyReputationProof(
            publicSignals,
            proof
        )
        expect(isValid).to.be.false
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
                epoch: epoch.toNumber(),
                nonce,
                identity_nullifier: id.identityNullifier,
                state_tree_indexes: merkleProof.pathIndices,
                state_tree_elements: merkleProof.siblings,
                attester_id: attester.address,
                pos_rep: posRep,
                neg_rep: negRep,
                graffiti: graffiti,
                timestamp: timestamp,
                min_rep: minRep,
                prove_graffiti: proveGraffiti,
                graffiti_pre_image: graffitiPreImage,
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
            const isValid = await unirepContract.verifyEpochKeyProof(
                _publicSignals,
                proof
            )
            expect(isValid).to.be.false
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
                epoch: epoch.toNumber(),
                nonce,
                identity_nullifier: id.identityNullifier,
                state_tree_indexes: merkleProof.pathIndices,
                state_tree_elements: merkleProof.siblings,
                attester_id: attester.address,
                pos_rep: posRep,
                neg_rep: negRep,
                graffiti: graffiti,
                timestamp: timestamp,
                min_rep: minRep,
                prove_graffiti: proveGraffiti,
                graffiti_pre_image: graffitiPreImage,
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
        const isValid = await unirepContract.verifyReputationProof(
            publicSignals,
            proof
        )
        expect(isValid).to.be.false
    })
})
