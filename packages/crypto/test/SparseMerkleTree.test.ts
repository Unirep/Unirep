import { expect } from 'chai'
import { SparseMerkleTree } from '../src'

describe('SparseMerkleTree', function () {
    let tree: SparseMerkleTree
    const depth = 32
    const zeroHash = BigInt(0)

    it('constructor', async () => {
        tree = new SparseMerkleTree(depth, zeroHash)
    })

    it('update', async () => {
        const rootBeforeInsert = tree.root
        const leafKey = BigInt(2)
        const leafValue = BigInt(3)
        tree.update(leafKey, leafValue)
        expect(tree.root).not.equal(rootBeforeInsert)
    })

    it('genProof/verifyProof', () => {
        for (let index = 0; index < depth; index++) {
            const leafKey = BigInt(index)
            const proof = tree.createProof(leafKey)
            const isValid = tree.verifyProof(leafKey, proof)
            expect(isValid).to.be.true
        }
    })
})
