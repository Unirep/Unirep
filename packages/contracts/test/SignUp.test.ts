// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { ZkIdentity } from '@unirep/crypto'

import { Unirep } from '../src'
import { config } from './testConfig'
import { attesterSignUp, deploy, genIdentity } from './utils'

describe('Signup', () => {
    const testMaxUser = 5
    let unirepContract: Unirep
    let accounts: ethers.Signer[]

    const { id, commitment } = genIdentity()
    let signedUpUsers = 0
    let signedUpAttesters = 0
    const _config = {
        ...config,
        maxUsers: testMaxUser,
        maxAttesters: testMaxUser,
    }

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deploy(accounts[0], _config)
    })

    it('should have the correct config value', async () => {
        expect(config.attestingFee).equal(await unirepContract.attestingFee())
        expect(config.epochLength).equal(await unirepContract.epochLength())
        expect(config.numEpochKeyNoncePerEpoch).equal(
            await unirepContract.numEpochKeyNoncePerEpoch()
        )
        expect(testMaxUser).equal(await unirepContract.maxUsers())

        const treeDepths_ = await unirepContract.treeDepths()
        expect(config.epochTreeDepth).equal(treeDepths_.epochTreeDepth)
        expect(config.globalStateTreeDepth).equal(
            treeDepths_.globalStateTreeDepth
        )
        expect(config.userStateTreeDepth).equal(treeDepths_.userStateTreeDepth)
    })

    describe('User sign-ups', () => {
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
            ).to.be.revertedWith('Unirep: the user has already signed up')
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
            ).to.be.revertedWith(
                'Unirep: maximum number of user signups reached'
            )
        })
    })

    describe('Attester sign-ups', () => {
        let attester
        let attester2
        let attester2Address
        let attester2Sig

        it('sign up should succeed', async () => {
            const success = await attesterSignUp(unirepContract, accounts[1])
            expect(success).equal(1)
            signedUpAttesters++

            const attesterId = await unirepContract.attesters(
                await accounts[1].getAddress()
            )
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
            await expect(
                unirepContract.attesterSignUpViaRelayer(
                    await accounts[3].getAddress(),
                    attester2Sig
                )
            ).to.be.revertedWith('Unirep: invalid attester sign up signature')
        })

        it('double sign up should fail', async () => {
            await expect(
                attesterSignUp(unirepContract, accounts[1])
            ).to.be.revertedWith('Unirep: attester has already signed up')

            await expect(
                unirepContract.attesterSignUpViaRelayer(
                    attester2Address,
                    attester2Sig
                )
            ).to.be.revertedWith('Unirep: attester has already signed up')
        })

        it('sign up should fail if max capacity reached', async () => {
            for (let i = 3; i < testMaxUser; i++) {
                const success = await attesterSignUp(
                    unirepContract,
                    accounts[i]
                )
                expect(success).equal(1)
                signedUpAttesters++

                const attesterId = await unirepContract.attesters(
                    await accounts[i].getAddress()
                )
                expect(signedUpAttesters).equal(attesterId)
                const nextAttesterId_ = await unirepContract.nextAttesterId()
                expect(signedUpAttesters + 1).equal(nextAttesterId_)
            }
            attester = accounts[testMaxUser]
            await expect(
                attesterSignUp(unirepContract, attester)
            ).to.be.revertedWith(
                'Unirep: maximum number of attester signups reached'
            )
        })
    })
})
