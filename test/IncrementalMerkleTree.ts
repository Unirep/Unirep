import { ethers } from "@nomiclabs/buidler"
import { Signer, Wallet } from "ethers"
import chai from "chai"
import { deployContract, solidity } from "ethereum-waffle"
import { genRandomSalt, NOTHING_UP_MY_SLEEVE } from '../crypto/crypto'
import { IncrementalQuinTree } from '../crypto/IncrementalQuinTree'
import { linkLibrary } from './utils'

chai.use(solidity)
const { expect } = chai

import ComputeRoot from "../artifacts/ComputeRoot.json"
import IncrementalMerkleTree from "../artifacts/IncrementalMerkleTree.json"
import PoseidonT3 from "../artifacts/PoseidonT3.json"
import PoseidonT6 from "../artifacts/PoseidonT6.json"

let mtContract
let crContract
let PoseidonT3Contract, PoseidonT6Contract

const DEPTH = 32

let tree
describe('IncrementalMerkleTree', () => {
    before(async () => {
        let accounts: Signer[]
        accounts = await ethers.getSigners()

        console.log('Deploying PoseidonT3C')
        PoseidonT3Contract = (await deployContract(
            <Wallet>accounts[0],
            PoseidonT3
        ))
        console.log('Deploying PoseidonT6')
        PoseidonT6Contract = (await deployContract(
            <Wallet>accounts[0],
            PoseidonT6
        ))

        // Link the IncrementalMerkleTree contract to PoseidonT3 contract
        linkLibrary(IncrementalMerkleTree, 'contracts/Poseidon.sol:PoseidonT3', PoseidonT3Contract.address)
        // Link the IncrementalMerkleTree contract to PoseidonT6 contract
        linkLibrary(IncrementalMerkleTree, 'contracts/Poseidon.sol:PoseidonT6', PoseidonT6Contract.address)

        console.log('Deploying IncrementalMerkleTree')
        mtContract = (await deployContract(
            <Wallet>accounts[0],
            IncrementalMerkleTree,
            [
                DEPTH,
                NOTHING_UP_MY_SLEEVE.toString()
            ]
        ))

        // Link the ComputeRoot contract to PoseidonT3 contract
        linkLibrary(ComputeRoot, 'contracts/Poseidon.sol:PoseidonT3', PoseidonT3Contract.address)
        // Link the ComputeRoot contract to PoseidonT6 contract
        linkLibrary(ComputeRoot, 'contracts/Poseidon.sol:PoseidonT6', PoseidonT6Contract.address)

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
        for (let i = 0; i < 8; i++) {
            const leaf = genRandomSalt()

            const tx = await mtContract.insertLeaf(leaf.toString())
            await tx.wait()
            const root1 = await mtContract.root()

            tree.insert(leaf)

            expect(tree.root.toString()).equal(root1.toString())
        }
    }).timeout(100000)
})