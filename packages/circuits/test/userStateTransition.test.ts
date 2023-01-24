import { expect } from 'chai'
import {
    ZkIdentity,
    IncrementalMerkleTree,
    hash7,
    genEpochKey,
    genUserStateTransitionNullifier,
    stringifyBigInts,
} from '@unirep/utils'
import { Circuit } from '../src'
import { genProofAndVerify, genUserStateTransitionCircuitInput } from './utils'
import {
    EPOCH_TREE_DEPTH,
    EPOCH_TREE_ARITY,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    STATE_TREE_DEPTH,
} from '../config'

describe('User state transition', function () {
    this.timeout(300000)

    it('should do a user state transition', async () => {
        const id = new ZkIdentity()
        const fromEpoch = 1
        const toEpoch = 5
        const attesterId = BigInt(1249021895182290)
        const posRep = 10
        const negRep = 108
        const graffiti = 190129
        const timestamp = 9241
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        tree.insert(
            hash7([
                id.identityNullifier,
                attesterId,
                fromEpoch,
                posRep,
                negRep,
                graffiti,
                timestamp,
            ])
        )
        const circuitInputs = genUserStateTransitionCircuitInput({
            id,
            fromEpoch,
            toEpoch,
            attesterId,
            startBalance: { posRep, negRep, graffiti, timestamp },
            tree,
            leafIndex: 0,
        })
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.userStateTransition,
            circuitInputs
        )
        expect(isValid, 'invalid proof').to.be.true
        expect(publicSignals[0]).to.equal(tree.root.toString())
        const newLeaf = hash7([
            id.identityNullifier,
            attesterId,
            toEpoch,
            posRep,
            negRep,
            graffiti,
            timestamp,
        ])
        expect(publicSignals[1]).to.equal(newLeaf.toString())
        const transitionNullifier = genUserStateTransitionNullifier(
            id.identityNullifier,
            attesterId,
            fromEpoch
        )
        expect(publicSignals[2]).to.equal(transitionNullifier.toString())
    })

    it('should do a user state transition with new rep', async () => {
        const id = new ZkIdentity()
        const fromEpoch = 1
        const toEpoch = 5
        const attesterId = BigInt(124185915945829581290)
        const posRep = 10
        const negRep = 108
        const graffiti = 1241
        const timestamp = 124
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        tree.insert(
            hash7([
                id.identityNullifier,
                attesterId,
                fromEpoch,
                posRep,
                negRep,
                graffiti,
                timestamp,
            ])
        )
        const epochKey = genEpochKey(
            id.identityNullifier,
            attesterId,
            fromEpoch,
            0
        )
        const circuitInputs = genUserStateTransitionCircuitInput({
            id,
            fromEpoch,
            toEpoch,
            attesterId,
            startBalance: { posRep, negRep, graffiti, timestamp },
            tree,
            leafIndex: 0,
            epochKeyBalances: {
                [epochKey.toString()]: {
                    posRep: 10,
                    negRep: 20,
                },
            },
        })
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.userStateTransition,
            circuitInputs
        )
        expect(isValid).to.be.true
        expect(publicSignals[0]).to.equal(tree.root.toString())
        const newLeaf = hash7([
            id.identityNullifier,
            attesterId,
            toEpoch,
            posRep + 10,
            negRep + 20,
            graffiti,
            timestamp,
        ])
        expect(publicSignals[1]).to.equal(newLeaf.toString())
        const transitionNullifier = genUserStateTransitionNullifier(
            id.identityNullifier,
            attesterId,
            fromEpoch
        )
        expect(publicSignals[2]).to.equal(transitionNullifier.toString())
    })

    it('should do a user state transition with many new rep', async () => {
        const id = new ZkIdentity()
        const fromEpoch = 1
        const toEpoch = 5
        const attesterId = BigInt(2140158589239525290)
        const posRep = 10
        const negRep = 108
        const graffiti = 1241
        const timestamp = 124
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        tree.insert(
            hash7([
                id.identityNullifier,
                attesterId,
                fromEpoch,
                posRep,
                negRep,
                graffiti,
                timestamp,
            ])
        )
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(id.identityNullifier, attesterId, fromEpoch, i)
            )
        const circuitInputs = genUserStateTransitionCircuitInput({
            id,
            fromEpoch,
            toEpoch,
            attesterId,
            startBalance: { posRep, negRep, graffiti, timestamp },
            tree,
            leafIndex: 0,
            epochKeyBalances: epochKeys.reduce(
                (acc, val) => ({
                    ...acc,
                    [val.toString()]: { posRep: 10, negRep: 20 },
                }),
                {}
            ),
        })
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.userStateTransition,
            circuitInputs
        )
        expect(isValid).to.be.true
        expect(publicSignals[0]).to.equal(tree.root.toString())
        const newLeaf = hash7([
            id.identityNullifier,
            attesterId,
            toEpoch,
            posRep + NUM_EPOCH_KEY_NONCE_PER_EPOCH * 10,
            negRep + NUM_EPOCH_KEY_NONCE_PER_EPOCH * 20,
            graffiti,
            timestamp,
        ])
        expect(publicSignals[1]).to.equal(newLeaf.toString())
        const transitionNullifier = genUserStateTransitionNullifier(
            id.identityNullifier,
            attesterId,
            fromEpoch
        )
        expect(publicSignals[2]).to.equal(transitionNullifier.toString())
    })

    it('should do ust with 0 epoch tree root', async () => {
        const id = new ZkIdentity()
        const fromEpoch = 1
        const toEpoch = 5
        const attesterId = BigInt(1249021895182290)
        const posRep = 10
        const negRep = 108
        const graffiti = 190129
        const timestamp = 9241
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        tree.insert(
            hash7([
                id.identityNullifier,
                attesterId,
                fromEpoch,
                posRep,
                negRep,
                graffiti,
                timestamp,
            ])
        )
        const epochTree = new IncrementalMerkleTree(
            EPOCH_TREE_DEPTH,
            0,
            EPOCH_TREE_ARITY
        )
        epochTree.insert(40124)
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: fromEpoch,
                to_epoch: toEpoch,
                identity_nullifier: id.identityNullifier,
                state_tree_indexes: tree.createProof(0).pathIndices,
                state_tree_elements: tree.createProof(0).siblings,
                attester_id: attesterId,
                pos_rep: posRep,
                neg_rep: negRep,
                graffiti: graffiti,
                timestamp: timestamp,
                new_pos_rep: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH).fill(0),
                new_neg_rep: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH).fill(0),
                new_graffiti: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH).fill(0),
                new_timestamp: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH).fill(0),
                epoch_tree_elements: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
                    .fill(0)
                    .map(() => epochTree._createProof(0).siblings.slice(1)),
                epoch_tree_indices: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
                    .fill(0)
                    .map(() => epochTree._createProof(0).pathIndices.slice(1)),
                noninclusion_leaf: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
                    .fill(0)
                    .map(() => [0, 0]),
                noninclusion_leaf_index: Array(
                    NUM_EPOCH_KEY_NONCE_PER_EPOCH
                ).fill(0),
                noninclusion_elements: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
                    .fill(0)
                    .map(() =>
                        Array(2)
                            .fill(0)
                            .map(() => Array(EPOCH_TREE_ARITY).fill(0))
                    ),
                inclusion_leaf_index: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH).fill(
                    0
                ),
                inclusion_elements: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
                    .fill(0)
                    .map(() => Array(EPOCH_TREE_ARITY).fill(0)),
            })
        )
        expect(isValid, 'invalid proof').to.be.true
        expect(publicSignals[0]).to.equal(tree.root.toString())
        const newLeaf = hash7([
            id.identityNullifier,
            attesterId,
            toEpoch,
            posRep,
            negRep,
            graffiti,
            timestamp,
        ])
        expect(publicSignals[1]).to.equal(newLeaf.toString())
        const transitionNullifier = genUserStateTransitionNullifier(
            id.identityNullifier,
            attesterId,
            fromEpoch
        )
        expect(publicSignals[2]).to.equal(transitionNullifier.toString())
        // should output 0 for epoch tree root
        expect(publicSignals[3].toString()).to.equal('0')
    })

    it('should fail UST with 0 epoch root with non-zero new reputation', async () => {
        const id = new ZkIdentity()
        const fromEpoch = 1
        const toEpoch = 5
        const attesterId = BigInt(1249021895182290)
        const posRep = 10
        const negRep = 108
        const graffiti = 190129
        const timestamp = 9241
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        tree.insert(
            hash7([
                id.identityNullifier,
                attesterId,
                fromEpoch,
                posRep,
                negRep,
                graffiti,
                timestamp,
            ])
        )
        const epochTree = new IncrementalMerkleTree(
            EPOCH_TREE_DEPTH,
            0,
            EPOCH_TREE_ARITY
        )
        epochTree.insert(40124)
        const inputs = stringifyBigInts({
            from_epoch: fromEpoch,
            to_epoch: toEpoch,
            identity_nullifier: id.identityNullifier,
            state_tree_indexes: tree.createProof(0).pathIndices,
            state_tree_elements: tree.createProof(0).siblings,
            attester_id: attesterId,
            pos_rep: posRep,
            neg_rep: negRep,
            graffiti: graffiti,
            timestamp: timestamp,
            new_pos_rep: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH).fill(0),
            new_neg_rep: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH).fill(1),
            new_graffiti: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH).fill(0),
            new_timestamp: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH).fill(0),
            epoch_tree_elements: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
                .fill(0)
                .map(() => epochTree._createProof(0).siblings.slice(1)),
            epoch_tree_indices: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
                .fill(0)
                .map(() => epochTree._createProof(0).pathIndices.slice(1)),
            noninclusion_leaf: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
                .fill(0)
                .map(() => [0, 0]),
            noninclusion_leaf_index: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH).fill(
                0
            ),
            noninclusion_elements: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
                .fill(0)
                .map(() =>
                    Array(2)
                        .fill(0)
                        .map(() => Array(EPOCH_TREE_ARITY).fill(0))
                ),
            inclusion_leaf_index: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH).fill(0),
            inclusion_elements: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
                .fill(0)
                .map(() => Array(EPOCH_TREE_ARITY).fill(0)),
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.userStateTransition, inputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })
})
