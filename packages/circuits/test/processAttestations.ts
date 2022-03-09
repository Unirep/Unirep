import * as path from 'path'
import { expect } from "chai"
import { genRandomSalt, hash5, genIdentity } from "@unirep/crypto"
import { executeCircuit, getSignalByName, Circuit } from "../circuits/utils"
import { Attestation, compileAndLoadCircuit, genProcessAttestationsCircuitInput, genProofAndVerify, throwError } from './utils'
import { numAttestationsPerProof, processAttestationsCircuitPath } from "../config/"

const circuitPath = path.join(__dirname, processAttestationsCircuitPath)

describe('Process attestation circuit', function () {
    this.timeout(300000)

    let circuit

    const epoch = BigInt(1)
    const nonce = BigInt(0)
    const toNonce = BigInt(1)
    const user = genIdentity()
    const signUp = 1

    let hashChainStarter = genRandomSalt()

    before(async () => {
        const startCompileTime = Math.floor(new Date().getTime() / 1000)
        circuit = await compileAndLoadCircuit(circuitPath)
        const endCompileTime = Math.floor(new Date().getTime() / 1000)
        console.log(`Compile time: ${endCompileTime - startCompileTime} seconds`)
    })

    it('successfully process attestations', async () => {
        const { circuitInputs, hashChainResult } = await genProcessAttestationsCircuitInput(user, epoch, nonce, nonce)

        const witness = await executeCircuit(circuit, circuitInputs)
        const outputUserState = getSignalByName(circuit, witness, 'main.blinded_user_state')
        const outputUserStateTreeRoot = circuitInputs.intermediate_user_state_tree_roots[numAttestationsPerProof]
        const expectedUserState = hash5([user['identityNullifier'], outputUserStateTreeRoot, epoch, nonce])
        expect(outputUserState).to.equal(expectedUserState)

        const outputHashChainResult = getSignalByName(circuit, witness, 'main.blinded_hash_chain_result')
        const expectedHashChainResult = hash5([user['identityNullifier'], hashChainResult, epoch, nonce])
        expect(outputHashChainResult).to.equal(expectedHashChainResult)

        const isValid = await genProofAndVerify(Circuit.processAttestations, circuitInputs)
        expect(isValid).to.be.true
    })

    it('successfully process zero attestations', async () => {
        let zeroSelectors: number[] = []
        for (let i = 0; i < numAttestationsPerProof; i++) {
            zeroSelectors.push(0)
        }
        const { circuitInputs, hashChainResult } = await genProcessAttestationsCircuitInput(user, epoch, nonce, nonce, zeroSelectors)
        const noAttestationHashChainResult = circuitInputs.hash_chain_starter
        const initialUserStateTreeRoot = circuitInputs.intermediate_user_state_tree_roots[0]
        const outputUserStateTreeRoot = initialUserStateTreeRoot

        const witness = await executeCircuit(circuit, circuitInputs)
        const outputUserState = getSignalByName(circuit, witness, 'main.blinded_user_state')
        const expectedUserState = hash5([user['identityNullifier'], outputUserStateTreeRoot, epoch, nonce])
        expect(outputUserState).to.equal(expectedUserState)

        const outputHashChainResult = getSignalByName(circuit, witness, 'main.blinded_hash_chain_result')
        const expectedHashChainResult = hash5([user['identityNullifier'], noAttestationHashChainResult, epoch, nonce])
        expect(outputHashChainResult).to.equal(expectedHashChainResult)
        hashChainStarter = hashChainResult
    })

    it('successfully continue to process attestations', async () => {
        const { circuitInputs, hashChainResult } = await genProcessAttestationsCircuitInput(user, epoch, nonce, nonce, undefined, hashChainStarter)
        const witness = await executeCircuit(circuit, circuitInputs)
        const outputUserState = getSignalByName(circuit, witness, 'main.blinded_user_state')
        const outputUserStateTreeRoot = circuitInputs.intermediate_user_state_tree_roots[numAttestationsPerProof]
        const expectedUserState = hash5([user['identityNullifier'], outputUserStateTreeRoot, epoch, nonce])
        expect(outputUserState).to.equal(expectedUserState)

        const outputHashChainResult = getSignalByName(circuit, witness, 'main.blinded_hash_chain_result')
        const expectedHashChainResult = hash5([user['identityNullifier'], hashChainResult, epoch, nonce])
        expect(outputHashChainResult).to.equal(expectedHashChainResult)
        hashChainStarter = hashChainResult
    })

    it('successfully continue to process attestations to next epoch key', async () => {
        const { circuitInputs, hashChainResult } = await genProcessAttestationsCircuitInput(user, epoch, nonce, toNonce, undefined, hashChainStarter)
        const witness = await executeCircuit(circuit, circuitInputs)
        const outputUserState = getSignalByName(circuit, witness, 'main.blinded_user_state')
        const outputUserStateTreeRoot = circuitInputs.intermediate_user_state_tree_roots[numAttestationsPerProof]
        const expectedUserState = hash5([user['identityNullifier'], outputUserStateTreeRoot, epoch, toNonce])
        expect(outputUserState).to.equal(expectedUserState)

        const outputHashChainResult = getSignalByName(circuit, witness, 'main.blinded_hash_chain_result')
        const expectedHashChainResult = hash5([user['identityNullifier'], hashChainResult, epoch, toNonce])
        expect(outputHashChainResult).to.equal(expectedHashChainResult)
        hashChainStarter = hashChainResult
    })

    it('Same attester give reputation to same epoch keys should work', async () => {
        const sameAttesterID = BigInt(1)
        const attestations: Attestation[] = []
        for (let i = 0; i < numAttestationsPerProof; i++) {
            const attestation: Attestation = new Attestation(
                sameAttesterID,
                BigInt(Math.floor(Math.random() * 100)),
                BigInt(Math.floor(Math.random() * 100)),
                genRandomSalt(),
                BigInt(signUp)
            )
            attestations.push(attestation)
        }
        const { circuitInputs, hashChainResult } = await genProcessAttestationsCircuitInput(user, epoch, toNonce, toNonce, undefined, undefined, attestations)

        const witness = await executeCircuit(circuit, circuitInputs)
        const outputUserState = getSignalByName(circuit, witness, 'main.blinded_user_state')
        const outputUserStateTreeRoot = circuitInputs.intermediate_user_state_tree_roots[numAttestationsPerProof]
        const expectedUserState = hash5([user['identityNullifier'], outputUserStateTreeRoot, epoch, toNonce])
        expect(outputUserState).to.equal(expectedUserState)

        const outputHashChainResult = getSignalByName(circuit, witness, 'main.blinded_hash_chain_result')
        const expectedHashChainResult = hash5([user['identityNullifier'], hashChainResult, epoch, toNonce])
        expect(outputHashChainResult).to.equal(expectedHashChainResult)
        hashChainStarter = hashChainResult
    })

    it('Sign up flag should not be overwritten', async () => {
        let selectors: number[] = []
        for (let i = 0; i < numAttestationsPerProof; i++) {
            selectors.push(1)
        }
        const sameAttesterID = BigInt(1)
        const notSignUp = 0
        const attestations: Attestation[] = []
        // sign the user up
        const signUpAttestation = new Attestation(
            sameAttesterID,
            BigInt(Math.floor(Math.random() * 100)),
            BigInt(Math.floor(Math.random() * 100)),
            genRandomSalt(),
            BigInt(signUp)
        )
        attestations.push(signUpAttestation)
        // attestations without sign up flag
        for (let i = 1; i < numAttestationsPerProof; i++) {
            const attestation: Attestation = new Attestation(
                sameAttesterID,
                BigInt(Math.floor(Math.random() * 100)),
                BigInt(Math.floor(Math.random() * 100)),
                genRandomSalt(),
                BigInt(notSignUp)
            )
            attestations.push(attestation)
        }
        const { circuitInputs, hashChainResult } = await genProcessAttestationsCircuitInput(user, epoch, toNonce, toNonce, selectors, undefined, attestations)
        const witness = await executeCircuit(circuit, circuitInputs)
        const outputUserState = getSignalByName(circuit, witness, 'main.blinded_user_state')
        const outputUserStateTreeRoot = circuitInputs.intermediate_user_state_tree_roots[numAttestationsPerProof]
        const expectedUserState = hash5([user['identityNullifier'], outputUserStateTreeRoot, epoch, toNonce])
        expect(outputUserState).to.equal(expectedUserState)

        const outputHashChainResult = getSignalByName(circuit, witness, 'main.blinded_hash_chain_result')
        const expectedHashChainResult = hash5([user['identityNullifier'], hashChainResult, epoch, toNonce])
        expect(outputHashChainResult).to.equal(expectedHashChainResult)
    })

    it('process attestations with wrong attestation record should not work', async () => {
        let selectors: number[] = []
        for (let i = 0; i < numAttestationsPerProof; i++) {
            selectors.push(1)
        }
        const { circuitInputs } = await genProcessAttestationsCircuitInput(user, epoch, toNonce, toNonce, selectors)
        let indexWrongAttestationRecord = Math.floor(Math.random() * numAttestationsPerProof)
        while (selectors[indexWrongAttestationRecord] == 0) indexWrongAttestationRecord = (indexWrongAttestationRecord + 1) % numAttestationsPerProof
        circuitInputs.old_pos_reps[indexWrongAttestationRecord] = Math.floor(Math.random() * 100).toString()
        circuitInputs.old_neg_reps[indexWrongAttestationRecord] = Math.floor(Math.random() * 100).toString()
        circuitInputs.graffities[indexWrongAttestationRecord] = genRandomSalt().toString()

        await throwError(circuit, circuitInputs, "Root mismatch results from wrong attestation record should throw error")
    })

    it('process attestations with wrong intermediate roots should not work', async () => {
        const { circuitInputs } = await genProcessAttestationsCircuitInput(user, epoch, toNonce, toNonce)
        const indexWrongRoot = Math.floor(Math.random() * numAttestationsPerProof)
        circuitInputs.intermediate_user_state_tree_roots[indexWrongRoot] = genRandomSalt().toString()

        await throwError(circuit, circuitInputs, "Root mismatch results from wrong intermediate roots should throw error")
    })

    it('process attestations with wrong path elements should not work', async () => {
        const { circuitInputs } = await genProcessAttestationsCircuitInput(user, epoch, toNonce, toNonce)
        const indexWrongPathElements = Math.floor(Math.random() * numAttestationsPerProof)
        circuitInputs.path_elements[indexWrongPathElements].reverse()

        await throwError(circuit, circuitInputs, "Root mismatch results from wrong path elements should throw error")
    })

    it('process attestations with incorrect number of elements should fail', async () => {
        const { circuitInputs } = await genProcessAttestationsCircuitInput(user, epoch, toNonce, toNonce)
        circuitInputs.attester_ids = circuitInputs.attester_ids.concat(['4'])
        
        await throwError(circuit, circuitInputs, "Incorrect number of elements should throw error")
    })
})