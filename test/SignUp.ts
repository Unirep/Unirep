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
import { splitSignature } from "ethers/lib/utils"


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

    describe('User sign-ups', () => {
        const id = genIdentity()
        const commitment = genIdentityCommitment(id)

        it('initial global state GSTree should have the correct root', async () => {
            const root1 = await unirepContract.getStateTreeRoot()
            expect(GSTree.root.toString()).equal(root1.toString())
        })

        it('sign up should succeed', async () => {
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

        it('double sign up should fail', async () => {
            await expect(unirepContract.userSignUp(commitment))
                .to.be.revertedWith('Unirep: the user has already signed up')
        })

        it('sign up should fail if max capacity reached', async () => {
            for (let i = 1; i < maxUsers; i++) {
                let tx = await unirepContract.userSignUp(
                    genIdentityCommitment(genIdentity())
                )
                let receipt = await tx.wait()
                expect(receipt.status).equal(1)
            }
            await expect(unirepContract.userSignUp(genIdentityCommitment(genIdentity())))
                .to.be.revertedWith('Unirep: maximum number of signups reached')
        })
    })

    describe('Attester sign-ups', () => {
        let attester
        let attesterAddress
        let attester2
        let attester2Address
        let attester2Sig
        let unirepContractCalledByAttester

        it('sign up should succeed', async () => {
            attester = accounts[1]
            attesterAddress = await attester.getAddress()
            unirepContractCalledByAttester = await ethers.getContractAt(Unirep.abi, unirepContract.address, attester)
            const tx = await unirepContractCalledByAttester.attesterSignUp()
            const receipt = await tx.wait()

            expect(receipt.status).equal(1)

            const attesterId = await unirepContract.attesters(attesterAddress)
            expect((1).toString()).equal(attesterId.toString())
            const nextAttesterId_ = await unirepContract.nextAttesterId()
            // nextAttesterId starts with 1 so now it should be 2
            expect((2).toString()).equal(nextAttesterId_.toString())
        })

        it('sign up via relayer should succeed', async () => {
            let relayer = accounts[0]
            attester2 = accounts[2]
            attester2Address = await attester2.getAddress()

            let message = ethers.utils.solidityKeccak256(["address", "address"], [attester2Address, unirepContract.address])
            let sigHex = await attester2.signMessage(ethers.utils.arrayify(message))
            attester2Sig = splitSignature(sigHex)
            const tx = await unirepContract.attesterSignUpViaRelayer(attester2Address, attester2Sig.v, attester2Sig.r, attester2Sig.s)
            const receipt = await tx.wait()
            
            expect(receipt.status).equal(1)

            const attesterId = await unirepContract.attesters(attester2Address)
            expect((2).toString()).equal(attesterId.toString())
            const nextAttesterId_ = await unirepContract.nextAttesterId()
            expect((3).toString()).equal(nextAttesterId_.toString())
        })

        it('sign up with invalid signature should fail', async () => {
            let attester3 = accounts[3]
            let attester3Address = await attester3.getAddress()
            await expect(unirepContract.attesterSignUpViaRelayer(attester3Address, attester2Sig.v, attester2Sig.r, attester2Sig.s))
                .to.be.revertedWith('Unirep: invalid attester sign up signature')
        })

        it('double sign up should fail', async () => {
            await expect(unirepContractCalledByAttester.attesterSignUp())
                .to.be.revertedWith('Unirep: attester has already signed up')

            await expect(unirepContract.attesterSignUpViaRelayer(attester2Address, attester2Sig.v, attester2Sig.r, attester2Sig.s))
                .to.be.revertedWith('Unirep: attester has already signed up')
        })
    })
})