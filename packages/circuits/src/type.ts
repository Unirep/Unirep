import { CircuitConfig } from './CircuitConfig'

export type Field = bigint | string

// TODO: update doc
/**
 * The elements are used to build epoch key control field
 */
export type EpochKeyControl = {
    nonce: bigint
    epoch: bigint
    attesterId: bigint
    revealNonce: bigint
    chainId: bigint
}

// TODO: update doc
/**
 * The elements are used to build reputation control field
 */
export type ReputationControl = {
    minRep: bigint
    maxRep: bigint
    proveMinRep: bigint
    proveMaxRep: bigint
    proveZeroRep: bigint
    proveGraffiti: bigint
}

// TODO: update doc
/**
 * The elements are used to build user state transition control field
 */
export type UserStateTransitionControl = {
    attesterId: bigint
    toEpoch: bigint
}

// TODO: update doc
/**
 * The elements are used to build user sign up control field
 */
export type SignupControl = {
    attesterId: bigint
    epoch: bigint
    chainId: bigint
}

/**
 * @see https://developer.unirep.io/docs/circuits-api/circuits
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
 * @see https://developer.unirep.io/docs/circuits-api/prover
 */
export interface Prover {
    /**
     * @see https://developer.unirep.io/docs/circuits-api/prover#verifyproof
     * @param circuitName Name of the circuit, which can be chosen from `Circuit`
     * @param publicSignals The snark public signals that is generated from `genProofAndPublicSignals`
     * @param proof The snark proof that is generated from `genProofAndPublicSignals`
     * @returns True if the proof is valid, false otherwise
     */
    verifyProof: (
        circuitName: string | Circuit,
        publicSignals: any,
        proof: any
    ) => Promise<boolean>

    /**
     * @see https://developer.unirep.io/docs/circuits-api/prover#genproofandpublicsignals
     * @param circuitName Name of the circuit, which can be chosen from `Circuit`
     * @param inputs The user inputs of the circuit
     * @returns `proof` and `publicSignals` that can be verified by `Prover.verifyProof`
     */
    genProofAndPublicSignals: (
        circuitName: string | Circuit,
        inputs: any
    ) => Promise<{
        proof: any
        publicSignals: any
    }>

    /**
     * @see https://developer.unirep.io/docs/circuits-api/prover#getvkey
     * @param circuitName Name of the circuit, which can be chosen from `Circuit`
     * @returns The vkey of the circuit
     */
    getVKey: (circuitName: string | Circuit) => Promise<any>

    getConfig?: () => CircuitConfig
}
