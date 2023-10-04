import { CircuitConfig } from './CircuitConfig'

export type Field = bigint | string

export type EpochKeyControl = {
    nonce: bigint
    epoch: bigint
    attesterId: bigint
    revealNonce: bigint
    chainId: bigint
}

export type ReputationControl = {
    minRep: bigint
    maxRep: bigint
    proveMinRep: bigint
    proveMaxRep: bigint
    proveZeroRep: bigint
    proveGraffiti: bigint
}

export type UserStateTransitionControl = {
    attesterId: bigint
    toEpoch: bigint
}

export type SignupControl = {
    attesterId: bigint
    epoch: bigint
    chainId: bigint
}

/**
 * Name of the circuits that are used in Unirep protocol
 */
export enum Circuit {
    epochKey = 'epochKey',
    reputation = 'reputation',
    userStateTransition = 'userStateTransition',
    signup = 'signup',
    epochKeyLite = 'epochKeyLite',
    scopeNullifier = 'scopeNullifier',
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
