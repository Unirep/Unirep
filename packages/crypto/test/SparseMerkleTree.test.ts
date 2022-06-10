import { expect } from 'chai'
import Keyv from 'keyv'
import { SparseMerkleTree } from '../src'

describe('SparseMerkleTree', function () {
    let tree: SparseMerkleTree
    const depth = 4
    const zeroHash = BigInt(0)

    it('constructor', async () => {
        tree = new SparseMerkleTree(new Keyv(), depth, zeroHash)
    })

    it('update', async () => {
        const rootBeforeInsert = tree.root
        const leafKey = BigInt(2)
        const leafValue = BigInt(3)
        await tree.update(leafKey, leafValue)
        expect(tree.root).not.equal(rootBeforeInsert)
    })

    it('genProof/verifyProof', async () => {
        for (let index = 0; index < depth; index++) {
            const leafKey = BigInt(index)
            const proof = await tree.createProof(leafKey)
            const isValid = await tree.verifyProof(leafKey, proof)
            expect(isValid).to.be.true
        }
    })
})
