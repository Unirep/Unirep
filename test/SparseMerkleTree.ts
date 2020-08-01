import * as crypto from 'crypto'
import Keyv from "keyv"
import chai from "chai"
import { ethers } from "@nomiclabs/buidler"
import { Signer, Wallet } from "ethers"
import { deployContract, solidity } from "ethereum-waffle"

import { epochTreeDepth } from '../config/testLocal'
import {
    SnarkBigInt,
    hashOne,
} from '../crypto/crypto'
import { linkLibrary } from './utils'

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

async function getNewSMT(rootHash?: Buffer): Promise<SparseMerkleTreeImpl> {
    const keyv = new Keyv();
    return SparseMerkleTreeImpl.create(
        keyv,
        rootHash,
        // The current SparseMerkleTreeImpl has different tree depth implementation.
        // It has tree depth of 1 with a single root node while in this case tree depth is 0 in OneTimeSparseMerkleTree contract.
        // So we increment the tree depth passed into SparseMerkleTreeImpl by 1.
        epochTreeDepth + 1
    )
}

/* Begin tests */
describe('OneTimeSparseMerkleTree', () => {
    let accounts: Signer[]

    let tree: SparseMerkleTreeImpl
    let OneTimeSMT

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

        console.log('Deploying OneTimeSparseMerkleTree')
        OneTimeSMT = (await deployContract(
            <Wallet>accounts[0],
            OneTimeSparseMerkleTree,
            [epochTreeDepth],
            {
                gasLimit: 9000000,
            }
        ))
        let receipt = await ethers.provider.getTransactionReceipt(OneTimeSMT.deployTransaction.hash)
        console.log("Gas cost of deploying OneTimeSparseMerkleTree:", receipt.gasUsed.toString())

        tree = await getNewSMT()
    })

    describe('initialization ', async () => {
        it('default values should match', async () => {
            let defaultRoot = await OneTimeSMT.getRoot()
            expect(defaultRoot).to.be.equal(ethers.utils.hexZeroPad("0x", 32))

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
            let defaultRoot = await OneTimeSMT.getRoot()
            expect(defaultRoot).to.be.equal(ethers.utils.hexZeroPad("0x", 32))
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
            let result
            for (let i = 0; i < numLeavesToInsert; i++) {
                result = await tree.update(leafIndices[i], hexStrToBuf(dataBlocks[i]))
                expect(result).to.be.true
            }
            let treeRoot = bufToHexString(tree.getRootHash())

            let tx = await OneTimeSMT.genSMT(
                leafIndices.map((bn) => bn.toString(10)),
                leafData,
                {
                    gasLimit: 9000000,
                }
            )

            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
            let OTSMTRoot = await OneTimeSMT.getRoot()
            expect(OTSMTRoot).to.be.equal(treeRoot)
            console.log("Gas cost of computing the " + epochTreeDepth + " level SMT with adjacent " + numLeavesToInsert + " indices " + receipt.gasUsed.toString())
        })

        it('inserting leaves with random indices should match', async () => {
            let defaultRoot = await OneTimeSMT.getRoot()
            expect(defaultRoot).to.be.equal(ethers.utils.hexZeroPad("0x", 32))
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
            let result
            for (let i = 0; i < numLeavesToInsert; i++) {
                result = await tree.update(leafIndices[i], hexStrToBuf(dataBlocks[i]))
                expect(result).to.be.true
            }
            let treeRoot = bufToHexString(tree.getRootHash())

            let tx = await OneTimeSMT.genSMT(
                leafIndices.map((bn) => bn.toString(10)),
                leafData,
                {
                    gasLimit: 9000000,
                }
            )

            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
            let OTSMTRoot = await OneTimeSMT.getRoot()
            expect(OTSMTRoot).to.be.equal(treeRoot)
            console.log("Gas cost of computing the " + epochTreeDepth + " level SMT with random " + numLeavesToInsert + " indices " + receipt.gasUsed.toString())
        })

        it('inserting leaf with out of bound index should fail', async () => {
            let defaultRoot = await OneTimeSMT.getRoot()
            expect(defaultRoot).to.be.equal(ethers.utils.hexZeroPad("0x", 32))
            let leafIndex = numLeaves.add(ONE)
            let dataBlock = crypto.randomBytes(32).toString('hex')
            let leafData = hashOne('0x' + dataBlock)
            let result
            result = await tree.update(leafIndex, hexStrToBuf(dataBlock))
            expect(result).to.be.false

            await expect(OneTimeSMT.genSMT(
                [leafIndex.toString(10)],
                [leafData],
                {
                    gasLimit: 9000000,
                }
            )).to.be.revertedWith('Index of inserted leaf is greater than total number of leaves')
        })
    })
})