import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import chai from "chai"
import { attestingFee, epochLength, epochTreeDepth, globalStateTreeDepth, numEpochKeyNoncePerEpoch, maxUsers, nullifierTreeDepth, numAttestationsPerEpochKey, userStateTreeDepth} from '../../config/testLocal'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { IncrementalQuinTree } from 'maci-crypto'
import { deployUnirep, genNewUserStateTree, getTreeDepthsForTesting } from '../utils'

const { expect } = chai

import Unirep from "../../artifacts/contracts/Unirep.sol/Unirep.json"
import { DEFAULT_AIRDROPPED_KARMA } from '../../config/socialMedia'


describe('Signup', () => {
    let unirepContract
    let GSTree
    let emptyUserStateRoot
    
    let accounts: ethers.Signer[]
    
    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting("contract")
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths)

        const blankGSLeaf = await unirepContract.hashedBlankStateLeaf()
        GSTree = new IncrementalQuinTree(globalStateTreeDepth, blankGSLeaf, 2)
    })

    it('should have the correct config value', async () => {
        const attestingFee_ = await unirepContract.attestingFee()
        expect(attestingFee).equal(attestingFee_)
        const epochLength_ = await unirepContract.epochLength()
        expect(epochLength).equal(epochLength_)
        const numAttestationsPerEpochKey_ = await unirepContract.numAttestationsPerEpochKey()
        expect(numAttestationsPerEpochKey).equal(numAttestationsPerEpochKey_)
        const numEpochKeyNoncePerEpoch_ = await unirepContract.numEpochKeyNoncePerEpoch()
        expect(numEpochKeyNoncePerEpoch).equal(numEpochKeyNoncePerEpoch_)
        const numAttestationsPerEpoch_ = await unirepContract.numAttestationsPerEpoch()
        expect(numEpochKeyNoncePerEpoch * numAttestationsPerEpochKey).equal(numAttestationsPerEpoch_)
        const maxUsers_ = await unirepContract.maxUsers()
        expect(maxUsers).equal(maxUsers_)

        const treeDepths_ = await unirepContract.treeDepths()
        expect(epochTreeDepth).equal(treeDepths_.epochTreeDepth)
        expect(globalStateTreeDepth).equal(treeDepths_.globalStateTreeDepth)
        expect(nullifierTreeDepth).equal(treeDepths_.nullifierTreeDepth)
        expect(userStateTreeDepth).equal(treeDepths_.userStateTreeDepth)
    })

    it('should have the correct default value', async () => {
        const emptyUSTree = await genNewUserStateTree()
        emptyUserStateRoot = await unirepContract.emptyUserStateRoot()
        expect(BigNumber.from(emptyUSTree.getRootHash())).equal(emptyUserStateRoot)

        const emptyGlobalStateTreeRoot = await unirepContract.emptyGlobalStateTreeRoot()
        expect(BigNumber.from(GSTree.root)).equal(emptyGlobalStateTreeRoot)
    })

    describe('User sign-ups', () => {
        const id = genIdentity()
        const commitment = genIdentityCommitment(id)

        it('sign up should succeed', async () => {
            const tx = await unirepContract.userSignUp(commitment)
            const receipt = await tx.wait()

            expect(receipt.status).equal(1)

            const numUserSignUps_ = await unirepContract.numUserSignUps()
            expect(1).equal(numUserSignUps_)

            const hashedStateLeaf = await unirepContract.hashStateLeaf(
                [
                    commitment,
                    emptyUserStateRoot,
                    BigInt(DEFAULT_AIRDROPPED_KARMA),
                    BigInt(0)
                ]
            )
            GSTree.insert(hashedStateLeaf)
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
            unirepContractCalledByAttester = await hardhatEthers.getContractAt(Unirep.abi, unirepContract.address, attester)
            const tx = await unirepContractCalledByAttester.attesterSignUp()
            const receipt = await tx.wait()

            expect(receipt.status).equal(1)

            const attesterId = await unirepContract.attesters(attesterAddress)
            expect(1).equal(attesterId)
            const nextAttesterId_ = await unirepContract.nextAttesterId()
            // nextAttesterId starts with 1 so now it should be 2
            expect(2).equal(nextAttesterId_)
        })

        it('sign up via relayer should succeed', async () => {
            let relayer = accounts[0]
            attester2 = accounts[2]
            attester2Address = await attester2.getAddress()

            let message = ethers.utils.solidityKeccak256(["address", "address"], [attester2Address, unirepContract.address])
            attester2Sig = await attester2.signMessage(ethers.utils.arrayify(message))
            const tx = await unirepContract.attesterSignUpViaRelayer(attester2Address, attester2Sig)
            const receipt = await tx.wait()
            
            expect(receipt.status).equal(1)

            const attesterId = await unirepContract.attesters(attester2Address)
            expect(2).equal(attesterId)
            const nextAttesterId_ = await unirepContract.nextAttesterId()
            expect(3).equal(nextAttesterId_)
        })

        it('sign up with invalid signature should fail', async () => {
            let attester3 = accounts[3]
            let attester3Address = await attester3.getAddress()
            await expect(unirepContract.attesterSignUpViaRelayer(attester3Address, attester2Sig))
                .to.be.revertedWith('Unirep: invalid attester sign up signature')
        })

        it('double sign up should fail', async () => {
            await expect(unirepContractCalledByAttester.attesterSignUp())
                .to.be.revertedWith('Unirep: attester has already signed up')

            await expect(unirepContract.attesterSignUpViaRelayer(attester2Address, attester2Sig))
                .to.be.revertedWith('Unirep: attester has already signed up')
        })
    })
})