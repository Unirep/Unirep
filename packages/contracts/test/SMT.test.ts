import { ethers } from 'hardhat'
import { expect } from 'chai'
import poseidon from '../src/poseidon'
import { SparseMerkleTree, hashLeftRight } from '@unirep/crypto'

const getSMT = async (depth = 32) => {
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
    return await smtFactory.deploy(depth)
}

describe('SMT', function () {
    this.timeout(0)
    it('should exist', async () => {
        const SMT = new SparseMerkleTree(32, hashLeftRight(0, 0))
        const smtTest = await getSMT()
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
