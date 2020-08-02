import { ethers } from "@nomiclabs/buidler"
import { Signer, Wallet } from "ethers"
import chai from "chai"
import { solidity } from "ethereum-waffle"
import { attestingFee} from '../config/testLocal'
import { genRandomSalt } from '../crypto/crypto'
import { genIdentity, genIdentityCommitment } from '../crypto/idendity'
import { deployUnirep, genEpochKey } from './utils'

chai.use(solidity)
const { expect } = chai

import Unirep from "../artifacts/Unirep.json"


describe('Attesting', () => {
    let unirepContract

    let accounts: Signer[]

    let userId, userCommitment

    let attester, attesterAddress, attesterId, unirepContractCalledByAttester

    before(async () => {
        accounts = await ethers.getSigners()

        unirepContract = await deployUnirep(<Wallet>accounts[0])

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
        let attestation = {
            attesterId: attesterId.toString(),
            posRep: 1,
            negRep: 0,
            graffiti: genRandomSalt().toString(),
            overwriteGraffiti: true,
        }
        const tx = await unirepContractCalledByAttester.submitAttestation(
            attestation,
            epochKey,
            {value: attestingFee}
        )
        const receipt = await tx.wait()

        expect(receipt.status).equal(1)

        // Verify attestation hash chain
        let attestationHashChain = ethers.utils.solidityKeccak256(
            ["bytes", "bytes32"],
            [
                ethers.utils.solidityPack(
                    ["uint256", "uint256", "uint256", "uint256", "bool"],
                    [
                        attestation.attesterId,
                        attestation.posRep,
                        attestation.negRep,
                        attestation.graffiti,
                        attestation.overwriteGraffiti
                    ]
                ),
                ethers.utils.hexZeroPad("0x", 32)
            ]
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
        let attestation = {
            attesterId: attesterId.toString(),
            posRep: 0,
            negRep: 1000,
            graffiti: genRandomSalt().toString(),
            overwriteGraffiti: true,
        }
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
        let attestation = {
            attesterId: 999,
            posRep: 1,
            negRep: 0,
            graffiti: genRandomSalt().toString(),
            overwriteGraffiti: true,
        }
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
        let attestation = {
            attesterId: attesterId.toString(),
            posRep: 1,
            negRep: 0,
            graffiti: genRandomSalt().toString(),
            overwriteGraffiti: true,
        }
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
        let attestation = {
            attesterId: nonAttesterId.toString(),
            posRep: 0,
            negRep: 1,
            graffiti: genRandomSalt().toString(),
            overwriteGraffiti: true,
        }
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
        let attestation = {
            attesterId: attester2Id.toString(),
            posRep: 0,
            negRep: 1,
            graffiti: genRandomSalt().toString(),
            overwriteGraffiti: true,
        }
        tx = await unirepContractCalledByAttester2.submitAttestation(
            attestation,
            epochKey,
            {value: attestingFee}
        )
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // Verify attestation hash chain
        let attestationHashChainAfter = await unirepContract.epochKeyHashchain(epochKey)
        let attestationHashChain = ethers.utils.solidityKeccak256(
            ["bytes", "bytes32"],
            [
                ethers.utils.solidityPack(
                    ["uint256", "uint256", "uint256", "uint256", "bool"],
                    [
                        attestation.attesterId,
                        attestation.posRep,
                        attestation.negRep,
                        attestation.graffiti,
                        attestation.overwriteGraffiti
                    ]
                ),
                attestationHashChainBefore
            ]
        )
        expect(attestationHashChain).equal(attestationHashChainAfter)

        // Verify epoch key is NOT added into epoch key list again
        let numEpochKey = await unirepContract.getNumEpochKey(epoch)
        expect(numEpochKey).equal(1)
    })
})