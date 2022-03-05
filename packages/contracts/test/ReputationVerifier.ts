// @ts-ignore
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { expect } from "chai"
import { Circuit } from "@unirep/circuits"
import { genRandomSalt, genIdentity, hashOne, } from "@unirep/crypto"
import { circuitEpochTreeDepth, maxReputationBudget, circuitUserStateTreeDepth, attestingFee } from "../config"
import { genEpochKey, genInputForContract, genReputationCircuitInput, getTreeDepthsForTesting, Reputation } from './utils'
import { deployUnirep, Unirep, ReputationProof } from '../src'

describe('Verify reputation verifier', function () {
    this.timeout(30000)
    let unirepContract
    let unirepContractCalledByAttester
    let accounts: ethers.Signer[]
    const epoch = 1
    const nonce = 1
    const user = genIdentity()
    const NUM_ATTESTERS = 10
    let attesterId

    let reputationRecords = {}
    const MIN_POS_REP = 20
    const MAX_NEG_REP = 10
    const repNullifiersAmount = 3
    let minRep = MIN_POS_REP - MAX_NEG_REP
    const proveGraffiti = 1
    const signUp = 1

    before(async () => {
        accounts = await hardhatEthers.getSigners()

        const _treeDepths = getTreeDepthsForTesting()
        unirepContract = await deployUnirep(<ethers.Wallet>accounts[0], _treeDepths)
        
        // Bootstrap reputation
        for (let i = 0; i < NUM_ATTESTERS; i++) {
            let attesterId = Math.ceil(Math.random() * (2 ** circuitUserStateTreeDepth - 1))
            while (reputationRecords[attesterId] !== undefined) attesterId = Math.floor(Math.random() * (2 ** circuitUserStateTreeDepth))
            const graffitiPreImage = genRandomSalt()
            reputationRecords[attesterId] = new Reputation(
                BigInt(Math.floor(Math.random() * 100) + MIN_POS_REP),
                BigInt(Math.floor(Math.random() * MAX_NEG_REP)),
                hashOne(graffitiPreImage),
                BigInt(signUp)
            )
            reputationRecords[attesterId].addGraffitiPreImage(graffitiPreImage)
        }
    })

    it('successfully prove a random generated reputation', async () => {
        const attesterIds = Object.keys(reputationRecords)
        attesterId = attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)]
        const circuitInputs = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, attesterId, )

        const input: ReputationProof = await genInputForContract(Circuit.proveReputation, circuitInputs)
        const isValid = await input.verify()
        expect(isValid, 'Verify reputation proof off-chain failed').to.be.true
        const isProofValid = await unirepContract.verifyReputation(input)
        expect(isProofValid, 'Verify reputation proof on-chain failed').to.be.true
    })

    it('mismatched reputation nullifiers and nullifiers amount should fail', async () => {
        const wrongReputationNullifierAmount = repNullifiersAmount + 1
        const invalidCircuitInputs = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, attesterId, repNullifiersAmount )
        invalidCircuitInputs.rep_nullifiers_amount = wrongReputationNullifierAmount

        const input: ReputationProof = await genInputForContract(Circuit.proveReputation, invalidCircuitInputs)
        const isValid = await input.verify()
        expect(isValid, 'Verify reputation proof off-chain should fail').to.be.false
        const isProofValid = await unirepContract.verifyReputation(input)
        expect(isProofValid, 'Verify reputation proof on-chain should fail').to.be.false
    })

    it('wrong nullifiers should fail', async () => {
        const circuitInputs = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, attesterId, repNullifiersAmount )

        let input: ReputationProof = await genInputForContract(Circuit.proveReputation, circuitInputs)
        // random reputation nullifiers
        for (let i = 0; i < maxReputationBudget; i++) {
            input.repNullifiers[i] = genRandomSalt()
        }
        const isProofValid = await unirepContract.verifyReputation(input)
        expect(isProofValid, 'Verify reputation proof on-chain should fail').to.be.false
    })

    it('wrong epoch should fail', async () => {
        const wrongEpoch = epoch + 1
        const circuitInputs = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, attesterId, repNullifiersAmount )

        const input: ReputationProof = await genInputForContract(Circuit.proveReputation, circuitInputs)
        input.epoch = wrongEpoch
        const isProofValid = await unirepContract.verifyReputation(input)
        expect(isProofValid, 'Verify reputation proof on-chain should fail').to.be.false
    })

    it('wrong nonce epoch key should fail', async () => {
        const wrongEpochKey = genEpochKey(user['identityNullifier'], epoch, nonce + 1, circuitEpochTreeDepth)
        const circuitInputs = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, attesterId, repNullifiersAmount )

        const input: ReputationProof = await genInputForContract(Circuit.proveReputation, circuitInputs)
        input.epochKey = wrongEpochKey
        const isProofValid = await unirepContract.verifyReputation(input)
        expect(isProofValid, 'Verify reputation proof on-chain should fail').to.be.false
    })

    it('wrong attesterId should fail', async () => {
        const wrongAttesterId = attesterId + 1
        const circuitInputs = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, attesterId, repNullifiersAmount )

        const input: ReputationProof = await genInputForContract(Circuit.proveReputation, circuitInputs)
        input.attesterId = wrongAttesterId
        const isProofValid = await unirepContract.verifyReputation(input)
        expect(isProofValid, 'Verify reputation proof on-chain should fail').to.be.false
    })

    it('wrong minRep should fail', async () => {
        const wrongMinRep = minRep + 1
        const circuitInputs = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, attesterId, repNullifiersAmount, minRep )

        const input: ReputationProof = await genInputForContract(Circuit.proveReputation, circuitInputs)
        input.minRep = wrongMinRep
        const isProofValid = await unirepContract.verifyReputation(input)
        expect(isProofValid, 'Verify reputation proof on-chain should fail').to.be.false
    })

    it('wrong graffiti preimage should fail', async () => {
        const wrongGraffitiPreimage = genRandomSalt()
        const circuitInputs = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, attesterId, repNullifiersAmount, minRep , proveGraffiti, )

        const input: ReputationProof = await genInputForContract(Circuit.proveReputation, circuitInputs)
        input.graffitiPreImage = wrongGraffitiPreimage
        const isProofValid = await unirepContract.verifyReputation(input)
        expect(isProofValid, 'Verify reputation proof on-chain should fail').to.be.false
    })

    it('sign up should succeed', async () => {
        const attester = accounts[1]
        const attesterAddress = await attester.getAddress()
        unirepContractCalledByAttester = await hardhatEthers.getContractAt(
            Unirep.abi, 
            unirepContract.address, 
            attester
        )
        const tx = await unirepContractCalledByAttester.attesterSignUp()
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)
        attesterId = BigInt(await unirepContract.attesters(attesterAddress))
    })

    it('submit reputation nullifiers should succeed', async () => {
        const circuitInputs = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, attesterId, repNullifiersAmount, minRep , proveGraffiti, )
        const input: ReputationProof = await genInputForContract(Circuit.proveReputation, circuitInputs)
        const tx = await unirepContractCalledByAttester.spendReputation(
            input,
            {value: attestingFee},
        )
        const receipt = await tx.wait()
        expect(receipt.status).equal(1)

        const pfIdx = await unirepContract.getProofIndex(input.hash())
        expect(Number(pfIdx)).not.eq(0)
    })

    it('submit reputation nullifiers with wrong length of nullifiers should fail', async () => {
        const circuitInputs = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, attesterId, repNullifiersAmount, minRep , proveGraffiti, )
        const input: ReputationProof = await genInputForContract(Circuit.proveReputation, circuitInputs)
        const wrongNullifiers = input.repNullifiers.slice(1, maxReputationBudget)
        input.repNullifiers = wrongNullifiers
        await expect(unirepContractCalledByAttester.spendReputation(
            input,
            {value: attestingFee},
        )).to.be.revertedWith('Unirep: invalid number of reputation nullifiers')
    })

    it('submit reputation nullifiers with wrong epoch key should fail', async () => {
        const circuitInputs = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, attesterId, repNullifiersAmount, minRep , proveGraffiti, )
        const input: ReputationProof = await genInputForContract(Circuit.proveReputation, circuitInputs)
        input.epochKey = genRandomSalt()
        await expect(unirepContractCalledByAttester.spendReputation(
            input,
            {value: attestingFee},
        )).to.be.revertedWith('Unirep: invalid epoch key range')
    })
})