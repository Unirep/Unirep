import * as path from 'path'
import { expect } from "chai"
import { genRandomSalt, hashLeftRight, genIdentity, genIdentityCommitment, IncrementalQuinTree, } from "@unirep/crypto"
import { Circuit, executeCircuit, formatProofForSnarkjsVerification, formatProofForVerifierContract, genProofAndPublicSignals, verifyProof } from "../circuits/utils"
import { numEpochKeyNoncePerEpoch, circuitEpochTreeDepth, circuitGlobalStateTreeDepth, verifyEpochKeyCircuitPath } from "../config"
import { compileAndLoadCircuit, genEpochKeyCircuitInput, throwError } from './utils'

const circuitPath = path.join(__dirname, verifyEpochKeyCircuitPath)

describe('Verify Epoch Key circuits', function () {
    this.timeout(300000)

    let circuit
    let ZERO_VALUE = 0

    const maxEPK = BigInt(2 ** circuitEpochTreeDepth)

    let id, commitment, stateRoot
    let tree, leafIndex
    let nonce, currentEpoch
    let circuitInputs

    before(async () => {
        const startCompileTime = Math.floor(new Date().getTime() / 1000)
        circuit = await compileAndLoadCircuit(circuitPath)
        const endCompileTime = Math.floor(new Date().getTime() / 1000)
        console.log(`Compile time: ${endCompileTime - startCompileTime} seconds`)

        tree = new IncrementalQuinTree(circuitGlobalStateTreeDepth, ZERO_VALUE, 2)
        id = genIdentity()
        commitment = genIdentityCommitment(id)
        stateRoot = genRandomSalt()

        const hashedStateLeaf = hashLeftRight(commitment.toString(), stateRoot.toString())
        tree.insert(BigInt(hashedStateLeaf.toString()))

        leafIndex = 0
        nonce = 0
        currentEpoch = 1
    })

    it('Valid epoch key should pass check', async () => {
        // Check if every valid nonce works
        for (let i = 0; i < numEpochKeyNoncePerEpoch; i++) {
            const n = i
            circuitInputs = genEpochKeyCircuitInput(id, tree, leafIndex, stateRoot, currentEpoch, n)

            await executeCircuit(circuit, circuitInputs)
            const startTime = new Date().getTime()
            const { proof, publicSignals } = await genProofAndPublicSignals(Circuit.verifyEpochKey, circuitInputs)
            const endTime = new Date().getTime()
            console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`)
            let isValid = await verifyProof(Circuit.verifyEpochKey, proof, publicSignals)
            expect(isValid).to.be.true

            const formatProof = formatProofForVerifierContract(proof)
            const snarkjsProof = formatProofForSnarkjsVerification(formatProof)
            isValid = await verifyProof(Circuit.verifyEpochKey, snarkjsProof, publicSignals)
            expect(isValid).to.be.true
        }
    })

    it('Invalid epoch key should not pass check', async () => {
        // Validate against invalid epoch key
        const invalidEpochKey1 = maxEPK
        const invalidCircuitInputs = genEpochKeyCircuitInput(id, tree, leafIndex, stateRoot, currentEpoch, nonce)
        invalidCircuitInputs.epoch_key = invalidEpochKey1

        await throwError(circuit, invalidCircuitInputs, "Epoch key too large should throw error")
    })

    it('Wrong Id should not pass check', async () => {
        const fakeId = genIdentity()
        const invalidCircuitInputs = circuitInputs = genEpochKeyCircuitInput(fakeId, tree, leafIndex, stateRoot, currentEpoch, nonce)
        
        await throwError(circuit, invalidCircuitInputs, "Wrong Id should throw error")
    })

    it('Mismatched GST tree root should not pass check', async () => {
        const otherTreeRoot = genRandomSalt()
        const invalidCircuitInputs = circuitInputs = genEpochKeyCircuitInput(id, tree, leafIndex, otherTreeRoot, currentEpoch, nonce)

        await throwError(circuit, invalidCircuitInputs, "Wrong GST Root should throw error")
    })

    it('Invalid nonce should not pass check', async () => {
        const invalidNonce = numEpochKeyNoncePerEpoch
        const invalidCircuitInputs = circuitInputs = genEpochKeyCircuitInput(id, tree, leafIndex, stateRoot, currentEpoch, invalidNonce)

        await throwError(circuit, invalidCircuitInputs, "Invalid nonce should throw error")
    })

    it('Invalid epoch should not pass check', async () => {
        let invalidEpoch
        invalidEpoch = currentEpoch + 1
        const invalidCircuitInputs = genEpochKeyCircuitInput(id, tree, leafIndex, stateRoot, currentEpoch, nonce)
        invalidCircuitInputs.epoch = invalidEpoch

        await throwError(circuit, invalidCircuitInputs, "Wrong epoch should throw error")
    })
})