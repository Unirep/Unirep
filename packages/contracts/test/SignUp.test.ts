// @ts-ignore
import { ethers as hardhatEthers, run } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { ZkIdentity } from '@unirep/crypto'
import {
    EPOCH_LENGTH,
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    USER_STATE_TREE_DEPTH,
} from '@unirep/circuits'

const ATTESTING_FEE = '0'

import { Unirep } from '../src'

describe('Signup', () => {
    const testMaxUser = 5
    let unirepContract: Unirep
    let accounts: any[]

    let signedUpUsers = 0
    let signedUpAttesters = 0

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await run('deploy:Unirep', { 
            maxUsers: testMaxUser,
            maxAttesters: testMaxUser,
        })
    })

    it('should have the correct config value', async () => {
        const config = await unirepContract.config()
        expect(ATTESTING_FEE).equal(config.attestingFee)
        expect(EPOCH_LENGTH).equal(config.epochLength)
        expect(NUM_EPOCH_KEY_NONCE_PER_EPOCH).equal(
            config.numEpochKeyNoncePerEpoch
        )
        expect(testMaxUser).equal(config.maxUsers)
        expect(EPOCH_TREE_DEPTH).equal(config.epochTreeDepth)
        expect(GLOBAL_STATE_TREE_DEPTH).equal(config.globalStateTreeDepth)
        expect(USER_STATE_TREE_DEPTH).equal(config.userStateTreeDepth)
    })

    describe('User sign-ups', () => {
        const id = new ZkIdentity()
        const commitment = id.genIdentityCommitment()

        it('sign up should succeed', async () => {
            const tx = await unirepContract.userSignUp(commitment)
            const receipt = await tx.wait()

            expect(receipt.status).equal(1)
            signedUpUsers++

            const numUserSignUps_ = await unirepContract.numUserSignUps()
            expect(signedUpUsers).equal(numUserSignUps_)
        })

        it('double sign up should fail', async () => {
            await expect(
                unirepContract.userSignUp(commitment)
            ).to.be.revertedWithCustomError(
                unirepContract,
                `UserAlreadySignedUp`
            )
        })

        it('sign up should fail if max capacity reached', async () => {
            for (let i = 1; i < testMaxUser; i++) {
                let tx = await unirepContract.userSignUp(
                    new ZkIdentity().genIdentityCommitment()
                )
                let receipt = await tx.wait()
                expect(receipt.status).equal(1)
                signedUpUsers++

                const numUserSignUps_ = await unirepContract.numUserSignUps()
                expect(signedUpUsers).equal(numUserSignUps_)
            }
            await expect(
                unirepContract.userSignUp(
                    new ZkIdentity().genIdentityCommitment()
                )
            ).to.be.revertedWithCustomError(
                unirepContract,
                'ReachedMaximumNumberUserSignedUp'
            )
        })
    })

    describe('Attester sign-ups', () => {
        let attester: any
        let attesterAddress: string
        let attester2: any
        let attester2Address: string
        let attester2Sig

        it('sign up should succeed', async () => {
            attester = accounts[1]
            attesterAddress = attester.address

            const tx = await unirepContract.connect(attester).attesterSignUp()
            const receipt = await tx.wait()

            expect(receipt.status).equal(1)
            signedUpAttesters++

            const attesterId = await unirepContract.attesters(attesterAddress)
            expect(signedUpAttesters).equal(attesterId)
            const nextAttesterId_ = await unirepContract.nextAttesterId()
            // nextAttesterId starts with 1 so now it should be 2
            expect(signedUpAttesters + 1).equal(nextAttesterId_)
        })

        it('sign up via relayer should succeed', async () => {
            let relayer = accounts[0]
            unirepContract.connect(relayer)
            attester2 = accounts[2]
            attester2Address = await attester2.getAddress()

            let message = ethers.utils.solidityKeccak256(
                ['address', 'address'],
                [attester2Address, unirepContract.address]
            )
            attester2Sig = await attester2.signMessage(
                ethers.utils.arrayify(message)
            )
            const tx = await unirepContract.attesterSignUpViaRelayer(
                attester2Address,
                attester2Sig
            )
            const receipt = await tx.wait()

            expect(receipt.status).equal(1)
            signedUpAttesters++

            const attesterId = await unirepContract.attesters(attester2Address)
            expect(signedUpAttesters).equal(attesterId)
            const nextAttesterId_ = await unirepContract.nextAttesterId()
            expect(signedUpAttesters + 1).equal(nextAttesterId_)
        })

        it('sign up with invalid signature should fail', async () => {
            let attester3 = accounts[3]
            let attester3Address = await attester3.getAddress()
            await expect(
                unirepContract.attesterSignUpViaRelayer(
                    attester3Address,
                    attester2Sig
                )
            ).to.be.revertedWithCustomError(unirepContract, 'InvalidSignature')
        })

        it('double sign up should fail', async () => {
            await expect(
                unirepContract.connect(attester).attesterSignUp()
            ).to.be.revertedWithCustomError(
                unirepContract,
                `AttesterAlreadySignUp`
            )

            await expect(
                unirepContract.attesterSignUpViaRelayer(
                    attester2Address,
                    attester2Sig
                )
            ).to.be.revertedWithCustomError(
                unirepContract,
                `AttesterAlreadySignUp`
            )
        })

        it('sign up should fail if max capacity reached', async () => {
            for (let i = 3; i < testMaxUser; i++) {
                attester = accounts[i]
                attesterAddress = attester.address

                const tx = await unirepContract
                    .connect(attester)
                    .attesterSignUp()
                const receipt = await tx.wait()
                expect(receipt.status).equal(1)
                signedUpAttesters++

                const attesterId = await unirepContract.attesters(
                    attesterAddress
                )
                expect(signedUpAttesters).equal(attesterId)
                const nextAttesterId_ = await unirepContract.nextAttesterId()
                expect(signedUpAttesters + 1).equal(nextAttesterId_)
            }
            attester = accounts[5]
            attesterAddress = attester.address

            await expect(
                unirepContract.connect(attester).attesterSignUp()
            ).to.be.revertedWithCustomError(
                unirepContract,
                'ReachedMaximumNumberUserSignedUp'
            )
        })
    })
})
