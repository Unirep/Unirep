import { expect } from 'chai'
import {
    ZkIdentity,
    IncrementalMerkleTree,
    genEpochKey,
    genUserStateTransitionNullifier,
    stringifyBigInts,
    genStateTreeLeaf,
    hash2,
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
    HISTORY_TREE_DEPTH,
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
        const historyTree = new IncrementalMerkleTree(HISTORY_TREE_DEPTH)
        const epochTreeRoot = 0
        historyTree.insert(hash2([tree.root, epochTreeRoot]))
        const { circuitInputs } = genUserStateTransitionCircuitInput({
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
        const newLeaf = genStateTreeLeaf(
            id.secretHash,
            attesterId,
            toEpoch,
            data
        )
        expect(publicSignals[0]).to.equal(newLeaf.toString())
        const transitionNullifier = genUserStateTransitionNullifier(
            id.secretHash,
            attesterId,
            fromEpoch
        )
        expect(publicSignals[1]).to.equal(transitionNullifier.toString())
        expect(publicSignals[2]).to.equal(historyTree.root.toString())
    })

    it('should do a user state transition with new rep', async () => {
        const id = new ZkIdentity()
        const fromEpoch = 1
        const toEpoch = 5
        const attesterId = BigInt(124185829581290)
        const data = randomData()
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        tree.insert(
            genStateTreeLeaf(id.secretHash, attesterId, fromEpoch, data)
        )
        const epochKey = genEpochKey(id.secretHash, attesterId, fromEpoch, 0)
        const changes = Array(FIELD_COUNT)
            .fill(0)
            .map(() => BigInt(Math.floor(Math.random() * 100)))
        const { circuitInputs, epochTree } = genUserStateTransitionCircuitInput(
            {
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
            }
        )
        const historyTree = new IncrementalMerkleTree(HISTORY_TREE_DEPTH)
        historyTree.insert(hash2([tree.root, epochTree.root]))
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.userStateTransition,
            circuitInputs
        )
        expect(isValid).to.be.true
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
        expect(publicSignals[0]).to.equal(newLeaf.toString())
        const transitionNullifier = genUserStateTransitionNullifier(
            id.secretHash,
            attesterId,
            fromEpoch
        )
        expect(publicSignals[1]).to.equal(transitionNullifier.toString())
        expect(publicSignals[2]).to.equal(historyTree.root.toString())
    })

    it('should do a user state transition with many new rep', async () => {
        const id = new ZkIdentity()
        const fromEpoch = 1
        const toEpoch = 5
        const attesterId = BigInt(21439525290)
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
        const { circuitInputs, epochTree } = genUserStateTransitionCircuitInput(
            {
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
            }
        )
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.userStateTransition,
            circuitInputs
        )
        expect(isValid).to.be.true
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
        expect(publicSignals[0]).to.equal(newLeaf.toString())
        const transitionNullifier = genUserStateTransitionNullifier(
            id.secretHash,
            attesterId,
            fromEpoch
        )
        expect(publicSignals[1]).to.equal(transitionNullifier.toString())
        const historyTree = new IncrementalMerkleTree(HISTORY_TREE_DEPTH)
        historyTree.insert(hash2([tree.root, epochTree.root]))
        expect(publicSignals[2]).to.equal(historyTree.root.toString())
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
        const historyTree = new IncrementalMerkleTree(HISTORY_TREE_DEPTH)
        const epochTreeRoot
        historyTree.insert(hash2([tree.root, epochTreeRoot]))
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.userStateTransition,
            stringifyBigInts({
                from_epoch: fromEpoch,
                to_epoch: toEpoch,
                identity_secret: id.secretHash,
                state_tree_indexes: tree.createProof(0).pathIndices,
                state_tree_elements: tree.createProof(0).siblings,
                history_tree_elements: historyTree.createProof(0).siblings,
                history_tree_indices: historyTree.createProof(0).pathIndices,
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
        const newLeaf = genStateTreeLeaf(
            id.secretHash,
            attesterId,
            toEpoch,
            data
        )
        expect(publicSignals[0]).to.equal(newLeaf.toString())
        const transitionNullifier = genUserStateTransitionNullifier(
            id.secretHash,
            attesterId,
            fromEpoch
        )
        expect(publicSignals[1]).to.equal(transitionNullifier.toString())
        expect(publicSignals[2]).to.equal(historyTree.root.toString())
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
        const historyTree = new IncrementalMerkleTree(HISTORY_TREE_DEPTH)
        const epochTreeRoot = 0
        historyTree.insert(hash2([tree.root, epochTreeRoot]))
        const inputs = stringifyBigInts({
            from_epoch: fromEpoch,
            to_epoch: toEpoch,
            identity_secret: id.secretHash,
            state_tree_indexes: tree.createProof(0).pathIndices,
            state_tree_elements: tree.createProof(0).siblings,
            history_tree_elements: historyTree.createProof(0).siblings,
            history_tree_indices: historyTree.createProof(0).pathIndices,
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
                .catch((err) => {
                    if (
                        err
                            .toString()
                            .indexOf(
                                'Error in template UserStateTransition_308 line: 215'
                            ) === -1
                    ) {
                        console.log(err)
                        console.log('Wrong error')
                        throw err
                    } else {
                        rs()
                    }
                })
        })
    })

    it('should output correct history tree root with no attestations', async () => {
        const id = new ZkIdentity()
        const fromEpoch = 1
        const toEpoch = 5
        const attesterId = BigInt(1249021895182290)
        const data = randomData()
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        tree.insert(
            genStateTreeLeaf(id.secretHash, attesterId, fromEpoch, data)
        )
        const { circuitInputs, historyTree } =
            genUserStateTransitionCircuitInput({
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
        const newLeaf = genStateTreeLeaf(
            id.secretHash,
            attesterId,
            toEpoch,
            data
        )
        expect(publicSignals[0]).to.equal(newLeaf.toString())
        const transitionNullifier = genUserStateTransitionNullifier(
            id.secretHash,
            attesterId,
            fromEpoch
        )
        expect(publicSignals[1]).to.equal(transitionNullifier.toString())
        expect(publicSignals[2].toString()).to.equal(
            historyTree.root.toString()
        )
    })

    it('should output correct history tree root with attestations', async () => {
        const id = new ZkIdentity()
        const fromEpoch = 1
        const toEpoch = 5
        const attesterId = BigInt(1249021895182290)
        const data = randomData()
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        tree.insert(
            genStateTreeLeaf(id.secretHash, attesterId, fromEpoch, data)
        )
        // we can make changes to any epoch key, it will change the historyTree
        // root the same way
        const epochKey = genEpochKey(
            BigInt(18293128938192),
            attesterId,
            fromEpoch,
            0
        )
        const changes = Array(FIELD_COUNT)
            .fill(0)
            .map(() => BigInt(Math.floor(Math.random() * 100)))
        const { circuitInputs, historyTree } =
            genUserStateTransitionCircuitInput({
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
        expect(isValid, 'invalid proof').to.be.true
        const newLeaf = genStateTreeLeaf(
            id.secretHash,
            attesterId,
            toEpoch,
            data
        )
        expect(publicSignals[0]).to.equal(newLeaf.toString())
        const transitionNullifier = genUserStateTransitionNullifier(
            id.secretHash,
            attesterId,
            fromEpoch
        )
        expect(publicSignals[1]).to.equal(transitionNullifier.toString())
        expect(publicSignals[2].toString()).to.equal(
            historyTree.root.toString()
        )
    })
})
