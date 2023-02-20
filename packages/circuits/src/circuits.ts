import { SnarkProof } from '@unirep/utils'
import { CircuitConfig } from './CircuitConfig'

/**
 * Name of the circuits that are used in Unirep protocol
 */
export enum Circuit {
    epochKey = 'epochKey',
    proveReputation = 'proveReputation',
    userStateTransition = 'userStateTransition',
    signup = 'signup',
    epochKeyLite = 'epochKeyLite',
    buildOrderedTree = 'buildOrderedTree',
}

/**
 * Definition of interface that a Unirep prover should include
 */
export interface Prover {
    /**
     * The function should returns true if the proof of the circuit is valid, false otherwise.
     * @param name Name of the circuit, which can be chosen from `Circuit`
     * @param publicSignals The public signals of the snark
     * @param proof The proof of the snark
     * @returns True if the proof is valid, false otherwise
     */
    verifyProof: (
        name: string | Circuit,
        publicSignals: any,
        proof: any
    ) => Promise<boolean>

    /**
     * The function should return snark proof and snark public signals of given circuit and inputs
     * @param proofType Name of the circuit, which can be chosen from `Circuit`
     * @param inputs The user inputs of the circuit
     * @returns `proof` and `publicSignals` that can be verified by `Prover.verifyProof`
     */
    genProofAndPublicSignals: (
        proofType: string | Circuit,
        inputs: any
    ) => Promise<{
        proof: any
        publicSignals: any
    }>

    /**
     * Get vkey from default built folder `zksnarkBuild/`
     * @param name Name of the circuit, which can be chosen from `Circuit`
     * @returns vkey of the circuit
     */
    getVKey: (name: string | Circuit) => Promise<any>

    getConfig?: () => CircuitConfig
}

/**
 * Format snark proof for verifier smart contract
 * @param proof The proof of `SnarkProof` type
 * @returns An one dimensional array of stringified proof data
 */
export const formatProofForVerifierContract = (proof: SnarkProof): string[] => {
    return [
        proof.pi_a[0],
        proof.pi_a[1],
        proof.pi_b[0][1],
        proof.pi_b[0][0],
        proof.pi_b[1][1],
        proof.pi_b[1][0],
        proof.pi_c[0],
        proof.pi_c[1],
    ].map((x) => x.toString())
}

/**
 * Format an one dimensional array for `snarkjs` verification
 * @param proof The string array of the proof
 * @returns The `SnarkProof` type proof data
 */
export const formatProofForSnarkjsVerification = (
    proof: string[]
): SnarkProof => {
    return {
        pi_a: [BigInt(proof[0]), BigInt(proof[1]), BigInt('1')],
        pi_b: [
            [BigInt(proof[3]), BigInt(proof[2])],
            [BigInt(proof[5]), BigInt(proof[4])],
            [BigInt('1'), BigInt('0')],
        ],
        pi_c: [BigInt(proof[6]), BigInt(proof[7]), BigInt('1')],
    }
}
