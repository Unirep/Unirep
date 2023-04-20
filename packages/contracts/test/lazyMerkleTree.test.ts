// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { IncrementalMerkleTree, F } from '@unirep/utils'
import randomf from 'randomf'

describe('Lazy merkle tree', function () {
    this.timeout(0)

    it('should test the tree', async () => {
        const [attester] = await ethers.getSigners()
        const Poseidon = await ethers.getContractFactory('PoseidonT3')
        const poseidon = await Poseidon.deploy()
        await poseidon.deployed()
        const LazyMerkleTree = await ethers.getContractFactory(
            'LazyMerkleTree',
            {
                libraries: {
                    PoseidonT3: poseidon.address,
                },
            }
        )
        const lazyMerkleTree = await LazyMerkleTree.deploy()
        await lazyMerkleTree.deployed()
        const ReusableMerkleTree = await ethers.getContractFactory(
            'ReusableMerkleTree',
            {
                libraries: {
                    PoseidonT3: poseidon.address,
                },
            }
        )
        const reusableMerkleTree = await ReusableMerkleTree.deploy()
        await reusableMerkleTree.deployed()

        const MerkleTreeTest = await ethers.getContractFactory(
            'MerkleTreeTest',
            {
                libraries: {
                    LazyMerkleTree: lazyMerkleTree.address,
                    ReusableMerkleTree: reusableMerkleTree.address,
                },
            }
        )
        const depth = 9
        const merkleTreeTest = await MerkleTreeTest.deploy(depth)
        await merkleTreeTest.deployed()

        const baseCost = 21000

        const tree = new IncrementalMerkleTree(depth)

        const lazyGasUsed = []
        const normalGasUsed = []
        for (let x = 0; x < Math.min(2 ** depth - 1, 1024); x++) {
            if (x % 100 === 0) console.log(x)
            const element = randomf(F)
            tree.insert(element)
            {
                const t = await merkleTreeTest.insert(element)
                const receipt = await t.wait()
                lazyGasUsed.push(Number(receipt.gasUsed.toString()) - baseCost)
            }
            {
                const t = await merkleTreeTest.insert0(element)
                const receipt = await t.wait()
                normalGasUsed.push(
                    Number(receipt.gasUsed.toString()) - baseCost
                )
            }
            {
                const onchainRoot = await merkleTreeTest.root()
                expect(tree.root.toString()).to.equal(onchainRoot.toString())
            }
            {
                const onchainRoot = await merkleTreeTest.root0()
                expect(tree.root.toString()).to.equal(onchainRoot.toString())
            }
        }
        {
            const avg =
                lazyGasUsed.reduce((acc, val) => acc + val, 0) /
                lazyGasUsed.length
            console.log(`Average cost (lazy): ${avg}`)
        }
        {
            const avg =
                normalGasUsed.reduce((acc, val) => acc + val, 0) /
                normalGasUsed.length
            console.log(`Average cost (normal): ${avg}`)
        }
    })
})
