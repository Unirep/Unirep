// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumberish, ethers } from 'ethers'
import { expect } from 'chai'
import {
    genRandomSalt,
    hashLeftRight,
    IncrementalMerkleTree,
    SNARK_FIELD_SIZE,
    ZkIdentity,
} from '@unirep/crypto'
import { Circuit, GLOBAL_STATE_TREE_DEPTH } from '@unirep/circuits'
import { deployUnirep, Unirep } from '../src'

import {
    genEpochKey,
    Attestation,
    genEpochKeyCircuitInput,
    genInputForContract,
} from './utils'

describe('Attesting', () => {
    let unirepContract: Unirep
    let accounts: ethers.Signer[]

    let userId, userCommitment
    let attester, attesterAddress, attesterId
    let attester2

    const signedUpInLeaf = 1
    const proof: string[] = []
    for (let i = 0; i < 8; i++) {
        proof.push('0')
    }
    const epoch = 1
    const nonce = 0
    const leafIndex = 0
    let tree, stateRoot
    let epochKeyProof
    let epochKeyProofIndex
    const senderPfIdx = 0
    const attestingFee = ethers.utils.parseEther('1')

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], {
            attestingFee,
        })

        console.log('User sign up')
        userId = new ZkIdentity()
        userCommitment = userId.genIdentityCommitment()
        let tx = await unirepContract.userSignUp(userCommitment)
        let receipt = await tx.wait()
        expect(receipt.status).equal(1)

        console.log('Attesters sign up')
        attester = accounts[1]
        attesterAddress = attester.address

        tx = await unirepContract.connect(attester).attesterSignUp()
        receipt = await tx.wait()
        expect(receipt.status).equal(1)
        attesterId = await unirepContract.attesters(attesterAddress)
        // Sign up another attester
        attester2 = accounts[2]

        tx = await unirepContract.connect(attester2).attesterSignUp()
        receipt = await tx.wait()
        expect(receipt.status).equal(1)

        tree = new IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
        stateRoot = genRandomSalt()
        const hashedStateLeaf = hashLeftRight(
            userCommitment.toString(),
            stateRoot.toString()
        )
        tree.insert(BigInt(hashedStateLeaf.toString()))
    })

    it('submit an epoch key proof should succeed', async () => {
        const circuitInputs = genEpochKeyCircuitInput(
            userId,
            tree,
            leafIndex,
            stateRoot,
            epoch,
            nonce
        )
        epochKeyProof = await genInputForContract(
            Circuit.verifyEpochKey,
            circuitInputs
        )
        expect(await epochKeyProof.verify()).to.be.true
        const tx = await unirepContract.submitEpochKeyProof(
            epochKeyProof.publicSignals,
            epochKeyProof.proof
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const proofNullifier = epochKeyProof.hash()
        epochKeyProofIndex = await unirepContract.getProofIndex(proofNullifier)
        expect(epochKeyProof).not.equal(null)
    })

    it('submit an epoch key proof again should fail', async () => {
        await expect(
            unirepContract.submitEpochKeyProof(
                epochKeyProof.publicSignals,
                epochKeyProof.proof
            )
        ).to.be.revertedWithCustomError(unirepContract, 'NullifierAlreadyUsed')
    })

    it('submit an epoch key proof with wrong epoch should fail', async () => {
        const circuitInputs = genEpochKeyCircuitInput(
            userId,
            tree,
            leafIndex,
            stateRoot,
            epoch + 1,
            nonce
        )
        const { publicSignals, proof: _proof } = await genInputForContract(
            Circuit.verifyEpochKey,
            circuitInputs
        )
        await expect(
            unirepContract.submitEpochKeyProof(publicSignals, _proof)
        ).to.be.revertedWithCustomError(unirepContract, 'EpochNotMatch')
    })

    it('submit a wrong epoch key proof should fail', async () => {
        await expect(
            unirepContract.submitEpochKeyProof(
                epochKeyProof.publicSignals,
                proof
            )
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidProof')
    })

    it('submit attestation should succeed', async () => {
        let nonce = 0
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let attestation: Attestation = new Attestation(
            BigInt(attesterId),
            BigInt(1),
            BigInt(0),
            genRandomSalt(),
            BigInt(signedUpInLeaf)
        )

        // Assert no attesting fees are collected yet
        expect(await unirepContract.collectedAttestingFee()).to.be.equal(0)
        const tx = await unirepContract
            .connect(attester)
            .submitAttestation(
                attestation,
                epochKey as BigNumberish,
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
        let nonce = 0
        // Same identity nullifier, epoch and nonce will result in the same epoch key
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let attestation: Attestation = new Attestation(
            BigInt(attesterId),
            BigInt(0),
            BigInt(1000),
            genRandomSalt(),
            BigInt(signedUpInLeaf)
        )
        const tx = await unirepContract
            .connect(attester)
            .submitAttestation(
                attestation,
                epochKey as BigNumberish,
                epochKeyProofIndex,
                senderPfIdx,
                { value: attestingFee }
            )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
    })

    it('attestation with incorrect attesterId should fail', async () => {
        // Increment nonce to get different epoch key
        let nonce = 1
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let attestation: Attestation = new Attestation(
            BigInt(999),
            BigInt(1),
            BigInt(0),
            genRandomSalt(),
            BigInt(signedUpInLeaf)
        )
        await expect(
            unirepContract
                .connect(attester)
                .submitAttestation(
                    attestation,
                    epochKey as BigNumberish,
                    epochKeyProofIndex,
                    senderPfIdx,
                    { value: attestingFee }
                )
        ).to.be.revertedWithCustomError(unirepContract, `AttesterIdNotMatch`)
    })

    it('attestation with invalid repuation should fail', async () => {
        // Increment nonce to get different epoch key
        let nonce = 1
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let attestation: Attestation = new Attestation(
            BigInt(attesterId),
            SNARK_FIELD_SIZE,
            BigInt(0),
            genRandomSalt(),
            BigInt(signedUpInLeaf)
        )
        await expect(
            unirepContract
                .connect(attester)
                .submitAttestation(
                    attestation,
                    epochKey as BigNumberish,
                    epochKeyProofIndex,
                    senderPfIdx,
                    { value: attestingFee }
                )
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidSNARKField')

        attestation = new Attestation(
            BigInt(attesterId),
            BigInt(1),
            SNARK_FIELD_SIZE,
            genRandomSalt(),
            BigInt(signedUpInLeaf)
        )
        await expect(
            unirepContract
                .connect(attester)
                .submitAttestation(
                    attestation,
                    epochKey as BigNumberish,
                    epochKeyProofIndex,
                    senderPfIdx,
                    { value: attestingFee }
                )
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidSNARKField')

        attestation = new Attestation(
            BigInt(attesterId),
            BigInt(1),
            BigInt(0),
            SNARK_FIELD_SIZE,
            BigInt(signedUpInLeaf)
        )
        await expect(
            unirepContract
                .connect(attester)
                .submitAttestation(
                    attestation,
                    epochKey as BigNumberish,
                    epochKeyProofIndex,
                    senderPfIdx,
                    { value: attestingFee }
                )
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidSNARKField')

        attestation = new Attestation(
            BigInt(attesterId),
            BigInt(1),
            BigInt(0),
            genRandomSalt(),
            genRandomSalt()
        )
        await expect(
            unirepContract
                .connect(attester)
                .submitAttestation(
                    attestation,
                    epochKey as BigNumberish,
                    epochKeyProofIndex,
                    senderPfIdx,
                    { value: attestingFee }
                )
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidSignUpFlag')
    })

    it('attestation with zero proof index should fail', async () => {
        // Increment nonce to get different epoch key
        let nonce = 1
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        const zeroEpochKeyProofIndex = 0
        let attestation: Attestation = new Attestation(
            BigInt(attesterId),
            BigInt(1),
            BigInt(0),
            genRandomSalt(),
            BigInt(signedUpInLeaf)
        )
        await expect(
            unirepContract
                .connect(attester)
                .submitAttestation(
                    attestation,
                    epochKey as BigNumberish,
                    zeroEpochKeyProofIndex,
                    senderPfIdx,
                    { value: attestingFee }
                )
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidProofIndex')
    })

    it('attestation with non-existed proof index should fail', async () => {
        // Increment nonce to get different epoch key
        let nonce = 1
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        const nonExistedProofIndex = 5
        let attestation: Attestation = new Attestation(
            BigInt(attesterId),
            BigInt(1),
            BigInt(0),
            genRandomSalt(),
            BigInt(signedUpInLeaf)
        )
        await expect(
            unirepContract
                .connect(attester)
                .submitAttestation(
                    attestation,
                    epochKey as BigNumberish,
                    nonExistedProofIndex,
                    senderPfIdx,
                    { value: attestingFee }
                )
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidProofIndex')
    })

    it('submit attestation with incorrect fee amount should fail', async () => {
        // Increment nonce to get different epoch key
        let nonce = 1
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let attestation: Attestation = new Attestation(
            BigInt(attesterId),
            BigInt(1),
            BigInt(0),
            genRandomSalt(),
            BigInt(signedUpInLeaf)
        )
        await expect(
            unirepContract
                .connect(attester)
                .submitAttestation(
                    attestation,
                    epochKey as BigNumberish,
                    epochKeyProofIndex,
                    senderPfIdx
                )
        ).to.be.revertedWithCustomError(unirepContract, 'AttestingFeeInvalid')
        await expect(
            unirepContract
                .connect(attester)
                .submitAttestation(
                    attestation,
                    epochKey as BigNumberish,
                    epochKeyProofIndex,
                    senderPfIdx,
                    { value: attestingFee.sub(1) }
                )
        ).to.be.revertedWithCustomError(unirepContract, 'AttestingFeeInvalid')
    })

    it('attestation from unregistered attester should fail', async () => {
        let nonAttester = accounts[5]
        let nonAttesterAddress = await nonAttester.getAddress()
        let nonAttesterId = (
            await unirepContract.attesters(nonAttesterAddress)
        ).toBigInt()
        expect((0).toString()).equal(nonAttesterId.toString())

        let unirepContractCalledByNonAttester =
            unirepContract.connect(nonAttester)
        let nonce = 0
        let epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        let attestation: Attestation = new Attestation(
            BigInt(nonAttesterId),
            BigInt(0),
            BigInt(1),
            genRandomSalt(),
            BigInt(signedUpInLeaf)
        )
        await expect(
            unirepContractCalledByNonAttester.submitAttestation(
                attestation,
                ethers.BigNumber.from(epochKey),
                epochKeyProofIndex,
                senderPfIdx,
                { value: attestingFee }
            )
        ).to.be.revertedWithCustomError(unirepContract, `AttesterNotSignUp`)
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

    it('gst attestation from unregistered attester should fail', async () => {
        const nonAttester = accounts[5]
        const nonAttesterAddress = await nonAttester.getAddress()
        const nonAttesterId = (
            await unirepContract.attesters(nonAttesterAddress)
        ).toBigInt()
        expect((0).toString()).equal(nonAttesterId.toString())

        const unirepContractCalledByNonAttester =
            unirepContract.connect(nonAttester)
        const nonce = 0
        const epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        const attestation: Attestation = new Attestation(
            BigInt(nonAttesterId),
            BigInt(0),
            BigInt(1),
            genRandomSalt(),
            BigInt(signedUpInLeaf)
        )
        await expect(
            unirepContractCalledByNonAttester.submitGSTAttestation(
                attestation,
                ethers.BigNumber.from(epochKey),
                0,
                { value: attestingFee }
            )
        ).to.be.revertedWithCustomError(unirepContract, `AttesterNotSignUp`)
    })

    it('gst attestation with incorrect attesterId should fail', async () => {
        // Increment nonce to get different epoch key
        const nonce = 1
        const epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        const attestation: Attestation = new Attestation(
            BigInt(999),
            BigInt(1),
            BigInt(0),
            genRandomSalt(),
            BigInt(signedUpInLeaf)
        )
        await expect(
            unirepContract
                .connect(attester)
                .submitGSTAttestation(
                    attestation,
                    epochKey as BigNumberish,
                    0,
                    { value: attestingFee }
                )
        ).to.be.revertedWithCustomError(unirepContract, `AttesterIdNotMatch`)
    })

    it('gst attestation with invalid epoch key should fail', async () => {
        // Increment nonce to get different epoch key
        const attestation: Attestation = new Attestation(
            BigInt(attesterId),
            BigInt(1),
            BigInt(0),
            genRandomSalt(),
            BigInt(signedUpInLeaf)
        )
        await expect(
            unirepContract
                .connect(attester)
                .submitGSTAttestation(
                    attestation,
                    '0xffffffffffffffffffffffffffffff',
                    0,
                    { value: attestingFee }
                )
        ).to.be.revertedWithCustomError(unirepContract, `InvalidEpochKey`)
    })

    it('submit gst attestation should succeed', async () => {
        const nonce = 0
        const epochKey = genEpochKey(userId.identityNullifier, epoch, nonce)
        const attestation: Attestation = new Attestation(
            BigInt(attesterId),
            BigInt(1),
            BigInt(0),
            genRandomSalt(),
            BigInt(signedUpInLeaf)
        )
        const startAttestingFees = await unirepContract.collectedAttestingFee()
        await unirepContract
            .connect(attester)
            .submitGSTAttestation(attestation, epochKey as BigNumberish, 0, {
                value: attestingFee,
            })
            .then((t) => t.wait())
        // Verify attesting fee is collected
        expect(await unirepContract.collectedAttestingFee()).to.be.equal(
            startAttestingFees.add(attestingFee)
        )
    })
})
