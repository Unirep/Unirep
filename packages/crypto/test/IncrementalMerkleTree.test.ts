import { expect } from "chai"
import { IncrementalMerkleTree } from "../src"


describe('IncrementalMerkleTree', function () {

    let tree: IncrementalMerkleTree
    const depth = 4

    it('constructor', async () => {
        tree = new IncrementalMerkleTree(depth)
        expect(typeof tree).equal('object')
    })

    it('insertion', async () => {
        const rootBeforeInsert = tree.root
        const newLeaf = 1
        tree.insert(newLeaf)
        expect(tree.root).not.equal(rootBeforeInsert)
    })

    it('genProof/verifyProof', async () => {
        const index = tree.leaves.length - 1
        const proof = tree.createProof(index)
        const isValid = tree.verifyProof(proof)
        expect(isValid).to.be.true
    })

})
