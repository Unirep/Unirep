import { CircuitConfig } from './CircuitConfig'

export type Field = bigint | string

/**
 * The data is used to build epoch key control.
 * @see https://developer.unirep.io/docs/circuits-api/circuits#epoch-key-proof
 */
export type EpochKeyControl = {
    nonce: bigint
    epoch: bigint
    attesterId: bigint
    revealNonce: bigint
    chainId: bigint
}

/**
 * The data is used to build reputation control.
 * @see https://developer.unirep.io/docs/circuits-api/circuits#reputation-proof
 */
export type ReputationControl = {
    minRep: bigint
    maxRep: bigint
    proveMinRep: bigint
    proveMaxRep: bigint
    proveZeroRep: bigint
    proveGraffiti: bigint
}

/**
 * The data is used to build user state transition control.
 * @see https://developer.unirep.io/docs/circuits-api/circuits#user-state-transition-proof
 */
export type UserStateTransitionControl = {
    attesterId: bigint
    toEpoch: bigint
}

/**
 * The data is used to build signup control.
 * @see https://developer.unirep.io/docs/circuits-api/circuits#signup-proof
 */
export type SignupControl = {
    attesterId: bigint
    epoch: bigint
    chainId: bigint
}

/**
 * Name of the circuits that are used in Unirep protocol
 * @example
 * ```ts
 * import { Circuit } from '@unirep/circuits'
 * console.log(Circuit.epochKey)
 * ```
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
 * The prover interface is used to write custom implementations for creating and verifying proofs.
 * This abstracts away the logic of loading the proving keys. For example, a prover implementation could load the keys from disk, from a remote url, etc.
 *
 * :::info
 * See the [`defaultProver`](https://developer.unirep.io/docs/circuits-api/modules/provers_defaultProver) for a nodejs implementation. <br/>
 * See the [`webProver`](https://developer.unirep.io/docs/circuits-api/modules/provers_defaultProver) for a browser compatible implementation.
 * :::
 */
export interface Prover {
    /**
     * The function should returns true if the proof of the circuit is valid, false otherwise.
     * @param circuitName Name of the circuit, which can be chosen from `Circuit`
     * @param publicSignals The public signals of the snark
     * @param proof The proof of the snark
     * @returns True if the proof is valid, false otherwise
     */
    verifyProof: (
        circuitName: string | Circuit,
        publicSignals: any,
        proof: any
    ) => Promise<boolean>

    /**
     * The function should return snark proof and snark public signals of given circuit and inputs
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
     * Get vkey from default built folder `zksnarkBuild/`
     * @param circuitName Name of the circuit, which can be chosen from `Circuit`
     * @returns vkey of the circuit
     */
    getVKey: (circuitName: string | Circuit) => Promise<any>

    /**
     * Get the current circuit config
     */
    getConfig?: () => CircuitConfig
}
