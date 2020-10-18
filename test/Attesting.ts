import { ethers } from "@nomiclabs/buidler"
import { Signer, Wallet } from "ethers"
import chai from "chai"
import { solidity } from "ethereum-waffle"
import { attestingFee } from '../config/testLocal'
import { genRandomSalt, hashLeftRight } from '../crypto/crypto'
import { genIdentity, genIdentityCommitment } from 'libsemaphore'
import { deployUnirep, genEpochKey, getTreeDepthsForTesting } from './utils'

chai.use(solidity)
const { expect } = chai

import Unirep from "../artifacts/Unirep.json"
import { Attestation } from "../core"


describe('Attesting', () => {
    let unirepContract

    let accounts: Signer[]

    let userId, userCommitment

    let attester, attesterAddress, attesterId, unirepContractCalledByAttester

    before(async () => {
        accounts = await ethers.getSigners()

        const _treeDepths = getTreeDepthsForTesting()
        unirepContract = await deployUnirep(<Wallet>accounts[0], _treeDepths)

        console.log('User sign up')
        userId = genIdentity()
        userCommitment = genIdentityCommitment(userId)
        let tx = await unirepContract.userSignUp(userCommitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        console.log('Attester sign up')
        attester = accounts[1]
        attesterAddress = await attester.getAddress()
        unirepContractCalledByAttester = await ethers.getContractAt(Unirep.abi, unirepContract.address, attester)
        tx = await unirepContractCalledByAttester.attesterSignUp()
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        attesterId = await unirepContract.attesters(attesterAddress)
    })

    it('submit attestation should succeed', async () => {
        let epoch = await unirepContract.currentEpoch()
        let nonce = 0
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let attestation: Attestation = new Attestation(
            attesterId.toNumber(),
            1,
            0,
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
            attesterId.toNumber(),
            0,
            1000,
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
            1,
            0,
            genRandomSalt(),
            true,
        )
        await expect(unirepContractCalledByAttester.submitAttestation(
            attestation,
            epochKey,
            {value: attestingFee})
        ).to.be.revertedWith('Unirep: mismatched attesterId')
    })

    it('submit attestation with incorrect fee amount should fail', async () => {
        let epoch = await unirepContract.currentEpoch()
        // Increment nonce to get different epoch key
        let nonce = 1
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let attestation: Attestation = new Attestation(
            attesterId.toNumber(),
            1,
            0,
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
        let nonAttester = accounts[2]
        let nonAttesterAddress = await nonAttester.getAddress()
        let nonAttesterId = await unirepContract.attesters(nonAttesterAddress)
        expect((0).toString()).equal(nonAttesterId.toString())

        let unirepContractCalledByNonAttester = await ethers.getContractAt(Unirep.abi, unirepContract.address, nonAttester)
        let epoch = await unirepContract.currentEpoch()
        let nonce = 0
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let attestation: Attestation = new Attestation(
            nonAttesterId.toNumber(),
            0,
            1,
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
        // Sign up another attester
        let attester2 = accounts[2]
        let attester2Address = await attester2.getAddress()
        let unirepContractCalledByAttester2 = await ethers.getContractAt(Unirep.abi, unirepContract.address, attester2)
        let tx = await unirepContractCalledByAttester2.attesterSignUp()
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // Get the latest hash chain before submitting this attestation.
        // The hash chain should include only attester1's attestation.
        let epoch = await unirepContract.currentEpoch()
        let nonce = 0
        // Same identity nullifier, epoch and nonce will result in the same epoch key
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let attestationHashChainBefore = await unirepContract.epochKeyHashchain(epochKey)

        let attester2Id = await unirepContract.attesters(attester2Address)
        let attestation: Attestation = new Attestation(
            attester2Id.toNumber(),
            0,
            1,
            genRandomSalt(),
            true,
        )
        tx = await unirepContractCalledByAttester2.submitAttestation(
            attestation,
            epochKey,
            {value: attestingFee}
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

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

    it('burn collected attesting fee should work', async () => {
        expect(await unirepContract.collectedAttestingFee()).to.be.equal(attestingFee.mul(2))
        await unirepContractCalledByAttester.burnAttestingFee()
        expect(await unirepContract.collectedAttestingFee()).to.be.equal(0)
        expect(await ethers.provider.getBalance(unirepContract.address)).to.equal(0)
    })
})