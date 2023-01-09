import { expect } from 'chai'
import { IncrementalMerkleTree } from '@unirep/utils'
import { CHANGE_TREE_DEPTH } from '../config'
import { genProofAndVerify } from './utils'
import { Circuit } from '../src'

describe('Build sorted merkle tree', function () {
    this.timeout(300000)
    it('should build a tree', async () => {
        const leaves = Array(2 ** CHANGE_TREE_DEPTH)
            .fill(null)
            .map(() => BigInt(Math.floor(Math.random() * 1000000000000)))
        const checksumIndexByLeaf = leaves.reduce((acc, leaf, i) => {
            return {
                [leaf.toString()]: i,
                ...acc,
            }
        }, {})
        const sortedLeaves = [...leaves].sort((a, b) => (a > b ? 1 : -1))
        const tree = new IncrementalMerkleTree(CHANGE_TREE_DEPTH)
        for (const leaf of sortedLeaves) {
            tree.insert(BigInt(leaf))
        }
        const circuitInputs = {
            leaves: sortedLeaves,
            leaf_r: sortedLeaves.map(
                (leaf) => checksumIndexByLeaf[leaf.toString()]
            ),
            R: BigInt(1241290107501874018247102470),
        }
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.buildSortedTree,
            circuitInputs
        )
        console.log(publicSignals)
        console.log(tree.root)
    })
})
