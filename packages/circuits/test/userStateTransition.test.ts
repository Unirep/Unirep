import { expect } from 'chai'
import {
    ZkIdentity,
    IncrementalMerkleTree,
    genEpochKey,
    genUserStateTransitionNullifier,
    stringifyBigInts,
    genStateTreeLeaf,
} from '@unirep/utils'
import { Circuit, CircuitConfig } from '../src'
import {
    randomData,
    genProofAndVerify,
    genUserStateTransitionCircuitInput,
} from './utils'
const {
    EPOCH_TREE_DEPTH,
    EPOCH_TREE_ARITY,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    STATE_TREE_DEPTH,
    SUM_FIELD_COUNT,
    FIELD_COUNT,
} = CircuitConfig.default

describe('User state transition', function () {
    this.timeout(300000)

    it('should do a user state transition', async () => {
        const id = new ZkIdentity()
        const fromEpoch = 1
        const toEpoch = 5
        const attesterId = BigInt(1249021895182290)
        const data = randomData()
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        tree.insert(
            genStateTreeLeaf(id.secretHash, attesterId, fromEpoch, data)
        )
        const circuitInputs = genUserStateTransitionCircuitInput({
            id,
            fromEpoch,
            toEpoch,
            attesterId,
            startBalance: data,
            tree,
            leafIndex: 0,
        })
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.userStateTransition,
            circuitInputs
        )
        expect(isValid, 'invalid proof').to.be.true
        expect(publicSignals[0]).to.equal(tree.root.toString())
        const newLeaf = genStateTreeLeaf(
            id.secretHash,
            attesterId,
            toEpoch,
            data
        )
        expect(publicSignals[1]).to.equal(newLeaf.toString())
        const transitionNullifier = genUserStateTransitionNullifier(
            id.secretHash,
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
        const data = randomData()
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        tree.insert(
            genStateTreeLeaf(id.secretHash, attesterId, fromEpoch, data)
        )
        const epochKey = genEpochKey(id.secretHash, attesterId, fromEpoch, 0)
        const changes = Array(FIELD_COUNT)
            .fill(0)
            .map(() => BigInt(Math.floor(Math.random() * 100)))
        const circuitInputs = genUserStateTransitionCircuitInput({
            id,
            fromEpoch,
            toEpoch,
            attesterId,
            startBalance: data,
            tree,
            leafIndex: 0,
            epochKeyBalances: {
                [epochKey.toString()]: changes,
            },
        })
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.userStateTransition,
            circuitInputs
        )
        expect(isValid).to.be.true
        expect(publicSignals[0]).to.equal(tree.root.toString())
        const newLeaf = genStateTreeLeaf(
            id.secretHash,
            attesterId,
            toEpoch,
            data.map((d, i) => {
                if (i < SUM_FIELD_COUNT) {
                    return d + changes[i]
                } else {
                    return d
                }
            })
        )
        expect(publicSignals[1]).to.equal(newLeaf.toString())
        const transitionNullifier = genUserStateTransitionNullifier(
            id.secretHash,
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
        const data = randomData()
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        tree.insert(
            genStateTreeLeaf(id.secretHash, attesterId, fromEpoch, data)
        )
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) => genEpochKey(id.secretHash, attesterId, fromEpoch, i))
        const changes = Array(FIELD_COUNT)
            .fill(0)
            .map(() => BigInt(Math.floor(Math.random() * 100)))
        const overwriteChanges = Array(FIELD_COUNT)
            .fill(0)
            .map(() => BigInt(Math.floor(Math.random() * 2 ** 50)))
        const overwriteEpk = epochKeys[0]
        const circuitInputs = genUserStateTransitionCircuitInput({
            id,
            fromEpoch,
            toEpoch,
            attesterId,
            startBalance: data,
            tree,
            leafIndex: 0,
            epochKeyBalances: epochKeys.reduce(
                (acc, val) => ({
                    ...acc,
                    [val.toString()]:
                        val === overwriteEpk ? overwriteChanges : changes,
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
        const newLeaf = genStateTreeLeaf(
            id.secretHash,
            attesterId,
            toEpoch,
            data.map((d, i) => {
                if (i < SUM_FIELD_COUNT) {
                    return (
                        d +
                        changes[i] * BigInt(NUM_EPOCH_KEY_NONCE_PER_EPOCH - 1) +
                        overwriteChanges[i]
                    )
                } else {
                    return overwriteChanges[i]
                }
            })
        )
        expect(publicSignals[1]).to.equal(newLeaf.toString())
        const transitionNullifier = genUserStateTransitionNullifier(
            id.secretHash,
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
        const data = randomData()
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        tree.insert(
            genStateTreeLeaf(id.secretHash, attesterId, fromEpoch, data)
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
                identity_secret: id.secretHash,
                state_tree_indexes: tree.createProof(0).pathIndices,
                state_tree_elements: tree.createProof(0).siblings,
                attester_id: attesterId,
                data,
                new_data: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
                    .fill(0)
                    .map(() => Array(FIELD_COUNT).fill(0)),
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
        const newLeaf = genStateTreeLeaf(
            id.secretHash,
            attesterId,
            toEpoch,
            data
        )
        expect(publicSignals[1]).to.equal(newLeaf.toString())
        const transitionNullifier = genUserStateTransitionNullifier(
            id.secretHash,
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
        const data = randomData()
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        tree.insert(
            genStateTreeLeaf(id.secretHash, attesterId, fromEpoch, data)
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
            identity_secret: id.secretHash,
            state_tree_indexes: tree.createProof(0).pathIndices,
            state_tree_elements: tree.createProof(0).siblings,
            attester_id: attesterId,
            data,
            new_data: Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
                .fill(0)
                .map(() => Array(FIELD_COUNT).fill(1)),
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
