// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { genRandomSalt } from '@unirep/crypto'

import {
    attesterSignUp,
    deploy,
    genIdentity,
    genProofAndVerify,
    genReputationCircuitInput,
    setAirdrop,
    getAirdropReputationRecords,
    genProveSignUpCircuitInput,
    genInputForContract,
} from './utils'
import { Unirep } from '../src'
import { circuitConfig, config } from './testConfig'
import { CircuitName } from '../../circuits/src'

describe('Airdrop', function () {
    this.timeout(100000)

    let unirepContract: Unirep
    let accounts: ethers.Signer[]

    const airdropPosRep = 20
    const epkNonce = 0
    const attestingFee = ethers.utils.parseEther('0.1')

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deploy(accounts[0], config)
    })

    describe('Attesters set airdrop', () => {
        it('attester signs up and attester sets airdrop amount should succeed', async () => {
            for (let i = 0; i < 2; i++) {
                const success = await attesterSignUp(
                    unirepContract,
                    accounts[i]
                )
                expect(success).equal(1)
            }

            await setAirdrop(unirepContract, accounts[0], airdropPosRep)
        })

        it('non-signup attester cannot set airdrop amount', async () => {
            await expect(
                setAirdrop(unirepContract, accounts[2], airdropPosRep)
            ).to.be.revertedWith('Unirep: attester has not signed up yet')
        })

        it('user signs up through a signed up attester with 0 airdrop should not get airdrop', async () => {
            const { id, commitment } = genIdentity()
            let tx = await unirepContract
                .connect(accounts[1])
                .userSignUp(commitment)
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)

            const signUp = await unirepContract.hasUserSignedUp(commitment)
            expect(signUp, `User ${commitment} has not signed up`).to.be.true

            // user can prove airdrop pos rep
            const currentEpoch = (
                await unirepContract.currentEpoch()
            ).toNumber()
            const reputationRecords = await getAirdropReputationRecords(
                unirepContract,
                id
            )
            const attesterId_ = await unirepContract.attesters(
                await accounts[1].getAddress()
            )

            const minPosRep = airdropPosRep - 1
            const circuitInputs = await genReputationCircuitInput(
                id,
                currentEpoch,
                epkNonce,
                reputationRecords,
                attesterId_,
                undefined,
                minPosRep
            )
            const isValid = await genProofAndVerify(
                CircuitName.proveReputation,
                circuitInputs
            )
            expect(isValid, 'Verify reputation proof off-chain failed').to.be
                .false
        })

        // We set the admin in Alpha test, user should sign up with admin account or an attester
        it('user signs up through a non-signed up attester should succeed and gets no airdrop', async () => {
            const { id, commitment } = genIdentity()
            let tx = await unirepContract
                .connect(accounts[2])
                .userSignUp(commitment)
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)

            const signUp = await unirepContract.hasUserSignedUp(commitment)
            expect(signUp, `User ${commitment} has not signed up`).to.be.true
        })
    })

    describe('Users get airdrop', () => {
        const { id, commitment } = genIdentity()
        let currentEpoch
        let reputationRecords = {}
        let attesterId_

        it('user signs up through attester should get airdrop pos rep', async () => {
            let tx = await unirepContract
                .connect(accounts[0])
                .userSignUp(commitment)
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)

            const signUp = await unirepContract.hasUserSignedUp(commitment)
            expect(signUp, `User ${commitment} has not signed up`).to.be.true

            reputationRecords = await getAirdropReputationRecords(
                unirepContract,
                id
            )
        })

        it('user can prove airdrop pos rep', async () => {
            const minPosRep = airdropPosRep - 1
            attesterId_ = await unirepContract.attesters(
                await accounts[0].getAddress()
            )
            currentEpoch = (await unirepContract.currentEpoch()).toNumber()
            const repProofCircuitInputs = await genReputationCircuitInput(
                id,
                currentEpoch,
                epkNonce,
                reputationRecords,
                attesterId_,
                undefined,
                minPosRep
            )
            const isRepProofValid = await genProofAndVerify(
                CircuitName.proveReputation,
                repProofCircuitInputs
            )
            expect(isRepProofValid, 'Verify reputation proof off-chain failed')
                .to.be.true
        })

        it('user can prove sign up flag', async () => {
            const signUpCircuitInputs = await genProveSignUpCircuitInput(
                id,
                currentEpoch,
                reputationRecords,
                attesterId_,
                circuitConfig
            )
            const isSignUpProofValid = await genProofAndVerify(
                CircuitName.proveUserSignUp,
                signUpCircuitInputs
            )
            expect(
                isSignUpProofValid,
                'Verify user sign up proof off-chain failed'
            ).to.be.true
        })

        it('user can use sign up proof to get airdrop (from the attester)', async () => {
            const signUpCircuitInputs = await genProveSignUpCircuitInput(
                id,
                currentEpoch,
                reputationRecords,
                attesterId_,
                circuitConfig
            )
            const input = await genInputForContract(
                CircuitName.proveUserSignUp,
                signUpCircuitInputs
            )
            const tx = await unirepContract
                .connect(accounts[0])
                .airdropEpochKey(input, {
                    value: attestingFee,
                })
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            const hash = await unirepContract.hashSignUpProof(input)
            const pfIdx = await unirepContract.getProofIndex(hash)
            expect(Number(pfIdx)).not.eq(0)

            await expect(
                unirepContract.connect(accounts[0]).airdropEpochKey(input, {
                    value: attestingFee,
                })
            ).to.be.revertedWith('Unirep: the proof has been submitted before')
        })

        it('get airdrop through a non-signup attester should fail', async () => {
            const signUpCircuitInputs = await genProveSignUpCircuitInput(
                id,
                currentEpoch,
                reputationRecords,
                attesterId_,
                circuitConfig
            )
            const input = await genInputForContract(
                CircuitName.proveUserSignUp,
                signUpCircuitInputs
            )

            await expect(
                unirepContract.connect(accounts[2]).airdropEpochKey(input, {
                    value: attestingFee,
                })
            ).to.be.revertedWith('Unirep: attester has not signed up yet')
        })

        it('get airdrop through a wrong attester should fail', async () => {
            const signUpCircuitInputs = await genProveSignUpCircuitInput(
                id,
                currentEpoch,
                reputationRecords,
                attesterId_,
                circuitConfig
            )
            const input = await genInputForContract(
                CircuitName.proveUserSignUp,
                signUpCircuitInputs
            )

            await expect(
                unirepContract.connect(accounts[1]).airdropEpochKey(input, {
                    value: attestingFee,
                })
            ).to.be.revertedWith('Unirep: mismatched attesterId')
        })

        it('get airdrop through a wrong attesting fee should fail', async () => {
            const signUpCircuitInputs = await genProveSignUpCircuitInput(
                id,
                currentEpoch,
                reputationRecords,
                attesterId_,
                circuitConfig
            )
            const input = await genInputForContract(
                CircuitName.proveUserSignUp,
                signUpCircuitInputs
            )

            await expect(
                unirepContract.connect(accounts[0]).airdropEpochKey(input)
            ).to.be.revertedWith('Unirep: no attesting fee or incorrect amount')
        })

        it('get airdrop through a wrong epoch should fail', async () => {
            const wrongEpoch = currentEpoch + 1
            const signUpCircuitInputs = await genProveSignUpCircuitInput(
                id,
                wrongEpoch,
                reputationRecords,
                attesterId_,
                circuitConfig
            )
            const input = await genInputForContract(
                CircuitName.proveUserSignUp,
                signUpCircuitInputs
            )
            const currentEpoch_ = await unirepContract.currentEpoch()
            expect(wrongEpoch).not.equal(currentEpoch_)

            await expect(
                unirepContract.connect(accounts[0]).airdropEpochKey(input, {
                    value: attestingFee,
                })
            ).to.be.revertedWith(
                'Unirep: submit an airdrop proof with incorrect epoch'
            )
        })

        it('submit an invalid epoch key should fail', async () => {
            const signUpCircuitInputs = await genProveSignUpCircuitInput(
                id,
                currentEpoch,
                reputationRecords,
                attesterId_,
                circuitConfig
            )
            const input = await genInputForContract(
                CircuitName.proveUserSignUp,
                signUpCircuitInputs
            )
            input.epochKey = genRandomSalt()

            await expect(
                unirepContract.connect(accounts[0]).airdropEpochKey(input, {
                    value: attestingFee,
                })
            ).to.be.revertedWith('Unirep: invalid epoch key range')
        })
    })
})
