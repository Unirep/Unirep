import { expect } from 'chai'
import { IncrementalMerkleTree } from '@unirep/utils'
import { EPOCH_TREE_DEPTH, EPOCH_TREE_ARITY, Rx } from '../config'
import { genProofAndVerify } from './utils'
import { Circuit } from '../src'

describe('Build sorted merkle tree', function () {
    this.timeout(300000)
    it('should build a tree', async () => {
        const leaves = Array(EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH)
            .fill(null)
            .map(() => BigInt(Math.floor(Math.random() * 1000000000000)))
        const sortedLeaves = [...leaves].sort((a, b) => (a > b ? 1 : -1))
        const rVals = sortedLeaves.map((l) => Rx[leaves.indexOf(l)])
        const tree = new IncrementalMerkleTree(
            EPOCH_TREE_DEPTH,
            0,
            EPOCH_TREE_ARITY
        )
        for (const leaf of sortedLeaves) {
            tree.insert(BigInt(leaf))
        }
        const circuitInputs = {
            sorted_leaves: sortedLeaves,
            leaf_r_values: rVals,
        }
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.buildOrderedTree,
            circuitInputs
        )
        console.log(JSON.stringify(publicSignals))
        console.log(tree.root)
    })
})
