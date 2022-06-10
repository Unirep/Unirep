// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from 'chai'
import { ZkIdentity, genRandomNumber } from '@unirep/crypto'
import { Circuit } from '@unirep/circuits'

import {
    Reputation,
    genProofAndVerify,
    genReputationCircuitInput,
    genProveSignUpCircuitInput,
    genInputForContract,
} from './utils'
import { deployUnirep, Unirep } from '../src'

describe('Airdrop', function () {
    this.timeout(100000)

    let unirepContract: Unirep
    let accounts: ethers.Signer[]

    let numUsers = 0
    let attesterAddress, unirepContractCalledByAttester: Unirep
    const airdropPosRep = 20
    const epkNonce = 0
    const attestingFee = ethers.utils.parseEther('0.1')

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], {
            attestingFee,
        })
    })

    describe('Attesters set airdrop', () => {
        it('attester signs up and attester sets airdrop amount should succeed', async () => {
            console.log('Attesters sign up')

            for (let i = 0; i < 2; i++) {
                unirepContractCalledByAttester = unirepContract.connect(
                    accounts[i]
                )
                const tx = await unirepContractCalledByAttester.attesterSignUp()
                const receipt = await tx.wait()
                expect(receipt.status).equal(1)
            }

            console.log('attesters set airdrop amount')
            unirepContractCalledByAttester = unirepContract.connect(accounts[0])
            attesterAddress = await accounts[0].getAddress()
            const tx = await unirepContractCalledByAttester.setAirdropAmount(
                airdropPosRep
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)
            const airdroppedAmount =
                await unirepContractCalledByAttester.airdropAmount(
                    attesterAddress
                )
            expect(airdroppedAmount.toNumber()).equal(airdropPosRep)
        })

        it('non-signup attester cannot set airdrop amount', async () => {
            unirepContractCalledByAttester = unirepContract.connect(accounts[2])
            await expect(
                unirepContractCalledByAttester.setAirdropAmount(airdropPosRep)
            ).to.be.revertedWith('Unirep: attester has not signed up yet')
        })

        it('user signs up through a signed up attester with 0 airdrop should not get airdrop', async () => {
            console.log('User sign up')
            const userId = new ZkIdentity()
            const userCommitment = userId.genIdentityCommitment()
            unirepContractCalledByAttester = unirepContract.connect(accounts[1])
            let tx = await unirepContractCalledByAttester.userSignUp(
                userCommitment
            )
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)

            const signUpFilter = unirepContract.filters.UserSignedUp()
            const signUpEvents = await unirepContract.queryFilter(signUpFilter)
            const commitment_ = signUpEvents[numUsers].args.identityCommitment
            expect(commitment_).equal(userCommitment)
            numUsers++

            // user can prove airdrop pos rep
            const currentEpoch = (
                await unirepContract.currentEpoch()
            ).toNumber()
            const reputationRecords = {}
            let attesterId_
            for (const event of signUpEvents) {
                attesterId_ = event.args.attesterId.toNumber()
                reputationRecords[attesterId_] = new Reputation(
                    event.args.airdropAmount.toBigInt(),
                    BigInt(0),
                    BigInt(0),
                    BigInt(0) // airdrop amount == 0
                )
            }
            const minPosRep = 19
            const circuitInputs = await genReputationCircuitInput(
                userId,
                currentEpoch,
                epkNonce,
                reputationRecords,
                attesterId_,
                undefined,
                minPosRep
            )
            const isValid = await genProofAndVerify(
                Circuit.proveReputation,
                circuitInputs
            )
            expect(isValid, 'Verify reputation proof off-chain failed').to.be
                .false
        })

        // We set the admin in Alpha test, user should sign up with admin account or an attester
        // it('user signs up through a non-signed up attester should succeed and gets no airdrop', async () => {
        //     console.log('User sign up')
        //     const userId = new ZkIdentity()
        //     const userCommitment = userId.genIdentityCommitment()
        //     unirepContractCalledByAttester = unirepContract.connect(accounts[2])
        //     let tx = await unirepContractCalledByAttester.userSignUp(
        //         userCommitment
        //     )
        //     let receipt = await tx.wait()
        //     expect(receipt.status).equal(1)

        //     const signUpFilter = unirepContract.filters.UserSignedUp()
        //     const signUpEvents = await unirepContract.queryFilter(signUpFilter)
        //     const commitment_ = signUpEvents[numUsers].args.identityCommitment
        //     expect(commitment_).equal(userCommitment)
        //     numUsers++
        // })
    })

    describe('Users get airdrop', () => {
        console.log('User sign up')
        const userId = new ZkIdentity()
        const userCommitment = userId.genIdentityCommitment()
        let currentEpoch
        let reputationRecords = {}
        let attesterId_

        it('user signs up through attester should get airdrop pos rep', async () => {
            let tx = await unirepContract.userSignUp(userCommitment)
            let receipt = await tx.wait()
            expect(receipt.status).equal(1)
            const signUpFilter = unirepContract.filters.UserSignedUp()
            const signUpEvents = await unirepContract.queryFilter(signUpFilter)
            const commitment_ = signUpEvents[numUsers].args.identityCommitment
            expect(commitment_).equal(userCommitment)
            numUsers++

            currentEpoch = (await unirepContract.currentEpoch()).toNumber()
            reputationRecords = {}
            for (const event of signUpEvents) {
                attesterId_ = event.args.attesterId.toNumber()
                reputationRecords[attesterId_] = new Reputation(
                    event.args.airdropAmount.toBigInt(),
                    BigInt(0),
                    BigInt(0),
                    BigInt(1) // airdrop amount != 0
                )
            }
        })

        it('user can prove airdrop pos rep', async () => {
            const minPosRep = 19
            const repProofCircuitInputs = await genReputationCircuitInput(
                userId,
                currentEpoch,
                epkNonce,
                reputationRecords,
                attesterId_,
                undefined,
                minPosRep
            )
            const isRepProofValid = await genProofAndVerify(
                Circuit.proveReputation,
                repProofCircuitInputs
            )
            expect(isRepProofValid, 'Verify reputation proof off-chain failed')
                .to.be.true
        })

        it('user can prove sign up flag', async () => {
            const signUpCircuitInputs = await genProveSignUpCircuitInput(
                userId,
                currentEpoch,
                reputationRecords,
                attesterId_
            )
            const isSignUpProofValid = await genProofAndVerify(
                Circuit.proveUserSignUp,
                signUpCircuitInputs
            )
            expect(
                isSignUpProofValid,
                'Verify user sign up proof off-chain failed'
            ).to.be.true
        })

        it('user can use sign up proof to get airdrop (from the attester)', async () => {
            const signUpCircuitInputs = await genProveSignUpCircuitInput(
                userId,
                currentEpoch,
                reputationRecords,
                attesterId_
            )
            const input = await genInputForContract(
                Circuit.proveUserSignUp,
                signUpCircuitInputs
            )
            unirepContractCalledByAttester = unirepContract.connect(accounts[0])
            const tx = await unirepContractCalledByAttester.airdropEpochKey(
                input,
                {
                    value: attestingFee,
                }
            )
            const receipt = await tx.wait()
            expect(receipt.status).equal(1)

            const pfIdx = await unirepContract.getProofIndex(input.hash())
            expect(Number(pfIdx)).not.eq(0)

            await expect(
                unirepContractCalledByAttester.airdropEpochKey(input)
            ).to.be.revertedWith('Unirep: the proof has been submitted before')
        })

        it('get airdrop through a non-signup attester should fail', async () => {
            const signUpCircuitInputs = await genProveSignUpCircuitInput(
                userId,
                currentEpoch,
                reputationRecords,
                attesterId_
            )
            const input = await genInputForContract(
                Circuit.proveUserSignUp,
                signUpCircuitInputs
            )
            unirepContractCalledByAttester = unirepContract.connect(accounts[2])

            await expect(
                unirepContractCalledByAttester.airdropEpochKey(input, {
                    value: attestingFee,
                })
            ).to.be.revertedWith('Unirep: attester has not signed up yet')
        })

        it('get airdrop through a wrong attester should fail', async () => {
            const signUpCircuitInputs = await genProveSignUpCircuitInput(
                userId,
                currentEpoch,
                reputationRecords,
                attesterId_
            )
            const input = await genInputForContract(
                Circuit.proveUserSignUp,
                signUpCircuitInputs
            )
            unirepContractCalledByAttester = unirepContract.connect(accounts[1])

            await expect(
                unirepContractCalledByAttester.airdropEpochKey(input, {
                    value: attestingFee,
                })
            ).to.be.revertedWith('Unirep: mismatched attesterId')
        })

        it('get airdrop through a wrong attesting fee should fail', async () => {
            const signUpCircuitInputs = await genProveSignUpCircuitInput(
                userId,
                currentEpoch,
                reputationRecords,
                attesterId_
            )
            const input = await genInputForContract(
                Circuit.proveUserSignUp,
                signUpCircuitInputs
            )
            unirepContractCalledByAttester = unirepContract.connect(accounts[0])

            await expect(
                unirepContractCalledByAttester.airdropEpochKey(input)
            ).to.be.revertedWith('Unirep: no attesting fee or incorrect amount')
        })

        it('get airdrop through a wrong epoch should fail', async () => {
            const wrongEpoch = currentEpoch + 1
            const signUpCircuitInputs = await genProveSignUpCircuitInput(
                userId,
                wrongEpoch,
                reputationRecords,
                attesterId_
            )
            const input = await genInputForContract(
                Circuit.proveUserSignUp,
                signUpCircuitInputs
            )
            unirepContractCalledByAttester = unirepContract.connect(accounts[0])
            const currentEpoch_ = await unirepContract.currentEpoch()
            expect(wrongEpoch).not.equal(currentEpoch_)

            await expect(
                unirepContractCalledByAttester.airdropEpochKey(input, {
                    value: attestingFee,
                })
            ).to.be.revertedWith(
                'Unirep: submit an airdrop proof with incorrect epoch'
            )
        })

        it('submit an invalid epoch key should fail', async () => {
            const signUpCircuitInputs = await genProveSignUpCircuitInput(
                userId,
                currentEpoch,
                reputationRecords,
                attesterId_
            )
            const input = await genInputForContract(
                Circuit.proveUserSignUp,
                signUpCircuitInputs
            )
            unirepContractCalledByAttester = unirepContract.connect(accounts[0])
            input.epochKey = genRandomNumber()

            await expect(
                unirepContractCalledByAttester.airdropEpochKey(input, {
                    value: attestingFee,
                })
            ).to.be.revertedWith('Unirep: invalid epoch key range')
        })
    })
})
