import * as path from 'path'
import { expect } from "chai"
import { genRandomSalt, genIdentity, hashOne, } from "@unirep/crypto"
import { Circuit, executeCircuit, } from "../circuits/utils"
import { Reputation, compileAndLoadCircuit, genReputationCircuitInput, throwError, genProofAndVerify } from './utils'
import { circuitUserStateTreeDepth, maxReputationBudget, proveReputationCircuitPath } from "../config"

const circuitPath = path.join(__dirname, proveReputationCircuitPath)

describe('Prove reputation from attester circuit', function () {
    this.timeout(300000)

    let circuit

    const epoch = 1
    const nonce = 1
    const user = genIdentity()
    const NUM_ATTESTERS = 10
    let reputationRecords = {}
    const MIN_POS_REP = 20
    const MAX_NEG_REP = 10
    const repNullifiersAmount = 3
    const nonceStarter = 0
    let minRep = MIN_POS_REP - MAX_NEG_REP
    const proveGraffiti = 1
    const signUp = 1

    before(async () => {
        const startCompileTime = Math.floor(new Date().getTime() / 1000)
        circuit = await compileAndLoadCircuit(circuitPath)
        const endCompileTime = Math.floor(new Date().getTime() / 1000)
        console.log(`Compile time: ${endCompileTime - startCompileTime} seconds`)

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
        const attesterId = attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)]
        const circuitInputs = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, attesterId, )

        await executeCircuit(circuit, circuitInputs)
        
        const isValid = await genProofAndVerify(Circuit.proveReputation, circuitInputs)
        expect(isValid).to.be.true
    })

    it('successfully prove a reputation with equal positive and negative repuataion', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)]
        const minRep = reputationRecords[attesterId]['posRep'] - reputationRecords[attesterId]['negRep']

        const circuitInputs = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, attesterId,  undefined, minRep)

        await executeCircuit(circuit, circuitInputs)

        const isValid = await genProofAndVerify(Circuit.proveReputation, circuitInputs)
        expect(isValid).to.be.true
    })

    it('successfully choose to prove only minimun positive reputation', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)]
        const zeroRepNullifiersAmount = 0
        const graffitiPreImage = reputationRecords[attesterId]['graffitiPreImage']
        const circuitInputs = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, attesterId, zeroRepNullifiersAmount, minRep, proveGraffiti, graffitiPreImage)

        await executeCircuit(circuit, circuitInputs)

        const isValid = await genProofAndVerify(Circuit.proveReputation, circuitInputs)
        expect(isValid).to.be.true
    })

    it('successfully choose to prove only reputation nullifiers', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)]
        const zeroMinRep = 0
        const circuitInputs = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, attesterId, undefined, zeroMinRep)

        await executeCircuit(circuit, circuitInputs)

        const isValid = await genProofAndVerify(Circuit.proveReputation, circuitInputs)
        expect(isValid).to.be.true
    })

    it('successfully choose not to prove graffiti with wrong value', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)]
        const notProveGraffiti = 0
        const wrongGraffitiPreImage = genRandomSalt()
        const circuitInputs = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, attesterId, undefined, undefined, notProveGraffiti, wrongGraffitiPreImage)

        await executeCircuit(circuit, circuitInputs)
        
        const isValid = await genProofAndVerify(Circuit.proveReputation, circuitInputs)
        expect(isValid).to.be.true
    })

    it('prove reputation with wrong attester Id should fail', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        const circuitInputs = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, attesterId,)
        const wrongAttesterId = attesterId < (NUM_ATTESTERS - 1) ? attesterId + 1 : attesterId - 1
        circuitInputs.attester_id = wrongAttesterId

        await throwError(circuit, circuitInputs, "Root mismatch results from wrong attester Id should throw error")

        const isValid = await genProofAndVerify(Circuit.proveReputation, circuitInputs)
        expect(isValid).to.be.false
    })

    it('prove reputation with not exist user state should fail', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        const wrongUserStateRoot = genRandomSalt().toString()
        const circuitInputs = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, attesterId,)
        circuitInputs.user_tree_root = wrongUserStateRoot

        await throwError(circuit, circuitInputs, "Root mismatch results from wrong user state should throw error")

        const isValid = await genProofAndVerify(Circuit.proveReputation, circuitInputs)
        expect(isValid).to.be.false
    })

    it('prove reputation nullifiers with insufficient rep score', async () => {
        // Bootstrap user state
        let insufficientAttesterId = Math.ceil(Math.random() * (2 ** circuitUserStateTreeDepth - 1))
        while (reputationRecords[insufficientAttesterId] !== undefined) insufficientAttesterId = Math.floor(Math.random() * (2 ** circuitUserStateTreeDepth))
        const insufficientPosRep = 5
        const insufficientNegRep = 10
        const insufficientGraffitiPreImage = genRandomSalt()
        reputationRecords[insufficientAttesterId] = new Reputation(
            BigInt(insufficientPosRep),
            BigInt(insufficientNegRep),
            hashOne(insufficientGraffitiPreImage),
            BigInt(signUp)
        )

        const circuitInputs1 = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, insufficientAttesterId, repNullifiersAmount, minRep, proveGraffiti, insufficientGraffitiPreImage)

        await throwError(circuit, circuitInputs1, "Prove nullifiers with insufficient rep score should throw error")

        let isValid = await genProofAndVerify(Circuit.proveReputation, circuitInputs1)
        expect(isValid).to.be.false

        // only prove minRep should fail
        const zeroRepNullifiersAmount = 0
        const zeroSelector: number[] = []
        for (let i = 0; i < maxReputationBudget; i++) {
            zeroSelector.push(0)
        }
        const circuitInputs2 = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, insufficientAttesterId, zeroRepNullifiersAmount, minRep, proveGraffiti, insufficientGraffitiPreImage)
    
        await throwError(circuit, circuitInputs2, "Prove min rep with insufficient rep score should throw error")

        isValid = await genProofAndVerify(Circuit.proveReputation, circuitInputs2)
        expect(isValid).to.be.false

        // only prove graffiti should success
        const zeroMinRep = 0
        const circuitInputs3 = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, insufficientAttesterId, zeroRepNullifiersAmount, zeroMinRep, proveGraffiti, insufficientGraffitiPreImage)

        await executeCircuit(circuit, circuitInputs3)

        isValid = await genProofAndVerify(Circuit.proveReputation, circuitInputs3)
        expect(isValid).to.be.true
    })

    it('prove reputation nullifiers with incorrect nonce should fail', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        const graffitiPreImage = reputationRecords[attesterId]['graffitiPreImage']
        const posRep = reputationRecords[attesterId]['posRep']
        const negRep = reputationRecords[attesterId]['negRep']
        const wrongNonceStarter = Number(posRep - negRep) + 1
        const wrongNonceList: number[] = []
        for (let i = 0; i < repNullifiersAmount; i++) {
            wrongNonceList.push(wrongNonceStarter + i)
        }
        for (let i = repNullifiersAmount; i < maxReputationBudget; i++) {
            wrongNonceList.push(0)
        }
        const circuitInputs = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, attesterId, repNullifiersAmount, minRep, proveGraffiti, graffitiPreImage)
        circuitInputs.rep_nonce = wrongNonceList

        await throwError(circuit, circuitInputs, "Invalid nonce should throw error")

        const isValid = await genProofAndVerify(Circuit.proveReputation, circuitInputs)
        expect(isValid).to.be.false
    })

    it('mismatch nullifier amount and selectors should fail', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        const wrongRepNullifiersAmount = repNullifiersAmount - 1
        const wrongNonceList: number[] = []
        for (let i = 0; i < repNullifiersAmount; i++) {
            wrongNonceList.push(nonceStarter + i)
        }
        for (let i = repNullifiersAmount; i < maxReputationBudget; i++) {
            wrongNonceList.push(0)
        }
        const circuitInputs = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, attesterId, repNullifiersAmount, minRep,)
        circuitInputs.rep_nullifiers_amount = wrongRepNullifiersAmount

        await throwError(circuit, circuitInputs, "Mismatch nullifier amount record should throw error")

        const isValid = await genProofAndVerify(Circuit.proveReputation, circuitInputs)
        expect(isValid).to.be.false
    })

    it('prove reputation with incorrect reputation should fail', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        const posRep = reputationRecords[attesterId]['posRep']
        const negRep = reputationRecords[attesterId]['negRep']
        const wrongMinRep = Number(posRep - negRep) + 1
        const circuitInputs = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, attesterId, undefined, wrongMinRep)

        await throwError(circuit, circuitInputs, "Mismatch reputation record should throw error")

        const isValid = await genProofAndVerify(Circuit.proveReputation, circuitInputs)
        expect(isValid).to.be.false
    })

    it('prove reputation with wrong graffiti pre image should fail', async () => {
        const attesterIds = Object.keys(reputationRecords)
        const attesterId = Number(attesterIds[Math.floor(Math.random() * NUM_ATTESTERS)])
        const wrongGraffitiPreImage = genRandomSalt()
        const circuitInputs = await genReputationCircuitInput(user, epoch, nonce, reputationRecords, attesterId, undefined, undefined, proveGraffiti, wrongGraffitiPreImage)

        await throwError(circuit, circuitInputs, "Wrong graffiti pre-image should throw error")

        const isValid = await genProofAndVerify(Circuit.proveReputation, circuitInputs)
        expect(isValid).to.be.false
    })
})