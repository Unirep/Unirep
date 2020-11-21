import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import chai from "chai"
import { attestingFee, epochLength } from '../../config/testLocal'
import { genRandomSalt, hashLeftRight } from '../../crypto/crypto'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { deployUnirep, genEpochKey, getTreeDepthsForTesting } from '../utils'

const { expect } = chai

import Unirep from "../../artifacts/contracts/Unirep.sol/Unirep.json"


describe('Epoch Transition', () => {
    let unirepContract: ethers.Contract

    let accounts: ethers.Signer[]

    let userId, userCommitment

    let attester, attesterAddress, attesterId, unirepContractCalledByAttester

    let numEpochKey

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting()
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths)

        console.log('User sign up')
        userId = genIdentity()
        userCommitment = genIdentityCommitment(userId)
        let tx = await unirepContract.userSignUp(userCommitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        console.log('Attester sign up')
        attester = accounts[1]
        attesterAddress = await attester.getAddress()
        unirepContractCalledByAttester = await hardhatEthers.getContractAt(Unirep.abi, unirepContract.address, attester)
        tx = await unirepContractCalledByAttester.attesterSignUp()
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        attesterId = await unirepContract.attesters(attesterAddress)

        // Submit 2 attestations
        let epoch = await unirepContract.currentEpoch()
        let nonce = 0
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let attestation = {
            attesterId: attesterId.toString(),
            posRep: 1,
            negRep: 0,
            graffiti: genRandomSalt().toString(),
            overwriteGraffiti: true,
        }
        tx = await unirepContractCalledByAttester.submitAttestation(
            attestation,
            epochKey,
            {value: attestingFee}
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        
        nonce = 1
        epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        attestation = {
            attesterId: attesterId.toString(),
            posRep: 0,
            negRep: 99,
            graffiti: genRandomSalt().toString(),
            overwriteGraffiti: true,
        }
        tx = await unirepContractCalledByAttester.submitAttestation(
            attestation,
            epochKey,
            {value: attestingFee}
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        numEpochKey = await unirepContract.getNumEpochKey(epoch)
        expect(numEpochKey).equal(2)
    })

    it('premature epoch transition should fail', async () => {
        const numEpochKeysToSeal = numEpochKey
        await expect(unirepContract.beginEpochTransition(numEpochKeysToSeal)
            ).to.be.revertedWith('Unirep: epoch not yet ended')
    })

    it('epoch transition should succeed', async () => {
        // Record data before epoch transition so as to compare them with data after epoch transition
        let epoch = await unirepContract.currentEpoch()
        let epochKeyHashchainMap = {}
        let epochKey_, hashChainBefore
        for (let i = 0; i < numEpochKey; i++) {
            epochKey_ = await unirepContract.getEpochKey(epoch, i)
            hashChainBefore = await unirepContract.epochKeyHashchain(epochKey_)
            epochKeyHashchainMap[epochKey_] = hashChainBefore
        }

        // Fast-forward epochLength of seconds
        await hardhatEthers.provider.send("evm_increaseTime", [epochLength])
        // Assert no epoch transition compensation is dispensed to volunteer
        expect(await unirepContract.epochTransitionCompensation(attesterAddress)).to.be.equal(0)
        // Begin epoch transition but only seal hash chain of one epoch key
        let numEpochKeysToSeal = numEpochKey.sub(1)
        let tx = await unirepContractCalledByAttester.beginEpochTransition(numEpochKeysToSeal)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)
        console.log("Gas cost of sealing one epoch key:", receipt.gasUsed.toString())
        expect(await unirepContract.getNumSealedEpochKey(epoch)).to.be.equal(1)
        // Verify compensation to the volunteer increased
        expect(await unirepContract.epochTransitionCompensation(attesterAddress)).to.gt(0)

        // Complete epoch transition by sealing hash chain of the rest of the epoch keys
        const prevAttesterCompensation = await unirepContract.epochTransitionCompensation(attesterAddress)
        numEpochKeysToSeal = numEpochKey
        tx = await unirepContractCalledByAttester.beginEpochTransition(numEpochKeysToSeal)
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        console.log("Gas cost of sealing hash chain of the rest of the epoch key and complete epoch transition:", receipt.gasUsed.toString())
        expect(await unirepContract.getNumSealedEpochKey(epoch)).to.be.equal(numEpochKey)
        expect(await unirepContract.currentEpoch()).to.be.equal(epoch.add(1))
        // Verify compensation to the volunteer increased
        expect(await unirepContract.epochTransitionCompensation(attesterAddress)).to.gt(prevAttesterCompensation)
        let [epochKeys_, epochKeyHashchains_] = await unirepContract.getEpochTreeLeaves(epoch)
        epochKeys_ = epochKeys_.map((epk) => epk.toString())
        expect(epochKeys_.length).to.be.equal(numEpochKey)

        // Verify each epoch key hash chain is sealed
        let hashChainAfter
        let sealedHashChain
        let epkIndex
        for (epochKey_ in epochKeyHashchainMap) {
            sealedHashChain = hashLeftRight(
                BigInt(1),
                epochKeyHashchainMap[epochKey_]
            )
            hashChainAfter = await unirepContract.epochKeyHashchain(epochKey_)
            expect(hashChainAfter).equal(sealedHashChain)

            // Check that epoch keys and hashchains also match the ones in epoch tree
            epkIndex = epochKeys_.indexOf(epochKey_)
            expect(epkIndex >= 0).to.be.true
            expect(epochKeyHashchains_[epkIndex]).to.be.equal(sealedHashChain)
        }

        // Verify latestEpochTransitionTime and currentEpoch
        let latestEpochTransitionTime = await unirepContract.latestEpochTransitionTime()
        expect(latestEpochTransitionTime).equal((await hardhatEthers.provider.getBlock(receipt.blockNumber)).timestamp)

        let epoch_ = await unirepContract.currentEpoch()
        expect(epoch_).equal(epoch.add(1))
    })

    it('attesting to a sealed epoch key should fail', async () => {
        let attestation = {
            attesterId: attesterId.toString(),
            posRep: 1,
            negRep: 0,
            graffiti: genRandomSalt().toString(),
            overwriteGraffiti: true,
        }

        let prevEpoch = (await unirepContract.currentEpoch()).sub(1)
        let numEpochKey = await unirepContract.getNumEpochKey(prevEpoch)
        for (let i = 0; i < numEpochKey; i++) {
            let epochKey_ = await unirepContract.getEpochKey(prevEpoch, i)

            await expect(unirepContractCalledByAttester.submitAttestation(
                attestation,
                epochKey_,
                {value: attestingFee}
            )).to.be.revertedWith('Unirep: hash chain of this epoch key has been sealed')
        }
    })

    it('epoch transition with no attestations and epoch keys should also succeed', async () => {
        let epoch = await unirepContract.currentEpoch()
        let numEpochKey = await unirepContract.getNumEpochKey(epoch)
        expect(numEpochKey).equal(0)

        // Fast-forward epochLength of seconds
        await hardhatEthers.provider.send("evm_increaseTime", [epochLength])
        // Begin epoch transition
        const numEpochKeysToSeal = await unirepContract.getNumEpochKey(epoch)
        let tx = await unirepContract.beginEpochTransition(numEpochKeysToSeal)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // Verify latestEpochTransitionTime and currentEpoch
        let latestEpochTransitionTime = await unirepContract.latestEpochTransitionTime()
        expect(latestEpochTransitionTime).equal((await hardhatEthers.provider.getBlock(receipt.blockNumber)).timestamp)

        let epoch_ = await unirepContract.currentEpoch()
        expect(epoch_).equal(epoch.add(1))
    })

    it('collecting epoch transition compensation should succeed', async () => {
        const compensation = await unirepContract.epochTransitionCompensation(attesterAddress)
        expect(compensation).to.gt(0)
        // Set gas price to 0 so attester will not be charged transaction fee
        await expect(() => unirepContractCalledByAttester.collectEpochTransitionCompensation({gasPrice: 0}))
            .to.changeBalance(attester, compensation)
        expect(await unirepContract.epochTransitionCompensation(attesterAddress)).to.equal(0)
    })
})