import * as path from 'path'
import { expect } from 'chai'
import { genRandomSalt, ZkIdentity, hashOne } from '@unirep/crypto'
import { Circuit, executeCircuit } from '../src'
import {
    genEpochKey,
    Reputation,
    compileAndLoadCircuit,
    genProveSignUpCircuitInput,
    throwError,
    genProofAndVerify,
} from './utils'
import { proveUserSignUpCircuitPath, EPOCH_TREE_DEPTH } from '../config'
const circuitPath = path.join(__dirname, proveUserSignUpCircuitPath)

describe('Prove user has signed up circuit', function () {
    this.timeout(300000)

    let circuit

    const epoch = 1
    const user = new ZkIdentity()

    let reputationRecords = {}
    const MIN_POS_REP = 20
    const MAX_NEG_REP = 10
    const signUp = 1
    const notSignUp = 0
    const signedUpAttesterId = 1
    const nonSignedUpAttesterId = 2

    before(async () => {
        const startCompileTime = Math.floor(new Date().getTime() / 1000)
        circuit = await compileAndLoadCircuit(circuitPath)
        const endCompileTime = Math.floor(new Date().getTime() / 1000)
        console.log(
            `Compile time: ${endCompileTime - startCompileTime} seconds`
        )

        // Bootstrap reputation
        const graffitiPreImage = genRandomSalt()
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
        const circuitInputs = genProveSignUpCircuitInput(
            user,
            epoch,
            reputationRecords,
            attesterId
        )

        await executeCircuit(circuit, circuitInputs)

        const isValid = await genProofAndVerify(
            Circuit.proveUserSignUp,
            circuitInputs
        )
        expect(isValid).to.be.true
    })

    it('user does not sign up should success', async () => {
        const attesterId = nonSignedUpAttesterId
        const circuitInputs = genProveSignUpCircuitInput(
            user,
            epoch,
            reputationRecords,
            attesterId
        )

        await executeCircuit(circuit, circuitInputs)

        const isValid = await genProofAndVerify(
            Circuit.proveUserSignUp,
            circuitInputs
        )
        expect(isValid).to.be.true
    })

    it('prove with wrong attester id should fail', async () => {
        const attesterId = nonSignedUpAttesterId
        const wrongAttesterId = signedUpAttesterId
        const circuitInputs = genProveSignUpCircuitInput(
            user,
            epoch,
            reputationRecords,
            attesterId
        )
        circuitInputs.attester_id = wrongAttesterId

        await throwError(
            circuit,
            circuitInputs,
            'Wrong attester id should throw error'
        )

        const isValid = await genProofAndVerify(
            Circuit.proveUserSignUp,
            circuitInputs
        )
        expect(isValid).to.be.false
    })

    it('forge signed up flag should fail', async () => {
        const attesterId = nonSignedUpAttesterId
        const wrongSignUpInfo = 1
        const circuitInputs = genProveSignUpCircuitInput(
            user,
            epoch,
            reputationRecords,
            attesterId
        )
        circuitInputs.sign_up = wrongSignUpInfo

        await throwError(
            circuit,
            circuitInputs,
            'Forge sign up flag should throw error'
        )

        const isValid = await genProofAndVerify(
            Circuit.proveUserSignUp,
            circuitInputs
        )
        expect(isValid).to.be.false
    })
})
