// @ts-ignore
import { ethers } from 'hardhat'
import { expect } from 'chai'
import { IncrementalMerkleTree, F } from '@unirep/utils'
import randomf from 'randomf'

const deployTrees = async (depth) => {
    const Poseidon = await ethers.getContractFactory('PoseidonT3')
    const poseidon = await Poseidon.deploy()
    await poseidon.waitForDeployment()
    const LazyMerkleTree = await ethers.getContractFactory('LazyMerkleTree', {
        libraries: {
            PoseidonT3: await poseidon.getAddress(),
        },
    })
    const lazyMerkleTree = await LazyMerkleTree.deploy()
    await lazyMerkleTree.waitForDeployment()
    const ReusableMerkleTree = await ethers.getContractFactory(
        'ReusableMerkleTree',
        {
            libraries: {
                PoseidonT3: await poseidon.getAddress(),
            },
        }
    )
    const reusableMerkleTree = await ReusableMerkleTree.deploy()
    await reusableMerkleTree.waitForDeployment()

    const MerkleTreeTest = await ethers.getContractFactory('MerkleTreeTest', {
        libraries: {
            LazyMerkleTree: await lazyMerkleTree.getAddress(),
            ReusableMerkleTree: await reusableMerkleTree.getAddress(),
        },
    })
    const merkleTreeTest = await MerkleTreeTest.deploy(depth)
    await merkleTreeTest.waitForDeployment()
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
                const t = await merkleTreeTest.insertLazy(element)
                const receipt = await t.wait()
                lazyGasUsed.push(Number(receipt.gasUsed.toString()) - baseCost)
            }
            {
                const t = await merkleTreeTest.insertReusable(element)
                const receipt = await t.wait()
                normalGasUsed.push(
                    Number(receipt.gasUsed.toString()) - baseCost
                )
            }
            {
                const onchainRoot = await merkleTreeTest.rootLazy()
                expect(tree.root.toString()).to.equal(onchainRoot.toString())
            }
            {
                const onchainRoot = await merkleTreeTest.rootReusable()
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
            await merkleTreeTest.insertLazy(element).then((t) => t.wait())
            await merkleTreeTest.insertReusable(element).then((t) => t.wait())
            {
                const onchainRoot = await merkleTreeTest.rootLazy()
                expect(tree.root.toString()).to.equal(onchainRoot.toString())
            }
            {
                const onchainRoot = await merkleTreeTest.rootReusable()
                expect(tree.root.toString()).to.equal(onchainRoot.toString())
            }
            for (let y = 0; y < x; y += Math.ceil(x / 11)) {
                console.log(`Updating element at index ${y}`)
                const newElement = randomf(F)
                tree.update(y, newElement)
                {
                    const t = await merkleTreeTest.updateLazy(newElement, y)
                    const receipt = await t.wait()
                    lazyGasUsed.push(
                        Number(receipt.gasUsed.toString()) - baseCost
                    )
                }
                {
                    const t = await merkleTreeTest.updateReusable(newElement, y)
                    const receipt = await t.wait()
                    normalGasUsed.push(
                        Number(receipt.gasUsed.toString()) - baseCost
                    )
                }
                {
                    const onchainRoot = await merkleTreeTest.rootLazy()
                    expect(tree.root.toString(), 'lazy').to.equal(
                        onchainRoot.toString()
                    )
                }
                {
                    const onchainRoot = await merkleTreeTest.rootReusable()
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
            await merkleTreeTest.insertLazy(element).then((t) => t.wait())
            await merkleTreeTest.insertReusable(element).then((t) => t.wait())
            {
                const onchainRoot = await merkleTreeTest.rootLazy()
                expect(tree.root.toString()).to.equal(onchainRoot.toString())
            }
            {
                const onchainRoot = await merkleTreeTest.rootReusable()
                expect(tree.root.toString()).to.equal(onchainRoot.toString())
            }
        }
        {
            const tx = merkleTreeTest.insertLazy(1)
            await expect(tx).to.be.revertedWith('LazyMerkleTree: tree is full')
        }
        {
            const tx = merkleTreeTest.insertReusable(1)
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
            const tx = merkleTreeTest.insertLazy(element)
            await expect(tx).to.be.revertedWith(
                'LazyMerkleTree: leaf must be < SNARK_SCALAR_FIELD'
            )
        }
        {
            const tx = merkleTreeTest.insertReusable(element)
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
            await merkleTreeTest.insertLazy(1).then((t) => t.wait())
            const tx = merkleTreeTest.updateLazy(element, 0)
            await expect(tx).to.be.revertedWith(
                'LazyMerkleTree: leaf must be < SNARK_SCALAR_FIELD'
            )
        }
        {
            await merkleTreeTest.insertReusable(1).then((t) => t.wait())
            const tx = merkleTreeTest.updateReusable(element, 0)
            await expect(tx).to.be.revertedWith(
                'ReusableMerkleTree: leaf must be < SNARK_SCALAR_FIELD'
            )
        }
    })
})
