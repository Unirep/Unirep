import * as crypto from 'crypto'
import chai from "chai"
import { ethers } from "@nomiclabs/buidler"
import { ContractFactory, Signer, Wallet } from "ethers"
import { deployContract, solidity } from "ethereum-waffle"

import { epochTreeDepth } from '../config/testLocal'
import {
    SnarkBigInt,
    hashOne,
    bigInt,
} from '../crypto/crypto'
import { getNewSMT, linkLibrary } from './utils'

import {
    BigNumber,
    ONE,
    SparseMerkleTreeImpl,
    TWO,
    bufToHexString,
    hexStrToBuf,
} from '../crypto/SMT';

chai.use(solidity)
const { expect } = chai

import PoseidonT3 from "../artifacts/PoseidonT3.json"
import PoseidonT6 from "../artifacts/PoseidonT6.json"
import OneTimeSparseMerkleTree from '../artifacts/OneTimeSparseMerkleTree.json'

const numLeaves = TWO.pow(new BigNumber(epochTreeDepth))
const sizeKeySpaceInBytes: number = Math.floor(epochTreeDepth / 8)

/* Begin tests */
describe('OneTimeSparseMerkleTree', () => {
    let accounts: Signer[]

    let OTSMTFactory: ContractFactory
    let tree: SparseMerkleTreeImpl

    beforeEach(async () => {
        let PoseidonT3Contract, PoseidonT6Contract
        accounts = await ethers.getSigners()

        console.log('Deploying PoseidonT3')
        PoseidonT3Contract = (await deployContract(
            <Wallet>accounts[0],
            PoseidonT3
        ))
        console.log('Deploying PoseidonT6')
        PoseidonT6Contract = (await deployContract(
            <Wallet>accounts[0],
            PoseidonT6
        ))

        // Link the library code if it has not been linked yet
        if(OneTimeSparseMerkleTree.bytecode.indexOf("$") > 0) {
            // Link the Unirep contract to PoseidonT3 contract
            linkLibrary(OneTimeSparseMerkleTree, 'contracts/Poseidon.sol:PoseidonT3', PoseidonT3Contract.address)
            // Link the Unirep contract to PoseidonT6 contract
            linkLibrary(OneTimeSparseMerkleTree, 'contracts/Poseidon.sol:PoseidonT6', PoseidonT6Contract.address)
        }

        OTSMTFactory = new ContractFactory(OneTimeSparseMerkleTree.abi, OneTimeSparseMerkleTree.bytecode, accounts[0])

        tree = await getNewSMT(epochTreeDepth)
    })

    describe('initialization ', async () => {
        it('default values should match', async () => {
            console.log('Deploying OneTimeSparseMerkleTree')
            let leafIndices: BigNumber[] = [ONE]
            let leafData: SnarkBigInt[] = [bigInt(1)]
            const OneTimeSMT = await OTSMTFactory.deploy(
                epochTreeDepth,
                leafIndices.map((bn) => bn.toString(10)),
                leafData,
                {
                    gasLimit: 9000000,
                }
            )
            let receipt = await ethers.provider.getTransactionReceipt(OneTimeSMT.deployTransaction.hash)
            console.log("Gas cost of deploying OneTimeSparseMerkleTree with " + leafIndices.length + " leaves: " + receipt.gasUsed.toString())

            let numLeaves_ = (await OneTimeSMT.numLeaves()).toString()
            expect(numLeaves_).to.be.equal(tree.numLeaves.toString(10))
            expect(numLeaves_).to.be.equal(numLeaves.toString(10))

            let defaultHashes = await OneTimeSMT.getDefaultHashes()
            expect(defaultHashes.length).to.be.equal(epochTreeDepth)
            let count = defaultHashes.length
            for(var hash of defaultHashes) {
                expect(hash).to.be.equal(bufToHexString(tree.getZeroHash(count)))
                count = count - 1
            }
        })
    })

    describe('genSMT() ', async () => {
        it('inserting leaves with adjacent indices should match', async () => {
            const numLeavesToInsert = Math.floor(Math.random() * 10 + 1)
            let leafIndices: BigNumber[] = []
            let dataBlocks: string[] = []
            let leafData: SnarkBigInt[] = []
            let startIndex: number = Math.floor(Math.random() * 10)
            for (let i = 0; i < numLeavesToInsert; i++) {
                leafIndices[i] = new BigNumber(i + startIndex, 10)
                dataBlocks[i] = crypto.randomBytes(32).toString('hex')
                leafData[i] = hashOne('0x' + dataBlocks[i])
            }

            console.log('Deploying OneTimeSparseMerkleTree')
            const OneTimeSMT = await OTSMTFactory.deploy(
                epochTreeDepth,
                leafIndices.map((bn) => bn.toString(10)),
                leafData,
                {
                    gasLimit: 9000000,
                }
            )
            let receipt = await ethers.provider.getTransactionReceipt(OneTimeSMT.deployTransaction.hash)
            console.log("Gas cost of deploying OneTimeSparseMerkleTree with " + leafIndices.length + " leaves: " + receipt.gasUsed.toString())

            let result
            for (let i = 0; i < numLeavesToInsert; i++) {
                result = await tree.update(leafIndices[i], hexStrToBuf(dataBlocks[i]))
                expect(result).to.be.true
            }
            let treeRoot = bufToHexString(tree.getRootHash())

            const OTSMTRoot = await OneTimeSMT.genSMT()

            expect(OTSMTRoot).to.be.equal(treeRoot)
            console.log("Gas cost of computing the " + epochTreeDepth + " level SMT with adjacent " + numLeavesToInsert + " indices " + receipt.gasUsed.toString())
        }).timeout(100000)

        it('inserting leaves with random indices should match', async () => {
            const numLeavesToInsert = 1
            // const numLeavesToInsert = Math.floor(Math.random() * 10 + 1)
            let leafIndices: BigNumber[] = []
            let dataBlocks: string[] = []
            let leafData: SnarkBigInt[] = []
            let numKeyBytes: number
            for (let i = 0; i < numLeavesToInsert; i++) {
                numKeyBytes = Math.floor(Math.random() * sizeKeySpaceInBytes + 1);
                leafIndices[i] = new BigNumber(crypto.randomBytes(numKeyBytes).toString('hex'), 16)
                dataBlocks[i] = crypto.randomBytes(32).toString('hex')
                leafData[i] = hashOne('0x' + dataBlocks[i])
            }

            console.log('Deploying OneTimeSparseMerkleTree')
            const OneTimeSMT = await OTSMTFactory.deploy(
                epochTreeDepth,
                leafIndices.map((bn) => bn.toString(10)),
                leafData,
                {
                    gasLimit: 9000000,
                }
            )
            let receipt = await ethers.provider.getTransactionReceipt(OneTimeSMT.deployTransaction.hash)
            console.log("Gas cost of deploying OneTimeSparseMerkleTree with " + leafIndices.length + " leaves: " + receipt.gasUsed.toString())

            let result
            for (let i = 0; i < numLeavesToInsert; i++) {
                result = await tree.update(leafIndices[i], hexStrToBuf(dataBlocks[i]))
                expect(result).to.be.true
            }
            let treeRoot = bufToHexString(tree.getRootHash())

            const OTSMTRoot = await OneTimeSMT.genSMT()

            expect(OTSMTRoot).to.be.equal(treeRoot)
            console.log("Gas cost of computing the " + epochTreeDepth + " level SMT with random " + numLeavesToInsert + " indices " + receipt.gasUsed.toString())
        })

        it('inserting leaf with unknown value should succeed', async () => {
            const numLeavesToInsert = 1
            let leafIndices: BigNumber[] = []
            let leafData: SnarkBigInt[] = []
            let numKeyBytes: number
            for (let i = 0; i < numLeavesToInsert; i++) {
                numKeyBytes = Math.floor(Math.random() * sizeKeySpaceInBytes + 1);
                leafIndices[i] = new BigNumber(crypto.randomBytes(numKeyBytes).toString('hex'), 16)
                leafData[i] = hashOne('0x' + crypto.randomBytes(32).toString('hex'))
            }

            const OneTimeSMT = await OTSMTFactory.deploy(
                epochTreeDepth,
                leafIndices.map((bn) => bn.toString(10)),
                leafData,
                {
                    gasLimit: 9000000,
                }
            )
            let receipt = await ethers.provider.getTransactionReceipt(OneTimeSMT.deployTransaction.hash)

            let result
            for (let i = 0; i < numLeavesToInsert; i++) {
                result = await tree.update(leafIndices[i], hexStrToBuf(leafData[i].toString(16)), true)
                expect(result).to.be.true
            }
            let treeRoot = bufToHexString(tree.getRootHash())

            const OTSMTRoot = await OneTimeSMT.genSMT()

            expect(OTSMTRoot).to.be.equal(treeRoot)
        })

        it('inserting leaf with out of bound index should fail', async () => {
            let leafIndices = [numLeaves.add(ONE)]
            let dataBlock = crypto.randomBytes(32).toString('hex')
            let leafData = [hashOne('0x' + dataBlock)]

            console.log('Deploying OneTimeSparseMerkleTree which is expected to fail')
            await expect(OTSMTFactory.deploy(
                epochTreeDepth,
                leafIndices.map((bn) => bn.toString(10)),
                leafData,
                {
                    gasLimit: 9000000,
                }
            )).to.be.revertedWith('Index of inserted leaf is greater than total number of leaves')
        })
    })
})