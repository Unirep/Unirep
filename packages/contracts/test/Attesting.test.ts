// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt, SNARK_FIELD_SIZE } from '@unirep/crypto'

import { attesterSignUp, deploy, genEpochKey, genIdentity } from './utils'
import { config } from './testConfig'
import { Unirep, UnirepTypes } from '../src'

describe('Attesting', () => {
    let unirepContract: Unirep
    let accounts: ethers.Signer[]

    const { id, commitment } = genIdentity()
    let attester, attesterId
    let attester2

    const proof: string[] = []
    for (let i = 0; i < 8; i++) {
        proof.push('0')
    }
    const globalStateTree = genRandomSalt().toString()
    const epoch = 1
    const nonce = 0
    const epochKey = genEpochKey(id.identityNullifier, epoch, nonce).toString()
    const epochKeyProof: UnirepTypes.EpochKeyProofStruct = {
        globalStateTree,
        epoch,
        epochKey,
        proof,
    }
    const graffiti = genRandomSalt().toString()
    const signUp = 1
    let validAttestation: UnirepTypes.AttestationStruct

    let epochKeyProofIndex
    const senderPfIdx = 0
    const attestingFee = config.attestingFee

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deploy(accounts[0], config)

        let tx = await unirepContract.userSignUp(commitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        attester = accounts[1]
        {
            const success = await attesterSignUp(unirepContract, attester)
            expect(success).equal(1)
            attesterId = await unirepContract.attesters(
                await attester.getAddress()
            )
        }
        // Sign up another attester
        {
            attester2 = accounts[2]
            const success = await attesterSignUp(unirepContract, attester2)
            expect(success).equal(1)
        }

        validAttestation = {
            attesterId,
            posRep: 1,
            negRep: 0,
            graffiti,
            signUp,
        }
    })

    it('submit an epoch key proof should succeed', async () => {
        const tx = await unirepContract.submitEpochKeyProof(epochKeyProof)
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const proofNullifier = await unirepContract.hashEpochKeyProof(
            epochKeyProof
        )
        epochKeyProofIndex = await unirepContract.getProofIndex(proofNullifier)
        expect(epochKeyProofIndex).not.equal(0)
    })

    it('submit an epoch key proof again should fail', async () => {
        await expect(
            unirepContract.submitEpochKeyProof(epochKeyProof)
        ).to.be.revertedWith('Unirep: the proof has been submitted before')
    })

    it('submit an epoch key proof with wrong epoch should fail', async () => {
        const wrongEpochKeyProof: UnirepTypes.EpochKeyProofStruct = {
            globalStateTree,
            epoch: epoch + 1,
            epochKey,
            proof,
        }
        await expect(
            unirepContract.submitEpochKeyProof(wrongEpochKeyProof)
        ).to.be.revertedWith(
            'Unirep: submit an epoch key proof with incorrect epoch'
        )
    })

    it('submit an invalid epoch key should fail', async () => {
        const wrongEpochKey = genRandomSalt().toString()
        const wrongEpochKeyProof: UnirepTypes.EpochKeyProofStruct = {
            globalStateTree,
            epoch,
            epochKey: wrongEpochKey,
            proof,
        }
        await expect(
            unirepContract.submitEpochKeyProof(wrongEpochKeyProof)
        ).to.be.revertedWith('Unirep: invalid epoch key range')
    })

    it('submit attestation should succeed', async () => {
        // Assert no attesting fees are collected yet
        expect(await unirepContract.collectedAttestingFee()).to.be.equal(0)
        const tx = await unirepContract
            .connect(attester)
            .submitAttestation(
                validAttestation,
                epochKey,
                epochKeyProofIndex,
                senderPfIdx,
                { value: attestingFee }
            )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        // Verify attesting fee is collected
        expect(await unirepContract.collectedAttestingFee()).to.be.equal(
            attestingFee
        )
    })

    it('attest to same epoch key again should succeed', async () => {
        // Same identity nullifier, epoch and nonce will result in the same epoch key
        const attestation: UnirepTypes.AttestationStruct = {
            attesterId: attesterId,
            posRep: 0,
            negRep: 1000,
            graffiti,
            signUp,
        }
        const tx = await unirepContract
            .connect(attester)
            .submitAttestation(
                attestation,
                epochKey,
                epochKeyProofIndex,
                senderPfIdx,
                { value: attestingFee }
            )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
    })

    it('attestation with incorrect attesterId should fail', async () => {
        // Increment nonce to get different epoch key
        const nonce = 1
        const epochKey = genEpochKey(
            id.identityNullifier,
            epoch,
            nonce
        ).toString()
        const attestation: UnirepTypes.AttestationStruct = {
            attesterId: 999,
            posRep: 1,
            negRep: 0,
            graffiti,
            signUp,
        }
        await expect(
            unirepContract
                .connect(attester)
                .submitAttestation(
                    attestation,
                    epochKey,
                    epochKeyProofIndex,
                    senderPfIdx,
                    { value: attestingFee }
                )
        ).to.be.revertedWith('Unirep: mismatched attesterId')
    })

    it('attestation with invalid repuation should fail', async () => {
        const attestation: UnirepTypes.AttestationStruct = {
            attesterId,
            posRep: 1,
            negRep: 0,
            graffiti,
            signUp,
        }

        {
            attestation.posRep = SNARK_FIELD_SIZE
            await expect(
                unirepContract
                    .connect(attester)
                    .submitAttestation(
                        attestation,
                        epochKey,
                        epochKeyProofIndex,
                        senderPfIdx,
                        { value: attestingFee }
                    )
            ).to.be.revertedWith('Unirep: invalid attestation posRep')
            attestation.posRep = 1
        }

        {
            attestation.negRep = SNARK_FIELD_SIZE
            await expect(
                unirepContract
                    .connect(attester)
                    .submitAttestation(
                        attestation,
                        epochKey,
                        epochKeyProofIndex,
                        senderPfIdx,
                        { value: attestingFee }
                    )
            ).to.be.revertedWith('Unirep: invalid attestation negRep')
            attestation.negRep = 0
        }

        {
            attestation.graffiti = SNARK_FIELD_SIZE
            await expect(
                unirepContract
                    .connect(attester)
                    .submitAttestation(
                        attestation,
                        epochKey,
                        epochKeyProofIndex,
                        senderPfIdx,
                        { value: attestingFee }
                    )
            ).to.be.revertedWith('Unirep: invalid attestation graffiti')
            attestation.graffiti = graffiti
        }

        {
            attestation.signUp = graffiti
            await expect(
                unirepContract
                    .connect(attester)
                    .submitAttestation(
                        attestation,
                        epochKey,
                        epochKeyProofIndex,
                        senderPfIdx,
                        { value: attestingFee }
                    )
            ).to.be.revertedWith('Unirep: invalid sign up flag')
            attestation.signUp = signUp
        }
    })

    it('attestation with zero proof index should fail', async () => {
        const zeroEpochKeyProofIndex = 0
        await expect(
            unirepContract
                .connect(attester)
                .submitAttestation(
                    validAttestation,
                    epochKey,
                    zeroEpochKeyProofIndex,
                    senderPfIdx,
                    { value: attestingFee }
                )
        ).to.be.revertedWith('Unirep: invalid proof index')
    })

    it('attestation with non-existed proof index should fail', async () => {
        const nonExistedProofIndex = 5
        await expect(
            unirepContract
                .connect(attester)
                .submitAttestation(
                    validAttestation,
                    epochKey,
                    nonExistedProofIndex,
                    senderPfIdx,
                    { value: attestingFee }
                )
        ).to.be.revertedWith('Unirep: invalid proof index')
    })

    it('submit attestation with incorrect fee amount should fail', async () => {
        await expect(
            unirepContract
                .connect(attester)
                .submitAttestation(
                    validAttestation,
                    epochKey,
                    epochKeyProofIndex,
                    senderPfIdx
                )
        ).to.be.revertedWith('Unirep: no attesting fee or incorrect amount')
    })

    it('attestation from unregistered attester should fail', async () => {
        const nonAttester = accounts[5]
        const nonAttesterAddress = await nonAttester.getAddress()
        const nonAttesterId = await unirepContract.attesters(nonAttesterAddress)
        expect(nonAttesterId).equal(0)

        await expect(
            unirepContract
                .connect(nonAttester)
                .submitAttestation(
                    validAttestation,
                    epochKey,
                    epochKeyProofIndex,
                    senderPfIdx,
                    { value: attestingFee }
                )
        ).to.be.revertedWith('Unirep: attester has not signed up yet')
    })

    it('burn collected attesting fee should work', async () => {
        expect(await unirepContract.collectedAttestingFee()).to.be.equal(
            attestingFee.mul(2)
        )
        await unirepContract.connect(attester).burnAttestingFee()
        expect(await unirepContract.collectedAttestingFee()).to.be.equal(0)
        expect(
            await hardhatEthers.provider.getBalance(unirepContract.address)
        ).to.equal(0)
    })
})
