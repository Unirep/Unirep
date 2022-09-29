import { expect } from 'chai'
import { SparseMerkleTree, hash2 } from '@unirep/crypto'
import { Circuit } from '../src'
import { genProofAndVerify } from './utils'
import { EPOCH_TREE_DEPTH } from '../config'

describe('Update sparse merkle tree', function () {
    this.timeout(300000)
    it('should update an SMT', async () => {
        const tree = new SparseMerkleTree(EPOCH_TREE_DEPTH, hash2([0, 0]))
        const posRep = 2901
        const negRep = 8018
        const leafIndex = 12048105
        const circuitInputs = {
            from_root: tree.root,
            leaf_index: leafIndex,
            pos_rep: posRep,
            neg_rep: negRep,
            old_pos_rep: 0,
            old_neg_rep: 0,
            leaf_elements: tree.createProof(BigInt(leafIndex)),
        }
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.updateSparseTree,
            circuitInputs
        )
        expect(isValid).to.be.true
        tree.update(BigInt(leafIndex), hash2([posRep, negRep]))
        expect(publicSignals[0].toString()).to.equal(tree.root.toString())
        expect(publicSignals[1].toString()).to.equal(
            hash2([posRep, negRep]).toString()
        )
    })

    it('should update an SMT from non-zero node', async () => {
        const tree = new SparseMerkleTree(EPOCH_TREE_DEPTH, hash2([0, 0]))
        const startPosRep = 1
        const startNegRep = 2
        const posRep = 2901
        const negRep = 8018
        const leafIndex = BigInt(12048105)
        tree.update(leafIndex, hash2([1, 2]))
        const circuitInputs = {
            from_root: tree.root,
            leaf_index: leafIndex,
            pos_rep: posRep,
            neg_rep: negRep,
            old_pos_rep: 1,
            old_neg_rep: 2,
            leaf_elements: tree.createProof(leafIndex),
        }
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.updateSparseTree,
            circuitInputs
        )
        expect(isValid).to.be.true
        const newLeaf = hash2([startPosRep + posRep, startNegRep + negRep])
        tree.update(leafIndex, newLeaf)
        expect(publicSignals[0].toString()).to.equal(tree.root.toString())
        expect(publicSignals[1].toString()).to.equal(newLeaf.toString())
    })
})
