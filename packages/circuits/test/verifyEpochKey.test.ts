import * as path from 'path'
import { expect } from 'chai'
import {
    genRandomSalt,
    hashLeftRight,
    IncrementalMerkleTree,
    ZkIdentity,
} from '@unirep/crypto'
import {
    Circuit,
    executeCircuit,
    formatProofForSnarkjsVerification,
    formatProofForVerifierContract,
} from '../src'
import { defaultProver } from '../provers/defaultProver'

import {
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
} from '../config'

import { verifyEpochKeyCircuitPath } from '../config'
import {
    compileAndLoadCircuit,
    genEpochKeyCircuitInput,
    genProofAndVerify,
    throwError,
} from './utils'

const circuitPath = path.join(__dirname, verifyEpochKeyCircuitPath)

describe('Verify Epoch Key circuits', function () {
    this.timeout(300000)

    let circuit

    const maxEPK = BigInt(2 ** EPOCH_TREE_DEPTH)

    let id: ZkIdentity, commitment, stateRoot
    let tree, leafIndex
    let nonce, currentEpoch
    let circuitInputs

    before(async () => {
        const startCompileTime = Math.floor(new Date().getTime() / 1000)
        circuit = await compileAndLoadCircuit(circuitPath)
        const endCompileTime = Math.floor(new Date().getTime() / 1000)
        console.log(
            `Compile time: ${endCompileTime - startCompileTime} seconds`
        )

        tree = new IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
        id = new ZkIdentity()
        commitment = id.genIdentityCommitment()
        stateRoot = genRandomSalt()

        const hashedStateLeaf = hashLeftRight(
            commitment.toString(),
            stateRoot.toString()
        )
        tree.insert(BigInt(hashedStateLeaf.toString()))

        leafIndex = 0
        nonce = 0
        currentEpoch = 1
    })

    it('Valid epoch key should pass check', async () => {
        // Check if every valid nonce works
        for (let i = 0; i < NUM_EPOCH_KEY_NONCE_PER_EPOCH; i++) {
            const n = i
            circuitInputs = genEpochKeyCircuitInput(
                id,
                tree,
                leafIndex,
                stateRoot,
                currentEpoch,
                n
            )

            await executeCircuit(circuit, circuitInputs)
            const isValid = await genProofAndVerify(
                Circuit.verifyEpochKey,
                circuitInputs
            )
            expect(isValid).to.be.true
        }
    })

    it('Format proof should successully be verified', async () => {
        const n = 0
        const circuitInputs = genEpochKeyCircuitInput(
            id,
            tree,
            leafIndex,
            stateRoot,
            currentEpoch,
            n
        )
        const { proof, publicSignals } =
            await defaultProver.genProofAndPublicSignals(
                Circuit.verifyEpochKey,
                circuitInputs
            )
        let isValid = await defaultProver.verifyProof(
            Circuit.verifyEpochKey,
            publicSignals,
            proof
        )
        const formatProof = formatProofForVerifierContract(proof)
        const snarkjsProof = formatProofForSnarkjsVerification(formatProof)
        isValid = await defaultProver.verifyProof(
            Circuit.verifyEpochKey,
            publicSignals,
            snarkjsProof
        )
        expect(isValid).to.be.true
    })

    it('Invalid epoch key should not pass check', async () => {
        // Validate against invalid epoch key
        const invalidEpochKey1 = maxEPK
        const invalidCircuitInputs = genEpochKeyCircuitInput(
            id,
            tree,
            leafIndex,
            stateRoot,
            currentEpoch,
            nonce
        )
        invalidCircuitInputs.epoch_key = invalidEpochKey1

        await throwError(
            circuit,
            invalidCircuitInputs,
            'Epoch key too large should throw error'
        )
    })

    it('Wrong Id should not pass check', async () => {
        const fakeId = new ZkIdentity()
        const invalidCircuitInputs = (circuitInputs = genEpochKeyCircuitInput(
            fakeId,
            tree,
            leafIndex,
            stateRoot,
            currentEpoch,
            nonce
        ))
        const { publicSignals } = await defaultProver.genProofAndPublicSignals(
            Circuit.verifyEpochKey,
            circuitInputs
        )
        expect(publicSignals[1]).to.not.equal(stateRoot)
    })

    it('Mismatched GST tree root should not pass check', async () => {
        const otherTreeRoot = genRandomSalt()
        const invalidCircuitInputs = (circuitInputs = genEpochKeyCircuitInput(
            id,
            tree,
            leafIndex,
            otherTreeRoot,
            currentEpoch,
            nonce
        ))
        const { publicSignals } = await defaultProver.genProofAndPublicSignals(
            Circuit.verifyEpochKey,
            circuitInputs
        )
        expect(publicSignals[1]).to.not.equal(stateRoot)
    })

    it('Invalid nonce should not pass check', async () => {
        const invalidNonce = NUM_EPOCH_KEY_NONCE_PER_EPOCH
        const invalidCircuitInputs = (circuitInputs = genEpochKeyCircuitInput(
            id,
            tree,
            leafIndex,
            stateRoot,
            currentEpoch,
            invalidNonce
        ))

        await throwError(
            circuit,
            invalidCircuitInputs,
            'Invalid nonce should throw error'
        )
    })

    it('Invalid epoch should not pass check', async () => {
        const invalidEpoch = currentEpoch + 1
        const invalidCircuitInputs = genEpochKeyCircuitInput(
            id,
            tree,
            leafIndex,
            stateRoot,
            currentEpoch,
            nonce
        )
        invalidCircuitInputs.epoch = invalidEpoch
        const { publicSignals } = await defaultProver.genProofAndPublicSignals(
            Circuit.verifyEpochKey,
            circuitInputs
        )
        expect(publicSignals[1]).to.not.equal(stateRoot)
    })
})
