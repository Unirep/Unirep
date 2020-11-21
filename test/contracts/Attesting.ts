import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import chai from "chai"
import { attestingFee, epochLength, maxUsers, numEpochKeyNoncePerEpoch } from '../../config/testLocal'
import { genRandomSalt, hashLeftRight, SNARK_FIELD_SIZE } from '../../crypto/crypto'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { deployUnirep, genEpochKey, getTreeDepthsForTesting } from '../utils'

const { expect } = chai

import Unirep from "../../artifacts/contracts/Unirep.sol/Unirep.json"
import { Attestation } from "../../core"


describe('Attesting', () => {
    let unirepContract

    let accounts: ethers.Signer[]

    let userId, userCommitment

    let attester, attesterAddress, attesterId, unirepContractCalledByAttester
    let attester2, attester2Address, attester2Id, unirepContractCalledByAttester2


    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting()
        // Set numAttestationsPerEpochKey to 2
        const _settings = {
            maxUsers: maxUsers,
            numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
            numAttestationsPerEpochKey: 2,
            epochLength: epochLength,
            attestingFee: attestingFee
        }
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths, _settings)

        console.log('User sign up')
        userId = genIdentity()
        userCommitment = genIdentityCommitment(userId)
        let tx = await unirepContract.userSignUp(userCommitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        console.log('Attesters sign up')
        attester = accounts[1]
        attesterAddress = await attester.getAddress()
        unirepContractCalledByAttester = unirepContract.connect(attester)
        tx = await unirepContractCalledByAttester.attesterSignUp()
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        attesterId = await unirepContract.attesters(attesterAddress)
        // Sign up another attester
        attester2 = accounts[2]
        attester2Address = await attester2.getAddress()
        unirepContractCalledByAttester2 = unirepContract.connect(attester2)
        tx = await unirepContractCalledByAttester2.attesterSignUp()
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        attester2Id = await unirepContract.attesters(attester2Address)
    })

    it('submit attestation should succeed', async () => {
        let epoch = await unirepContract.currentEpoch()
        let nonce = 0
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let attestation: Attestation = new Attestation(
            BigInt(attesterId),
            BigInt(1),
            BigInt(0),
            genRandomSalt(),
            true,
        )
        // Assert no attesting fees are collected yet
        expect(await unirepContract.collectedAttestingFee()).to.be.equal(0)
        const tx = await unirepContractCalledByAttester.submitAttestation(
            attestation,
            epochKey,
            {value: attestingFee}
        )
        const receipt = await tx.wait()

        expect(receipt.status).equal(1)

        // Verify attesting fee is collected
        expect(await unirepContract.collectedAttestingFee()).to.be.equal(attestingFee)

        // Verify attestation hash chain
        let attestationHashChain = hashLeftRight(
            attestation.hash(),
            BigInt(0)
        )
        let attestationHashChain_ = await unirepContract.epochKeyHashchain(epochKey)
        expect(attestationHashChain).equal(attestationHashChain_)

        // Verify the number of attestations to the epoch key
        let numAttestationsToEpochKey_ = await unirepContract.numAttestationsToEpochKey(epochKey)
        expect(numAttestationsToEpochKey_).equal(1)
        // Verify epoch key is added to epoch key list
        let numEpochKey = await unirepContract.getNumEpochKey(epoch)
        expect(numEpochKey).equal(1)
        let epochKey_ = await unirepContract.getEpochKey(epoch, 0)
        expect(epochKey).equal(epochKey_)
    })

    it('attest to same epoch key again should fail', async () => {
        let epoch = await unirepContract.currentEpoch()
        let nonce = 0
        // Same identity nullifier, epoch and nonce will result in the same epoch key
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let attestation: Attestation = new Attestation(
            BigInt(attesterId),
            BigInt(0),
            BigInt(1000),
            genRandomSalt(),
            true,
        )
        await expect(unirepContractCalledByAttester.submitAttestation(
            attestation,
            epochKey,
            {value: attestingFee})
        ).to.be.revertedWith('Unirep: attester has already attested to this epoch key')
    })

    it('attestation with incorrect attesterId should fail', async () => {
        let epoch = await unirepContract.currentEpoch()
        // Increment nonce to get different epoch key
        let nonce = 1
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let attestation: Attestation = new Attestation(
            BigInt(999),
            BigInt(1),
            BigInt(0),
            genRandomSalt(),
            true,
        )
        await expect(unirepContractCalledByAttester.submitAttestation(
            attestation,
            epochKey,
            {value: attestingFee})
        ).to.be.revertedWith('Unirep: mismatched attesterId')
    })

    it('attestation with invalid repuation should fail', async () => {
        let epoch = await unirepContract.currentEpoch()
        // Increment nonce to get different epoch key
        let nonce = 1
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let attestation: Attestation = new Attestation(
            BigInt(attesterId),
            SNARK_FIELD_SIZE,
            BigInt(0),
            genRandomSalt(),
            true,
        )
        await expect(unirepContractCalledByAttester.submitAttestation(
            attestation,
            epochKey,
            {value: attestingFee})
        ).to.be.revertedWith('Unirep: invalid attestation posRep')

        attestation = new Attestation(
            BigInt(attesterId),
            BigInt(1),
            SNARK_FIELD_SIZE,
            genRandomSalt(),
            true,
        )
        await expect(unirepContractCalledByAttester.submitAttestation(
            attestation,
            epochKey,
            {value: attestingFee})
        ).to.be.revertedWith('Unirep: invalid attestation negRep')

        attestation = new Attestation(
            BigInt(attesterId),
            BigInt(1),
            BigInt(0),
            SNARK_FIELD_SIZE,
            true,
        )
        await expect(unirepContractCalledByAttester.submitAttestation(
            attestation,
            epochKey,
            {value: attestingFee})
        ).to.be.revertedWith('Unirep: invalid attestation graffiti')
    })

    it('submit attestation with incorrect fee amount should fail', async () => {
        let epoch = await unirepContract.currentEpoch()
        // Increment nonce to get different epoch key
        let nonce = 1
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let attestation: Attestation = new Attestation(
            BigInt(attesterId),
            BigInt(1),
            BigInt(0),
            genRandomSalt(),
            true,
        )
        await expect(unirepContractCalledByAttester.submitAttestation(attestation, epochKey))
            .to.be.revertedWith('Unirep: no attesting fee or incorrect amount')
        await expect(unirepContractCalledByAttester.submitAttestation(
            attestation,
            epochKey,
            {value: (attestingFee.sub(1))})
        ).to.be.revertedWith('Unirep: no attesting fee or incorrect amount')
        await expect(unirepContractCalledByAttester.submitAttestation(
            attestation,
            epochKey,
            {value: (attestingFee.add(1))})
        ).to.be.revertedWith('Unirep: no attesting fee or incorrect amount')
    })

    it('attestation from unregistered attester should fail', async () => {
        let nonAttester = accounts[5]
        let nonAttesterAddress = await nonAttester.getAddress()
        let nonAttesterId = await unirepContract.attesters(nonAttesterAddress)
        expect((0).toString()).equal(nonAttesterId.toString())

        let unirepContractCalledByNonAttester = await hardhatEthers.getContractAt(Unirep.abi, unirepContract.address, nonAttester)
        let epoch = await unirepContract.currentEpoch()
        let nonce = 0
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let attestation: Attestation = new Attestation(
            BigInt(nonAttesterId),
            BigInt(0),
            BigInt(1),
            genRandomSalt(),
            true,
        )
        await expect(unirepContractCalledByNonAttester.submitAttestation(
            attestation,
            epochKey,
            {value: attestingFee})
        ).to.be.revertedWith('Unirep: attester has not signed up yet')
    })

    it('attestation hash chain should match', async () => {
        // Get the latest hash chain before submitting this attestation.
        // The hash chain should include only attester1's attestation.
        let epoch = await unirepContract.currentEpoch()
        let nonce = 0
        // Same identity nullifier, epoch and nonce will result in the same epoch key
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let attestationHashChainBefore = await unirepContract.epochKeyHashchain(epochKey)

        // Attester2 attest
        let attestation: Attestation = new Attestation(
            BigInt(attester2Id),
            BigInt(0),
            BigInt(1),
            genRandomSalt(),
            true,
        )
        let tx = await unirepContractCalledByAttester2.submitAttestation(
            attestation,
            epochKey,
            {value: attestingFee}
        )
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // Verify the number of attestations to the epoch key
        let numAttestationsToEpochKey_ = await unirepContract.numAttestationsToEpochKey(epochKey)
        expect(numAttestationsToEpochKey_).equal(2)
        // Verify attestation hash chain
        let attestationHashChainAfter = await unirepContract.epochKeyHashchain(epochKey)
        let attestationHashChain = hashLeftRight(
            attestation.hash(),
            attestationHashChainBefore
        )
        expect(attestationHashChain).equal(attestationHashChainAfter)

        // Verify epoch key is NOT added into epoch key list again
        let numEpochKey = await unirepContract.getNumEpochKey(epoch)
        expect(numEpochKey).equal(1)
    })

    it('number of attestations exceeding limit should fail', async () => {
        // Sign up attester3
        let attester3 = accounts[3]
        let attester3Address = await attester3.getAddress()
        let unirepContractCalledByAttester3 = unirepContract.connect(attester3)
        let tx = await unirepContractCalledByAttester3.attesterSignUp()
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        let epoch = await unirepContract.currentEpoch()
        let nonce = 0
        // Same identity nullifier, epoch and nonce will result in the same epoch key
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let attester3Id = await unirepContract.attesters(attester3Address)
        let attestation: Attestation = new Attestation(
            BigInt(attester3Id),
            BigInt(50),
            BigInt(5),
            genRandomSalt(),
            true,
        )
        await expect(unirepContractCalledByAttester3.submitAttestation(
            attestation,
            epochKey,
            {value: attestingFee})
        ).to.be.revertedWith('Unirep: no more attestations to the epoch key is allowed')
    })

    it('burn collected attesting fee should work', async () => {
        expect(await unirepContract.collectedAttestingFee()).to.be.equal(attestingFee.mul(2))
        await unirepContractCalledByAttester.burnAttestingFee()
        expect(await unirepContract.collectedAttestingFee()).to.be.equal(0)
        expect(await hardhatEthers.provider.getBalance(unirepContract.address)).to.equal(0)
    })
})