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
import { deployUnirep } from '../src/deploy'
import { Unirep } from '../src'

import {
    genEpochKey,
    Attestation,
    genEpochKeyCircuitInput,
    genInputForContract,
    genNewUserStateTree,
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
    const attestingFee = ethers.utils.parseEther('1')

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], {
            attestingFee,
        })

        console.log('User sign up')
        userId = new ZkIdentity()
        userCommitment = userId.genIdentityCommitment()
        let tx = await unirepContract['userSignUp(uint256)'](userCommitment)
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
        stateRoot = genNewUserStateTree().root
        const hashedStateLeaf = hashLeftRight(
            userCommitment.toString(),
            stateRoot.toString()
        )
        tree.insert(BigInt(hashedStateLeaf.toString()))
    })

    it('validate an epoch key proof should succeed', async () => {
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
        await unirepContract.assertValidEpochKeyProof(
            epochKeyProof.publicSignals,
            epochKeyProof.proof
        )
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
            unirepContract.assertValidEpochKeyProof(publicSignals, _proof)
        ).to.be.revertedWithCustomError(unirepContract, 'EpochNotMatch')
    })

    it('submit a wrong epoch key proof should fail', async () => {
        await expect(
            unirepContract.assertValidEpochKeyProof(
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
            .submitAttestation(attestation, epochKey as BigNumberish, {
                value: attestingFee,
            })
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
            .submitAttestation(attestation, epochKey as BigNumberish, {
                value: attestingFee,
            })
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
                .submitAttestation(attestation, epochKey as BigNumberish, {
                    value: attestingFee,
                })
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
                .submitAttestation(attestation, epochKey as BigNumberish, {
                    value: attestingFee,
                })
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
                .submitAttestation(attestation, epochKey as BigNumberish, {
                    value: attestingFee,
                })
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
                .submitAttestation(attestation, epochKey as BigNumberish, {
                    value: attestingFee,
                })
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
                .submitAttestation(attestation, epochKey as BigNumberish, {
                    value: attestingFee,
                })
        ).to.be.revertedWithCustomError(unirepContract, 'InvalidSignUpFlag')
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
                .submitAttestation(attestation, epochKey as BigNumberish)
        ).to.be.revertedWithCustomError(unirepContract, 'AttestingFeeInvalid')
        await expect(
            unirepContract
                .connect(attester)
                .submitAttestation(attestation, epochKey as BigNumberish, {
                    value: attestingFee.sub(1),
                })
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
})
