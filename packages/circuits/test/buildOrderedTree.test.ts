import { expect } from 'chai'
import { F, R_X, OMT_R, IncrementalMerkleTree, hash1 } from '@unirep/utils'
import { genProofAndVerify } from './utils'
import { Circuit, BuildOrderedTree, CircuitConfig } from '../src'

const { FIELD_COUNT, EPOCH_TREE_DEPTH, EPOCH_TREE_ARITY } =
    CircuitConfig.default

const Rx = R_X(OMT_R, EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH)

const random = () => hash1([BigInt(Math.floor(Math.random() * 1000000000000))])
const randomPreimage = () =>
    Array(1 + FIELD_COUNT)
        .fill(null)
        .map(random)

const calcPolysum = (leaves: bigint[]) => {
    let polysum = BigInt(0)
    for (const [index, leaf] of Object.entries(leaves)) {
        const term = (BigInt(leaf.toString()) * Rx[index]) % F
        polysum = (polysum + term) % F
    }
    return polysum
}

describe('Build sorted merkle tree', function () {
    this.timeout(300000)
    it('should build a full tree', async () => {
        const _leaves = Array(EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH - 2)
            .fill(null)
            .map(() => randomPreimage())
        const { sortedLeaves, leaves, circuitInputs } =
            BuildOrderedTree.buildInputsForLeaves(_leaves)
        const tree = new IncrementalMerkleTree(
            EPOCH_TREE_DEPTH,
            0,
            EPOCH_TREE_ARITY
        )
        for (const leaf of sortedLeaves) {
            tree.insert(leaf)
        }
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.buildOrderedTree,
            circuitInputs
        )
        expect(publicSignals[0].toString(), 'root').to.equal(
            tree.root.toString()
        )
        expect(publicSignals[1].toString(), 'polyhash').to.equal(
            calcPolysum(leaves).toString()
        )
        expect(isValid).to.be.true
    })

    it('should build a partial tree', async () => {
        const _leaves = Array(50)
            .fill(null)
            .map(() => randomPreimage())
        const { sortedLeaves, leaves, circuitInputs } =
            BuildOrderedTree.buildInputsForLeaves(_leaves)
        const tree = new IncrementalMerkleTree(
            EPOCH_TREE_DEPTH,
            0,
            EPOCH_TREE_ARITY
        )
        for (const leaf of sortedLeaves) {
            tree.insert(leaf)
        }
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.buildOrderedTree,
            circuitInputs
        )
        expect(publicSignals[0].toString(), 'root').to.equal(
            tree.root.toString()
        )
        expect(publicSignals[1].toString(), 'polyhash').to.equal(
            calcPolysum(leaves).toString()
        )
        expect(isValid).to.be.true
    })

    it('should fail if leaves are not ordered', async () => {
        const _leaves = Array(10)
            .fill(null)
            .map(() => randomPreimage())
        const { circuitInputs } = BuildOrderedTree.buildInputsForLeaves(_leaves)

        circuitInputs.sorted_leaf_preimages[3] =
            circuitInputs.sorted_leaf_preimages[6]
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.buildOrderedTree, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail if leaves are equal', async () => {
        const _leaves = Array(10)
            .fill(null)
            .map(() => randomPreimage())
        const { circuitInputs } = BuildOrderedTree.buildInputsForLeaves(_leaves)

        circuitInputs.sorted_leaf_preimages[3] =
            circuitInputs.sorted_leaf_preimages[4]
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.buildOrderedTree, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail if invalid Rx value is supplied', async () => {
        const _leaves = Array(10)
            .fill(null)
            .map(() => randomPreimage())
        const { circuitInputs } = BuildOrderedTree.buildInputsForLeaves(_leaves)

        circuitInputs.leaf_r_values[20] -= BigInt(1)
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.buildOrderedTree, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail if leaves after leaf_count are non-zero', async () => {
        const _leaves = Array(10)
            .fill(null)
            .map(() => randomPreimage())
        const { circuitInputs } = BuildOrderedTree.buildInputsForLeaves(_leaves)

        circuitInputs.sorted_leaf_preimages[12] = [
            BigInt('4'),
            ...Array(FIELD_COUNT).fill(BigInt(0)),
        ]
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.buildOrderedTree, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })
})
