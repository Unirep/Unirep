// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { IncrementalMerkleTree, F } from '@unirep/utils'
import randomf from 'randomf'

const deployTrees = async (depth) => {
    const [attester] = await ethers.getSigners()
    const Poseidon = await ethers.getContractFactory('PoseidonT3')
    const poseidon = await Poseidon.deploy()
    await poseidon.deployed()
    const LazyMerkleTree = await ethers.getContractFactory('LazyMerkleTree', {
        libraries: {
            PoseidonT3: poseidon.address,
        },
    })
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

    const MerkleTreeTest = await ethers.getContractFactory('MerkleTreeTest', {
        libraries: {
            LazyMerkleTree: lazyMerkleTree.address,
            ReusableMerkleTree: reusableMerkleTree.address,
        },
    })
    const merkleTreeTest = await MerkleTreeTest.deploy(depth)
    await merkleTreeTest.deployed()
    return merkleTreeTest
}

describe('Lazy merkle tree', function () {
    this.timeout(0)

    it('should test tree insertion', async () => {
        const depth = 6
        const merkleTreeTest = await deployTrees(depth)
        const baseCost = 21000

        const tree = new IncrementalMerkleTree(depth)

        const lazyGasUsed = []
        const normalGasUsed = []
        for (let x = 0; x < Math.min(2 ** depth - 1, 128); x++) {
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
            console.log(`Average insert cost (lazy): ${avg}`)
        }
        {
            const avg =
                normalGasUsed.reduce((acc, val) => acc + val, 0) /
                normalGasUsed.length
            console.log(`Average insert cost (normal): ${avg}`)
        }
    })

    it('should test tree update', async () => {
        const depth = 6
        const merkleTreeTest = await deployTrees(depth)
        const baseCost = 21000

        const tree = new IncrementalMerkleTree(depth)
        const lazyGasUsed = []
        const normalGasUsed = []
        for (let x = 0; x < 2 ** depth - 1; x++) {
            if (x % 100 === 0) console.log(x)
            const element = randomf(F)
            tree.insert(element)
            await merkleTreeTest.insert(element).then((t) => t.wait())
            await merkleTreeTest.insert0(element).then((t) => t.wait())
            {
                const onchainRoot = await merkleTreeTest.root()
                expect(tree.root.toString()).to.equal(onchainRoot.toString())
            }
            {
                const onchainRoot = await merkleTreeTest.root0()
                expect(tree.root.toString()).to.equal(onchainRoot.toString())
            }
            for (let y = 0; y < x; y += Math.ceil(x / 11)) {
                console.log(`Updating element at index ${y}`)
                const newElement = randomf(F)
                tree.update(y, newElement)
                {
                    const t = await merkleTreeTest.update(newElement, y)
                    const receipt = await t.wait()
                    lazyGasUsed.push(
                        Number(receipt.gasUsed.toString()) - baseCost
                    )
                }
                {
                    const t = await merkleTreeTest.update0(newElement, y)
                    const receipt = await t.wait()
                    normalGasUsed.push(
                        Number(receipt.gasUsed.toString()) - baseCost
                    )
                }
                {
                    const onchainRoot = await merkleTreeTest.root()
                    expect(tree.root.toString(), 'lazy').to.equal(
                        onchainRoot.toString()
                    )
                }
                {
                    const onchainRoot = await merkleTreeTest.root0()
                    expect(tree.root.toString(), 'reusable').to.equal(
                        onchainRoot.toString()
                    )
                }
            }
        }
        {
            const avg =
                lazyGasUsed.reduce((acc, val) => acc + val, 0) /
                lazyGasUsed.length
            console.log(`Average update cost (lazy): ${avg}`)
        }
        {
            const avg =
                normalGasUsed.reduce((acc, val) => acc + val, 0) /
                normalGasUsed.length
            console.log(`Average update cost (normal): ${avg}`)
        }
    })

    it('should fail to insert too many leaves', async () => {
        const depth = 5
        const merkleTreeTest = await deployTrees(depth)

        const tree = new IncrementalMerkleTree(depth)

        for (let x = 0; x < 2 ** depth - 1; x++) {
            const element = randomf(F)
            tree.insert(element)
            await merkleTreeTest.insert(element).then((t) => t.wait())
            await merkleTreeTest.insert0(element).then((t) => t.wait())
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
            const tx = merkleTreeTest.insert(1)
            await expect(tx).to.be.revertedWith('LazyMerkleTree: tree is full')
        }
        {
            const tx = merkleTreeTest.insert0(1)
            await expect(tx).to.be.revertedWith(
                'ReusableMerkleTree: tree is full'
            )
        }
    })

    it('should fail to insert leaf larger than field', async () => {
        const depth = 5
        const merkleTreeTest = await deployTrees(depth)

        const element = F + BigInt(1)

        {
            const tx = merkleTreeTest.insert(element)
            await expect(tx).to.be.revertedWith(
                'LazyMerkleTree: leaf must be < SNARK_SCALAR_FIELD'
            )
        }
        {
            const tx = merkleTreeTest.insert0(element)
            await expect(tx).to.be.revertedWith(
                'ReusableMerkleTree: leaf must be < SNARK_SCALAR_FIELD'
            )
        }
    })

    it('should fail to update leaf larger than field', async () => {
        const depth = 5
        const merkleTreeTest = await deployTrees(depth)

        const element = F + BigInt(1)

        {
            await merkleTreeTest.insert(1).then((t) => t.wait())
            const tx = merkleTreeTest.update(element, 0)
            await expect(tx).to.be.revertedWith(
                'LazyMerkleTree: leaf must be < SNARK_SCALAR_FIELD'
            )
        }
        {
            await merkleTreeTest.insert0(1).then((t) => t.wait())
            const tx = merkleTreeTest.update0(element, 0)
            await expect(tx).to.be.revertedWith(
                'ReusableMerkleTree: leaf must be < SNARK_SCALAR_FIELD'
            )
        }
    })
})
