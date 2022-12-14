import { expect } from 'chai'
import { SparseMerkleTree } from '../src'

describe('SparseMerkleTree', function () {
    this.timeout(20000)

    it('update', async () => {
        const depth = 32
        const zeroHash = BigInt(0)
        const arity = 2
        const tree = new SparseMerkleTree(depth, zeroHash, arity)
        const rootBeforeInsert = tree.root
        const leafKey = BigInt(2)
        const leafValue = BigInt(3)
        tree.update(leafKey, leafValue)
        expect(tree.root).not.equal(rootBeforeInsert)
    })

    it('getLeaf', async () => {
        const depth = 32
        const zero = BigInt(1280789)
        const arity = 12
        const tree = new SparseMerkleTree(depth, zero, arity)
        const valuesByIndex = {} as any
        for (let x = 0; x < 200; x++) {
            if (x % 2 === 0) {
                const v = BigInt(Math.floor(Math.random() * 10000000000))
                valuesByIndex[x] = v
                tree.update(BigInt(x), v)
            }
        }
        for (let x = 0; x < 200; x++) {
            if (x % 2 === 0) {
                expect(tree.getLeaf(BigInt(x))).to.equal(valuesByIndex[x])
            } else {
                expect(tree.getLeaf(BigInt(x))).to.equal(zero)
            }
        }
    })

    it('genProof/verifyProof', () => {
        const depth = 32
        const zeroHash = BigInt(0)
        const arity = 2
        const tree = new SparseMerkleTree(depth, zeroHash, arity)
        for (let x = 0; x < depth; x++) {
            tree.update(BigInt(x), BigInt(Math.floor(Math.random() * 10000)))
        }
        for (let index = 0; index < depth; index++) {
            const leafKey = BigInt(index)
            const proof = tree.createProof(leafKey)
            const isValid = tree.verifyProof(leafKey, proof)
            expect(isValid).to.be.true
        }
    })

    for (let x = 2; x <= 16; x++) {
        it(`${x} arity proofs`, () => {
            const depth = 32
            const zeroHash = BigInt(0)
            const arity = x
            const tree = new SparseMerkleTree(depth, zeroHash, arity)
            for (let y = 0; y < depth; y++) {
                tree.update(
                    BigInt(Math.floor(Math.random() * Number(tree.numLeaves))),
                    BigInt(Math.floor(Math.random() * 10000))
                )
            }
            for (let index = 0; index < depth; index++) {
                const leafKey = BigInt(
                    Math.floor(Math.random() * Number(tree.numLeaves))
                )
                const proof = tree.createProof(leafKey)
                const isValid = tree.verifyProof(leafKey, proof)
                expect(isValid).to.be.true
            }
        })
    }
})
