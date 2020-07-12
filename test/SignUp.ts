import { ethers } from "@nomiclabs/buidler"
import { Signer, Wallet } from "ethers"
import chai from "chai"
import { deployContract, solidity } from "ethereum-waffle"
import { globalStateTreeDepth, userStateTreeDepth, maxUsers} from '../config/testLocal'
import { genRandomSalt, NOTHING_UP_MY_SLEEVE } from '../crypto/crypto'
import { genIdentity, genIdentityCommitment } from '../crypto/idendity'
import { IncrementalQuinTree } from '../crypto/IncrementalQuinTree'
import { linkLibrary } from './utils'

chai.use(solidity)
const { expect } = chai

import Unirep from "../artifacts/Unirep.json"
import PoseidonT3 from "../artifacts/PoseidonT3.json"
import PoseidonT6 from "../artifacts/PoseidonT6.json"


describe('IncrementalMerkleTree', () => {
    let unirepContract
    let PoseidonT3Contract, PoseidonT6Contract
    let GSTree

    let accounts: Signer[]
    let user1
    let user2

    before(async () => {
        accounts = await ethers.getSigners()
        user1 = accounts[1]
        user2 = accounts[2]

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
        linkLibrary(Unirep, 'contracts/Poseidon.sol:PoseidonT3', PoseidonT3Contract.address)
        // Link the IncrementalMerkleTree contract to PoseidonT6 contract
        linkLibrary(Unirep, 'contracts/Poseidon.sol:PoseidonT6', PoseidonT6Contract.address)

        console.log('Deploying Unirep')
        unirepContract = (await deployContract(
            <Wallet>accounts[0],
            Unirep,
            [
                {
                    globalStateTreeDepth,
                    userStateTreeDepth
                },
                {
                    maxUsers
                }
            ]
        ))

        const blankGSLeaf = await unirepContract.hashedBlankStateLeaf()
        GSTree = new IncrementalQuinTree(globalStateTreeDepth, blankGSLeaf, 2)
    })

    it('should have the correct config value', async () => {
        const maxUsers_ = await unirepContract.maxUsers()
        expect(maxUsers.toString()).equal(maxUsers_.toString())

        const treeDepths_ = await unirepContract.treeDepths()
        expect(globalStateTreeDepth.toString()).equal(treeDepths_.globalStateTreeDepth.toString())
        expect(userStateTreeDepth.toString()).equal(treeDepths_.userStateTreeDepth.toString())
    })

    describe('Sign-ups', () => {

        it('initial global state GSTree should have the correct root', async () => {
            const root1 = await unirepContract.getStateTreeRoot()
            expect(GSTree.root.toString()).equal(root1.toString())
        })

        it('sign up should succeed', async () => {
            const id = genIdentity()
            const commitment = genIdentityCommitment(id)

            const tx = await unirepContract.userSignUp(commitment)
            const receipt = await tx.wait()

            expect(receipt.status).equal(1)

            const numUserSignUps_ = await unirepContract.numUserSignUps()
            expect((1).toString()).equal(numUserSignUps_.toString())

            const emptyUserStateRoot_ = await unirepContract.emptyUserStateRoot()
            const hashedStateLeaf = await unirepContract.hashStateLeaf(
                [
                    commitment.toString(),
                    emptyUserStateRoot_.toString()
                ]
            )
            GSTree.insert(hashedStateLeaf)
            const root1 = await unirepContract.getStateTreeRoot()
            expect(GSTree.root.toString()).equal(root1.toString())
        })
    })
})