import assert from 'assert'
import * as crypto from 'crypto'
import { ethers } from "@nomiclabs/buidler"
import { Signer, Wallet } from "ethers"
import chai from "chai"
import { deployContract, solidity } from "ethereum-waffle"
import Keyv from "keyv"

import {
    BigNumber,
    SparseMerkleTreeImpl,
    TWO,
    bufToHexString,
    hexStrToBuf,
} from '../crypto/SMT';

chai.use(solidity)
const { expect } = chai

import * as OneTimeSparseMerkleTree from '../artifacts/OneTimeSparseMerkleTree.json'
import { keccak256 } from "ethers/lib/utils";

const treeHeight = 20
const numLeaves = TWO.pow(new BigNumber(treeHeight - 1))
const sizeKeySpaceInBytes: number = Math.floor((treeHeight - 1) / 8)

async function getNewSMT(rootHash?: Buffer): Promise<SparseMerkleTreeImpl> {
    const keyv = new Keyv();
    return SparseMerkleTreeImpl.create(keyv, rootHash, treeHeight)
}

/* Begin tests */
describe('OneTimeSparseMerkleTree', () => {
    let accounts: Signer[]

    let tree: SparseMerkleTreeImpl
    let OneTimeSMT

    beforeEach(async () => {
        accounts = await ethers.getSigners()

        console.log('Deploying OneTimeSparseMerkleTree')
        OneTimeSMT = (await deployContract(
            <Wallet>accounts[0],
            OneTimeSparseMerkleTree,
            [treeHeight],
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

            let defaultHashes = await OneTimeSMT.getDefaultHashes()
            let count = defaultHashes.length - 1
            for(var hash of defaultHashes) {
                expect(hash).to.be.equal(bufToHexString(tree.getZeroHash(count)))
                count = count - 1
            }
            expect(defaultHashes.length).to.be.equal(treeHeight)
        })
    })

    describe('genSMT() ', async () => {
        it('inserting leaves with adjacent indices should match', async () => {
            let defaultRoot = await OneTimeSMT.getRoot()
            expect(defaultRoot).to.be.equal(ethers.utils.hexZeroPad("0x", 32))
            const numLeavesToInsert = Math.floor(Math.random() * 10 + 1)
            let leafIndices: BigNumber[] = []
            let dataBlocks: Buffer[] = []
            let leafData: string[] = []
            let startIndex: number = Math.floor(Math.random() * 10)
            for (let i = 0; i < numLeavesToInsert; i++) {
                leafIndices[i] = new BigNumber(i + startIndex, 10)
                dataBlocks[i] = hexStrToBuf(crypto.randomBytes(32).toString('hex'))
                leafData[i] = keccak256(dataBlocks[i])
            }
            let result
            for (let i = 0; i < numLeavesToInsert; i++) {
                result = await tree.update(leafIndices[i], dataBlocks[i])
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
        })

        it('inserting leaves with random indices should match', async () => {
            let defaultRoot = await OneTimeSMT.getRoot()
            expect(defaultRoot).to.be.equal(ethers.utils.hexZeroPad("0x", 32))
            const numLeavesToInsert = Math.floor(Math.random() * 10 + 1)
            let leafIndices: BigNumber[] = []
            let dataBlocks: Buffer[] = []
            let leafData: string[] = []
            let numKeyBytes: number
            for (let i = 0; i < numLeavesToInsert; i++) {
                numKeyBytes = Math.floor(Math.random() * sizeKeySpaceInBytes + 1);
                leafIndices[i] = new BigNumber(crypto.randomBytes(numKeyBytes).toString('hex'), 16)
                assert(leafIndices[i].lt(numLeaves), "Index of inserted leaf is larger than total number of leaves")
                dataBlocks[i] = hexStrToBuf(crypto.randomBytes(32).toString('hex'))
                leafData[i] = keccak256(dataBlocks[i])
            }
            let result
            for (let i = 0; i < numLeavesToInsert; i++) {
                result = await tree.update(leafIndices[i], dataBlocks[i])
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
        })
    })
})