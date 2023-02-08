import { expect } from 'chai'
import { IncrementalMerkleTree, hash1, hash5 } from '@unirep/utils'
import {
    EPOCH_TREE_DEPTH,
    EPOCH_TREE_ARITY,
    Rx,
    _N,
    SNARK_SCALAR_FIELD,
} from '../config'
import { genProofAndVerify } from './utils'
import { Circuit, BuildOrderedTree } from '../src'
import BN from 'bn.js'

const random = () => hash1([BigInt(Math.floor(Math.random() * 1000000000000))])
const randomPreimage = () => Array(5).fill(null).map(random)

describe('Build sorted merkle tree', function () {
    this.timeout(300000)
    it('should build a full tree', async () => {
        const _leaves = Array(EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH - 2)
            .fill(null)
            .map(() => randomPreimage())
        const { leaves, circuitInputs } =
            BuildOrderedTree.buildInputsForLeaves(_leaves)
        const { sorted_leaf_preimages: sortedLeaves } = circuitInputs
        const tree = new IncrementalMerkleTree(
            EPOCH_TREE_DEPTH,
            0,
            EPOCH_TREE_ARITY
        )
        for (const leaf of sortedLeaves) {
            if (leaf[0] === 0) {
                tree.insert(0)
            } else if (leaf[0] === 1) {
                tree.insert(BigInt(SNARK_SCALAR_FIELD) - BigInt(1))
            } else {
                tree.insert(hash5(leaf))
            }
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
            .map(() => randomPreimage())
        const { sortedLeaves, leaves, circuitInputs } =
            BuildOrderedTree.buildInputsForLeaves(_leaves)
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
            .map(() => randomPreimage())
        const { sortedLeaves, leaves, circuitInputs } =
            BuildOrderedTree.buildInputsForLeaves(_leaves)

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
        const { leaves, circuitInputs } =
            BuildOrderedTree.buildInputsForLeaves(_leaves)

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
        const { leaves, circuitInputs } =
            BuildOrderedTree.buildInputsForLeaves(_leaves)

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
        const { leaves, circuitInputs } =
            BuildOrderedTree.buildInputsForLeaves(_leaves)

        circuitInputs.sorted_leaf_preimages[12] = [BigInt('4'), 0, 0, 0, 0]
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.buildOrderedTree, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })
})
