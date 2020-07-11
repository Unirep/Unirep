import { ethers } from "@nomiclabs/buidler"
import { Signer, Wallet } from "ethers"
import chai from "chai"
import { deployContract, link, solidity } from "ethereum-waffle"
import { genRandomSalt, NOTHING_UP_MY_SLEEVE } from '../crypto/crypto'
import { IncrementalQuinTree } from '../crypto/IncrementalQuinTree'

chai.use(solidity)
const { expect } = chai

import ComputeRoot from "../artifacts/ComputeRoot.json"
import IncrementalMerkleTree from "../artifacts/IncrementalMerkleTree.json"
import PoseidonT3 from "../artifacts/PoseidonT3.json"

let mtContract
let crContract
let PoseidonT3Contract

const DEPTH = 32

let tree
describe('IncrementalMerkleTree', () => {
    before(async () => {
        let accounts: Signer[]
        accounts = await ethers.getSigners()

        console.log('Deploying PoseidonT3Contract')
        PoseidonT3Contract = (await deployContract(
            <Wallet>accounts[0],
            PoseidonT3
        ))

        // Link the IncrementalMerkleTree contract to PoseidonT3 contract
        let linkableContract = {
            evm: {
                bytecode: {
                    object: IncrementalMerkleTree.bytecode,
                }
            }
        }
        link(linkableContract, 'contracts/Poseidon.sol:PoseidonT3', PoseidonT3Contract.address);
        IncrementalMerkleTree.bytecode = linkableContract.evm.bytecode.object

        console.log('Deploying IncrementalMerkleTree')
        mtContract = (await deployContract(
            <Wallet>accounts[0],
            IncrementalMerkleTree,
            [
                DEPTH,
                NOTHING_UP_MY_SLEEVE.toString()
            ]
        ))

        // Link the IncrementalMerkleTree contract to PoseidonT3 contract
        linkableContract = {
            evm: {
                bytecode: {
                    object: ComputeRoot.bytecode,
                }
            }
        }
        link(linkableContract, 'contracts/Poseidon.sol:PoseidonT3', PoseidonT3Contract.address);
        ComputeRoot.bytecode = linkableContract.evm.bytecode.object
        console.log('Deploying ComputeRoot')
        crContract = (await deployContract(
            <Wallet>accounts[0],
            ComputeRoot
        ))

        tree = new IncrementalQuinTree(DEPTH, NOTHING_UP_MY_SLEEVE, 2)
    })

    it('an empty tree should have the correct root', async () => {
        const root1 = await mtContract.root()
        expect(tree.root.toString()).equal(root1.toString())
    })

    it('computeEmptyRoot() should generate the correct root', async () => {
        const emptyRoot = await crContract.computeEmptyRoot(DEPTH, NOTHING_UP_MY_SLEEVE.toString())
        expect(tree.root.toString()).equal(emptyRoot.toString())
    })

    it('the on-chain root should match an off-chain root after various insertions', async () => {
        // expect.assertions(8)
        for (let i = 0; i < 8; i++) {
            const leaf = genRandomSalt()

            const tx = await mtContract.insertLeaf(leaf.toString())
            await tx.wait()
            const root1 = await mtContract.root()

            tree.insert(leaf)

            expect(tree.root.toString()).equal(root1.toString())
        }
    })
})