// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
    hash4,
    IncrementalMerkleTree,
    SparseMerkleTree,
    ZkIdentity,
    stringifyBigInts,
    genEpochKey,
    genRandomSalt,
} from '@unirep/utils'
import {
    EPOCH_TREE_DEPTH,
    EPOCH_TREE_ARITY,
    STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    Circuit,
    defaultEpochTreeLeaf,
    UserStateTransitionProof,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { signupUser } from '@unirep/test'

import { EPOCH_LENGTH } from '../src'
import { deployUnirep } from '../deploy'

describe('User State Transition', function () {
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

    it('should fail to transition with invalid proof', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        const { leaf, index } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester
        )
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(leaf)
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.identityNullifier,
                    BigInt(attester.address),
                    0, // from epoch
                    i,
                    EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH
                )
            )
        const epochTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf,
            EPOCH_TREE_ARITY
        )
        const stateTreeProof = stateTree.createProof(index)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: 0,
                to_epoch: 1,
                identity_nullifier: id.identityNullifier,
                state_tree_indexes: stateTreeProof.pathIndices,
                state_tree_elements: stateTreeProof.siblings,
                attester_id: attester.address,
                pos_rep: 0,
                neg_rep: 0,
                graffiti: 0,
                timestamp: 0,
                new_pos_rep: epochKeys.map(() => 0),
                new_neg_rep: epochKeys.map(() => 0),
                new_graffiti: epochKeys.map(() => 0),
                new_timestamp: epochKeys.map(() => 0),
                epoch_tree_elements: epochKeys.map((key) =>
                    epochTree.createProof(key)
                ),
                epoch_tree_root: epochTree.root,
            })
        )
        const { publicSignals, proof } = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        const _proof = [...proof]
        _proof[0] = BigInt(proof[0].toString()) + BigInt(1)
        await expect(
            unirepContract
                .connect(attester)
                .userStateTransition(publicSignals, _proof)
        ).to.be.reverted
        const _publicSignals = [...publicSignals]
        _publicSignals[0] = BigInt(publicSignals[0].toString()) + BigInt(1)
        await expect(
            unirepContract
                .connect(attester)
                .userStateTransition(_publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidProof')
    })

    it('should fail to transition with invalid attester', async () => {
        const address = BigInt(12345) // not signed up attester
        const id = new ZkIdentity()
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.identityNullifier,
                    address,
                    0, // from epoch
                    i,
                    EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH
                )
            )
        const epochTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf,
            EPOCH_TREE_ARITY
        )
        const index = 0
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(genRandomSalt())
        const stateTreeProof = stateTree.createProof(index)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: 0,
                to_epoch: 1,
                identity_nullifier: id.identityNullifier,
                state_tree_indexes: stateTreeProof.pathIndices,
                state_tree_elements: stateTreeProof.siblings,
                attester_id: address,
                pos_rep: 0,
                neg_rep: 0,
                graffiti: 0,
                timestamp: 0,
                new_pos_rep: epochKeys.map(() => 0),
                new_neg_rep: epochKeys.map(() => 0),
                new_graffiti: epochKeys.map(() => 0),
                new_timestamp: epochKeys.map(() => 0),
                epoch_tree_elements: epochKeys.map((key) =>
                    epochTree.createProof(key)
                ),
                epoch_tree_root: epochTree.root,
            })
        )
        const { publicSignals, proof } = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await expect(
            unirepContract.userStateTransition(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'AttesterNotSignUp')
    })

    it('should fail to transition from wrong epoch', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        const { leaf, index } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester
        )
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(leaf)
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.identityNullifier,
                    BigInt(attester.address),
                    1, // from epoch
                    i,
                    EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH
                )
            )
        const epochTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf,
            EPOCH_TREE_ARITY
        )
        const stateTreeProof = stateTree.createProof(index)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: 1,
                to_epoch: 2,
                identity_nullifier: id.identityNullifier,
                state_tree_indexes: stateTreeProof.pathIndices,
                state_tree_elements: stateTreeProof.siblings,
                attester_id: attester.address,
                pos_rep: 0,
                neg_rep: 0,
                graffiti: 0,
                timestamp: 0,
                new_pos_rep: epochKeys.map(() => 0),
                new_neg_rep: epochKeys.map(() => 0),
                new_graffiti: epochKeys.map(() => 0),
                new_timestamp: epochKeys.map(() => 0),
                epoch_tree_elements: epochKeys.map((key) =>
                    epochTree.createProof(key)
                ),
                epoch_tree_root: epochTree.root,
            })
        )
        const { publicSignals, proof } = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await expect(
            unirepContract
                .connect(attester)
                .userStateTransition(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'EpochNotMatch')
    })

    it('should fail to transition from non processed hash chain', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        const { leaf, index } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester
        )

        // submit attestations
        {
            const epoch = await unirepContract.attesterCurrentEpoch(
                attester.address
            )
            const epochKey = BigInt(24391)
            const posRep = 1
            const negRep = 5
            const graffiti = 0

            await unirepContract
                .connect(attester)
                .submitAttestation(epoch, epochKey, posRep, negRep, graffiti)
                .then((t) => t.wait())
        }
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(leaf)
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.identityNullifier,
                    BigInt(attester.address),
                    0, // from epoch
                    i,
                    EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH
                )
            )
        const epochTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf,
            EPOCH_TREE_ARITY
        )
        const stateTreeProof = stateTree.createProof(index)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: 0,
                to_epoch: 1,
                identity_nullifier: id.identityNullifier,
                state_tree_indexes: stateTreeProof.pathIndices,
                state_tree_elements: stateTreeProof.siblings,
                attester_id: attester.address,
                pos_rep: 0,
                neg_rep: 0,
                graffiti: 0,
                timestamp: 0,
                new_pos_rep: epochKeys.map(() => 0),
                new_neg_rep: epochKeys.map(() => 0),
                new_graffiti: epochKeys.map(() => 0),
                new_timestamp: epochKeys.map(() => 0),
                epoch_tree_elements: epochKeys.map((key) =>
                    epochTree.createProof(key)
                ),
                epoch_tree_root: epochTree.root,
            })
        )
        const { publicSignals, proof } = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await expect(
            unirepContract
                .connect(attester)
                .userStateTransition(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'HashchainNotProcessed')
    })

    it('should fail to transition from wrong epoch tree', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        const { leaf, index } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester
        )
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(leaf)
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.identityNullifier,
                    BigInt(attester.address),
                    0, // from epoch
                    i,
                    EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH
                )
            )
        const epochTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf,
            EPOCH_TREE_ARITY
        )
        epochTree.update(BigInt(1), hash4([2, 2, 0, 0]))
        const stateTreeProof = stateTree.createProof(index)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: 0,
                to_epoch: 1,
                identity_nullifier: id.identityNullifier,
                state_tree_indexes: stateTreeProof.pathIndices,
                state_tree_elements: stateTreeProof.siblings,
                attester_id: attester.address,
                pos_rep: 0,
                neg_rep: 0,
                graffiti: 0,
                timestamp: 0,
                new_pos_rep: epochKeys.map(() => 0),
                new_neg_rep: epochKeys.map(() => 0),
                new_graffiti: epochKeys.map(() => 0),
                new_timestamp: epochKeys.map(() => 0),
                epoch_tree_elements: epochKeys.map((key) =>
                    epochTree.createProof(key)
                ),
                epoch_tree_root: epochTree.root,
            })
        )
        const { publicSignals, proof } = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await expect(
            unirepContract
                .connect(attester)
                .userStateTransition(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidEpochTreeRoot')
    })

    it('should fail to transition from wrong state tree', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const { leaf, index } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester
        )
        stateTree.insert(0) // wrong leaf
        stateTree.insert(leaf)
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.identityNullifier,
                    BigInt(attester.address),
                    0, // from epoch
                    i,
                    EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH
                )
            )
        const epochTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf,
            EPOCH_TREE_ARITY
        )
        const stateTreeProof = stateTree.createProof(1)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: 0,
                to_epoch: 1,
                identity_nullifier: id.identityNullifier,
                state_tree_indexes: stateTreeProof.pathIndices,
                state_tree_elements: stateTreeProof.siblings,
                attester_id: attester.address,
                pos_rep: 0,
                neg_rep: 0,
                graffiti: 0,
                timestamp: 0,
                new_pos_rep: epochKeys.map(() => 0),
                new_neg_rep: epochKeys.map(() => 0),
                new_graffiti: epochKeys.map(() => 0),
                new_timestamp: epochKeys.map(() => 0),
                epoch_tree_elements: epochKeys.map((key) =>
                    epochTree.createProof(key)
                ),
                epoch_tree_root: epochTree.root,
            })
        )
        const { publicSignals, proof } = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await expect(
            unirepContract
                .connect(attester)
                .userStateTransition(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidStateTreeRoot')
    })

    it('should fail to double user state transition', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        const { leaf, index } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester
        )
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(leaf)
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.identityNullifier,
                    BigInt(attester.address),
                    0, // from epoch
                    i,
                    EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH
                )
            )
        const epochTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf,
            EPOCH_TREE_ARITY
        )
        const stateTreeProof = stateTree.createProof(index)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: 0,
                to_epoch: 1,
                identity_nullifier: id.identityNullifier,
                state_tree_indexes: stateTreeProof.pathIndices,
                state_tree_elements: stateTreeProof.siblings,
                attester_id: attester.address,
                pos_rep: 0,
                neg_rep: 0,
                graffiti: 0,
                timestamp: 0,
                new_pos_rep: epochKeys.map(() => 0),
                new_neg_rep: epochKeys.map(() => 0),
                new_graffiti: epochKeys.map(() => 0),
                new_timestamp: epochKeys.map(() => 0),
                epoch_tree_elements: epochKeys.map((key) =>
                    epochTree.createProof(key)
                ),
                epoch_tree_root: epochTree.root,
            })
        )
        const { publicSignals, proof } = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await unirepContract
            .connect(attester)
            .userStateTransition(publicSignals, proof)
            .then((t) => t.wait())
        await expect(
            unirepContract
                .connect(attester)
                .userStateTransition(publicSignals, proof)
        ).to.be.revertedWithCustomError(unirepContract, 'NullifierAlreadyUsed')
    })

    it('should do user state transition', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]
        const id = new ZkIdentity()
        const { leaf, index } = await signupUser(
            id,
            unirepContract,
            attester.address,
            attester
        )
        const fromEpoch = 0
        const toEpoch = fromEpoch + 1
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        stateTree.insert(leaf)
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(
                    id.identityNullifier,
                    BigInt(attester.address),
                    fromEpoch, // from epoch
                    i,
                    EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH
                )
            )
        const epochTree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf,
            EPOCH_TREE_ARITY
        )
        const stateTreeProof = stateTree.createProof(index)
        const r = await defaultProver.genProofAndPublicSignals(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: fromEpoch,
                to_epoch: toEpoch,
                identity_nullifier: id.identityNullifier,
                state_tree_indexes: stateTreeProof.pathIndices,
                state_tree_elements: stateTreeProof.siblings,
                attester_id: attester.address,
                pos_rep: 0,
                neg_rep: 0,
                graffiti: 0,
                timestamp: 0,
                new_pos_rep: epochKeys.map(() => 0),
                new_neg_rep: epochKeys.map(() => 0),
                new_graffiti: epochKeys.map(() => 0),
                new_timestamp: epochKeys.map(() => 0),
                epoch_tree_elements: epochKeys.map((key) =>
                    epochTree.createProof(key)
                ),
                epoch_tree_root: epochTree.root,
            })
        )
        const { publicSignals, proof } = new UserStateTransitionProof(
            r.publicSignals,
            r.proof,
            defaultProver
        )
        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        const tx = await unirepContract
            .connect(attester)
            .userStateTransition(publicSignals, proof)
        await tx.wait()
        const leafIndex = 0

        await expect(tx)
            .to.emit(unirepContract, 'StateTreeLeaf')
            .withArgs(toEpoch, attester.address, leafIndex, publicSignals[1])
        await expect(tx)
            .to.emit(unirepContract, 'UserStateTransitioned')
            .withArgs(
                toEpoch,
                attester.address,
                leafIndex,
                publicSignals[1],
                publicSignals[2]
            )
    })

    it('should do multiple user state transitions', async () => {
        const accounts = await ethers.getSigners()
        const attester = accounts[1]

        const users = 3
        const epochs = 3
        let fromEpoch = (
            await unirepContract.attesterCurrentEpoch(attester.address)
        ).toNumber()
        let fromEpochStateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const userState = Array(users)
            .fill(null)
            .map(() => {
                return {
                    id: new ZkIdentity(),
                    index: 0,
                }
            })
        for (let i = 0; i < users; i++) {
            const { leaf, index } = await signupUser(
                userState[i].id,
                unirepContract,
                attester.address,
                attester
            )
            fromEpochStateTree.insert(leaf)
            userState[i].index = index
        }

        await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
        await ethers.provider.send('evm_mine', [])
        const startEpoch = (
            await unirepContract.attesterCurrentEpoch(attester.address)
        ).toNumber()
        for (let epoch = startEpoch; epoch < startEpoch + epochs; epoch++) {
            const toEpochStateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
            for (let i = 0; i < users; i++) {
                const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
                    .fill(null)
                    .map((_, n) =>
                        genEpochKey(
                            userState[i].id.identityNullifier,
                            BigInt(attester.address),
                            fromEpoch, // from epoch
                            n,
                            EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH
                        )
                    )
                const epochTree = new SparseMerkleTree(
                    EPOCH_TREE_DEPTH,
                    defaultEpochTreeLeaf,
                    EPOCH_TREE_ARITY
                )
                const stateTreeProof = fromEpochStateTree.createProof(
                    userState[i].index
                )
                const r = await defaultProver.genProofAndPublicSignals(
                    Circuit.userStateTransition,
                    stringifyBigInts({
                        from_epoch: fromEpoch,
                        to_epoch: epoch,
                        identity_nullifier: userState[i].id.identityNullifier,
                        state_tree_indexes: stateTreeProof.pathIndices,
                        state_tree_elements: stateTreeProof.siblings,
                        attester_id: attester.address,
                        pos_rep: 0,
                        neg_rep: 0,
                        graffiti: 0,
                        timestamp: 0,
                        new_pos_rep: epochKeys.map(() => 0),
                        new_neg_rep: epochKeys.map(() => 0),
                        new_graffiti: epochKeys.map(() => 0),
                        new_timestamp: epochKeys.map(() => 0),
                        epoch_tree_elements: epochKeys.map((key) =>
                            epochTree.createProof(key)
                        ),
                        epoch_tree_root: epochTree.root,
                    })
                )
                const { publicSignals, proof, stateTreeLeaf } =
                    new UserStateTransitionProof(
                        r.publicSignals,
                        r.proof,
                        defaultProver
                    )
                await unirepContract
                    .connect(attester)
                    .userStateTransition(publicSignals, proof)
                    .then((t) => t.wait())
                userState[i].index = i
                toEpochStateTree.insert(stateTreeLeaf)

                const exist = await unirepContract.attesterStateTreeRootExists(
                    attester.address,
                    epoch,
                    toEpochStateTree.root
                )
                expect(exist).to.be.true
            }
            await ethers.provider.send('evm_increaseTime', [EPOCH_LENGTH])
            fromEpochStateTree = toEpochStateTree
            fromEpoch = epoch
        }
    })
})
