import { expect } from 'chai'
import { IncrementalMerkleTree, hash1 } from '@unirep/utils'
import { EPOCH_TREE_DEPTH, EPOCH_TREE_ARITY, Rx, _N } from '../config'
import { genProofAndVerify } from './utils'
import { Circuit } from '../src'
import BN from 'bn.js'

const buildInputsForLeaves = (leaves: any[]) => {
    const _leaves = [0, ...leaves]
    const sortedLeaves = [..._leaves].sort((a, b) => (a > b ? 1 : -1))
    const leafCount = sortedLeaves.length
    const rVals = sortedLeaves.map((l) => Rx[_leaves.indexOf(l)])

    const targetLength = EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH
    for (let x = 0; x < targetLength - _leaves.length; x++) {
        sortedLeaves.push(0)
        rVals.push(Rx[_leaves.length + x])
    }
    return {
        circuitInputs: {
            sorted_leaves: sortedLeaves,
            leaf_r_values: rVals,
            leaf_count: _leaves.length,
        },
        leaves: _leaves,
    }
}

const random = () => hash1([BigInt(Math.floor(Math.random() * 1000000000000))])

describe('Build sorted merkle tree', function () {
    this.timeout(300000)
    it('should build a full tree', async () => {
        const _leaves = Array(EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH - 2)
            .fill(null)
            .map(() => random())
        const { leaves, circuitInputs } = buildInputsForLeaves(_leaves)
        const { sorted_leaves: sortedLeaves } = circuitInputs
        const tree = new IncrementalMerkleTree(
            EPOCH_TREE_DEPTH,
            0,
            EPOCH_TREE_ARITY
        )
        for (const leaf of sortedLeaves) {
            tree.insert(BigInt(leaf))
        }
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.buildOrderedTree,
            circuitInputs
        )
        let expectedPolyhash = new BN(0)
        for (const [index, leaf] of Object.entries(leaves)) {
            const term = new BN(leaf.toString()).mul(new BN(Rx[index])).mod(_N)
            expectedPolyhash = expectedPolyhash.add(term).mod(_N)
        }
        expect(publicSignals[0].toString(), 'root').to.equal(
            tree.root.toString()
        )
        expect(publicSignals[1].toString(), 'polyhash').to.equal(
            expectedPolyhash.toString()
        )
    })

    it('should build a partial tree', async () => {
        const _leaves = Array(50)
            .fill(null)
            .map(() => random())
        const { leaves, circuitInputs } = buildInputsForLeaves(_leaves)
        const { sorted_leaves: sortedLeaves } = circuitInputs
        const tree = new IncrementalMerkleTree(
            EPOCH_TREE_DEPTH,
            0,
            EPOCH_TREE_ARITY
        )
        for (const leaf of sortedLeaves) {
            tree.insert(BigInt(leaf))
        }
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.buildOrderedTree,
            circuitInputs
        )
        let expectedPolyhash = new BN(0)
        for (const [index, leaf] of Object.entries(leaves)) {
            const term = new BN(leaf.toString()).mul(new BN(Rx[index])).mod(_N)
            expectedPolyhash = expectedPolyhash.add(term).mod(_N)
        }
        expect(publicSignals[0].toString(), 'root').to.equal(
            tree.root.toString()
        )
        expect(publicSignals[1].toString(), 'polyhash').to.equal(
            expectedPolyhash.toString()
        )
    })

    it('should fail if leaves are not ordered', async () => {
        const _leaves = Array(10)
            .fill(null)
            .map(() => random())
        const { leaves, circuitInputs } = buildInputsForLeaves(_leaves)
        const { sorted_leaves: sortedLeaves } = circuitInputs

        circuitInputs.sorted_leaves[3] = circuitInputs.sorted_leaves[6]
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.buildOrderedTree, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail if leaves are equal', async () => {
        const _leaves = Array(10)
            .fill(null)
            .map(() => random())
        const { leaves, circuitInputs } = buildInputsForLeaves(_leaves)

        circuitInputs.sorted_leaves[3] = circuitInputs.sorted_leaves[4]
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.buildOrderedTree, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail if invalid Rx value is supplied', async () => {
        const _leaves = Array(10)
            .fill(null)
            .map(() => random())
        const { leaves, circuitInputs } = buildInputsForLeaves(_leaves)

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
            .map(() => random())
        const { leaves, circuitInputs } = buildInputsForLeaves(_leaves)

        circuitInputs.sorted_leaves[12] = BigInt('1')
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.buildOrderedTree, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })
})
