import path from 'path'
import { Circuit } from '../src'
import * as snarkjs from 'snarkjs'
import { SnarkProof, SnarkPublicSignals } from '@unirep/utils'

const buildPath = '../zksnarkBuild'

/**
 * https://developer.unirep.io/docs/circuits-api/default-prover
 */
export const defaultProver = {
    // TODO: update docs
    /**
     * Generate proof and public signals with `snarkjs.groth16.fullProve`
     * @param circuitName Name of the circuit, which can be chosen from `Circuit`
     * @param inputs The user inputs of the circuit
     * @returns snark proof and public signals
     * @see https://developer.unirep.io/docs/circuits-api/web-prover
     */
    genProofAndPublicSignals: async (
        circuitName: string | Circuit,
        inputs: any
    ): Promise<any> => {
        const circuitWasmPath = path.join(
            __dirname,
            buildPath,
            `${circuitName}.wasm`
        )
        const zkeyPath = path.join(__dirname, buildPath, `${circuitName}.zkey`)
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            inputs,
            circuitWasmPath,
            zkeyPath
        )

        return { proof, publicSignals }
    },

    /**
     * Verify the snark proof and public signals with `snarkjs.groth16.verify`
     * @param circuitName Name of the circuit, which can be chosen from `Circuit`
     * @param publicSignals The snark public signals that is generated from `genProofAndPublicSignals`
     * @param proof The snark proof that is generated from `genProofAndPublicSignals`
     * @returns True if the proof is valid, false otherwise
     * @see https://developer.unirep.io/docs/circuits-api/web-prover
     */
    verifyProof: async (
        circuitName: string | Circuit,
        publicSignals: SnarkPublicSignals,
        proof: SnarkProof
    ): Promise<boolean> => {
        const vkey = require(path.join(buildPath, `${circuitName}.vkey.json`))
        return snarkjs.groth16.verify(vkey, publicSignals, proof)
    },

    /**
     * Get vkey from default built folder `zksnarkBuild/`
     * @param name Name of the circuit, which can be chosen from `Circuit`
     * @returns The vkey of the circuit
     * @see https://developer.unirep.io/docs/circuits-api/web-prover
     */
    getVKey: async (name: string | Circuit) => {
        return require(path.join(buildPath, `${name}.vkey.json`))
    },
}
