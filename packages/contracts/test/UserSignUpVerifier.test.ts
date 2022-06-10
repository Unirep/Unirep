// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumberish, ethers } from 'ethers'
import { expect } from 'chai'
import { Circuit } from '@unirep/circuits'
import { genRandomNumber, ZkIdentity, hashOne } from '@unirep/crypto'

import {
    genEpochKey,
    genInputForContract,
    genProveSignUpCircuitInput,
    Reputation,
} from './utils'
import { deployUnirep, SignUpProof, Unirep } from '../src'

describe('Verify user sign up verifier', function () {
    this.timeout(30000)
    let unirepContract: Unirep
    let accounts: ethers.Signer[]
    const epoch = 1
    const nonce = 0
    const user = new ZkIdentity()

    let reputationRecords = {}
    const MIN_POS_REP = 20
    const MAX_NEG_REP = 10
    const signUp = 1
    const notSignUp = 0
    const signedUpAttesterId = 1
    const nonSignedUpAttesterId = 2

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0])
        // Bootstrap reputation
        const graffitiPreImage = genRandomNumber()
        reputationRecords[signedUpAttesterId] = new Reputation(
            BigInt(Math.floor(Math.random() * 100) + MIN_POS_REP),
            BigInt(Math.floor(Math.random() * MAX_NEG_REP)),
            hashOne(graffitiPreImage),
            BigInt(signUp)
        )
        reputationRecords[signedUpAttesterId].addGraffitiPreImage(
            graffitiPreImage
        )

        reputationRecords[nonSignedUpAttesterId] = new Reputation(
            BigInt(Math.floor(Math.random() * 100) + MIN_POS_REP),
            BigInt(Math.floor(Math.random() * MAX_NEG_REP)),
            hashOne(graffitiPreImage),
            BigInt(notSignUp)
        )
        reputationRecords[nonSignedUpAttesterId].addGraffitiPreImage(
            graffitiPreImage
        )
    })

    it('successfully prove a user has signed up', async () => {
        const attesterId = signedUpAttesterId
        const circuitInputs = await genProveSignUpCircuitInput(
            user,
            epoch,
            reputationRecords,
            attesterId
        )
        const input: SignUpProof = await genInputForContract(
            Circuit.proveUserSignUp,
            circuitInputs
        )

        const isValid = await input.verify()
        expect(isValid, 'Verify user sign up proof off-chain failed').to.be.true
        const isProofValid = await unirepContract.verifyUserSignUp(input)
        expect(isProofValid, 'Verify reputation proof on-chain failed').to.be
            .true
    })

    it('wrong attesterId should fail', async () => {
        const attesterId = signedUpAttesterId
        const wrongAttesterId = nonSignedUpAttesterId
        const circuitInputs = await genProveSignUpCircuitInput(
            user,
            epoch,
            reputationRecords,
            attesterId
        )
        const input: SignUpProof = await genInputForContract(
            Circuit.proveUserSignUp,
            circuitInputs
        )
        input.attesterId = wrongAttesterId

        const isProofValid = await unirepContract.verifyUserSignUp(input)
        expect(isProofValid, 'Verify user sign up proof on-chain should fail')
            .to.be.false
    })

    it('wrong epoch should fail', async () => {
        const attesterId = signedUpAttesterId
        const wrongEpoch = epoch + 1
        const circuitInputs = await genProveSignUpCircuitInput(
            user,
            epoch,
            reputationRecords,
            attesterId
        )
        const input: SignUpProof = await genInputForContract(
            Circuit.proveUserSignUp,
            circuitInputs
        )
        input.epoch = wrongEpoch

        const isProofValid = await unirepContract.verifyUserSignUp(input)
        expect(isProofValid, 'Verify user sign up proof on-chain should fail')
            .to.be.false
    })

    it('wrong epoch key should fail', async () => {
        const attesterId = signedUpAttesterId
        const wrongEpochKey = genEpochKey(
            user.identityNullifier,
            epoch,
            nonce + 1
        )
        const circuitInputs = await genProveSignUpCircuitInput(
            user,
            epoch,
            reputationRecords,
            attesterId
        )
        const input: SignUpProof = await genInputForContract(
            Circuit.proveUserSignUp,
            circuitInputs
        )
        input.epochKey = wrongEpochKey as BigNumberish

        const isProofValid = await unirepContract.verifyUserSignUp(input)
        expect(isProofValid, 'Verify user sign up proof on-chain should fail')
            .to.be.false
    })
})
