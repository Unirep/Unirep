import { ethers } from 'hardhat'
import { expect } from 'chai'
import poseidon from '../src/poseidon'
import { SparseMerkleTree, genRandomSalt } from '@unirep/crypto'

const getSMT = async (depth = 32, defaultLeaf = BigInt(0)) => {
    const accounts = await ethers.getSigners()
    const libraries = {}
    for (const [inputCount, { abi, bytecode }] of Object.entries(
        poseidon
    ) as any) {
        const f = new ethers.ContractFactory(abi, bytecode, accounts[0])
        const c = await f.deploy()
        await c.deployed()
        libraries[`Poseidon${inputCount}`] = c.address
    }
    delete libraries['Poseidon3']
    delete libraries['Poseidon5']
    const merkleTreeLibFactory = await ethers.getContractFactory(
        'SparseMerkleTree',
        {
            libraries,
        }
    )
    const merkleTreeLib = await merkleTreeLibFactory.deploy()
    await merkleTreeLib.deployed()
    const smtFactory = await ethers.getContractFactory('SparseMerkleTreeTest', {
        libraries: {
            SparseMerkleTree: merkleTreeLib.address,
        },
    })
    return await smtFactory.deploy(depth, defaultLeaf)
}

describe('SMT', function () {
    this.timeout(0)
    it('should exist', async () => {
        const defaultLeaf = genRandomSalt()
        const SMT = new SparseMerkleTree(32, defaultLeaf)
        const smtTest = await getSMT(32, defaultLeaf as any)
        const root = await smtTest.root()
        expect(root.toBigInt()).to.equal(SMT.root)
    })

    it('should insert first element', async () => {
        const SMT = new SparseMerkleTree(32, BigInt(0))
        SMT.update(BigInt(0), BigInt(1))
        const smtTest = await getSMT()
        await smtTest.update(0, 1)
        const root = await smtTest.root()
        expect(root.toBigInt()).to.equal(SMT.root)
    })

    it('should insert nth element', async () => {
        const SMT = new SparseMerkleTree(32, BigInt(0))
        const n = 2844719
        SMT.update(BigInt(n), BigInt(1))
        const smtTest = await getSMT()
        await smtTest.update(n, 1)
        const root = await smtTest.root()
        expect(root.toBigInt()).to.equal(SMT.root)
    })

    it('should fail to insert outside bounds', async () => {
        const depth = 7
        const smtTest = await getSMT(depth)
        await expect(smtTest.update(2 ** depth, 1)).to.be.reverted
    })

    it('should compute root without updating tree', async () => {
        const SMT = new SparseMerkleTree(32, BigInt(0))
        const index = genRandomSalt() % BigInt(2 ** 32)
        const value = genRandomSalt()
        SMT.update(BigInt(index), value)
        const smtTest = await getSMT()
        const computedRoot = await smtTest.compute(index, value)
        await smtTest.update(index, value)
        const root = await smtTest.root()
        expect(computedRoot.toBigInt()).to.equal(SMT.root)
        expect(root.toBigInt()).to.equal(SMT.root)
    })

    it('should insert many elements in deep tree', async () => {
        const SMT = new SparseMerkleTree(150, BigInt(0))
        const smtTest = await getSMT(150)
        const seenRoots = {}
        for (let x = 0; x < 50; x += 7) {
            await smtTest.update(x, x * x)
            SMT.update(BigInt(x), BigInt(x * x))
            const root = await smtTest.root()
            expect(seenRoots[root.toString()]).to.be.undefined
            seenRoots[root.toString()] = true
            expect(root.toBigInt()).to.equal(SMT.root)
        }
    })

    it('should insert many elements', async () => {
        const SMT = new SparseMerkleTree(32, BigInt(0))
        const smtTest = await getSMT()
        const seenRoots = {}
        for (let x = 0; x < 500; x += 7) {
            await smtTest.update(x, x * x)
            SMT.update(BigInt(x), BigInt(x * x))
            const root = await smtTest.root()
            expect(seenRoots[root.toString()]).to.be.undefined
            seenRoots[root.toString()] = true
            expect(root.toBigInt()).to.equal(SMT.root)
        }
    })

    it('should fill tree', async () => {
        const depth = 7
        const SMT = new SparseMerkleTree(depth, BigInt(0))
        const smtTest = await getSMT(depth)
        const seenRoots = {}
        for (let x = 0; x < 2 ** depth; x++) {
            await smtTest.update(x, x * x)
            SMT.update(BigInt(x), BigInt(x * x))
            const root = await smtTest.root()
            expect(seenRoots[root.toString()]).to.be.undefined
            seenRoots[root.toString()] = true
            expect(root.toBigInt()).to.equal(SMT.root)
        }
    })
})
