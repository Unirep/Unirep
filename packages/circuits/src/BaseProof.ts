import {
    formatProofForVerifierContract,
    formatProofForSnarkjsVerification,
} from './utils'
import { SnarkProof } from '@unirep/utils'
import { Circuit, Prover } from './type'

/**
 * We build proofs using a `BaseProof` class that optionally supports verification.
 * Proof data can be expressed in one of two formats:
 *
 * 1. `SnarkProof` objects for verification by `snarkjs`
 * 2. `string[]` for contract verification.
 *
 * The `BaseProof` class can be used to convert between the two formats.
 * This class should not be used directly, but should instead be inherited.
 *
 * The base class for a proof that can be verified using a [`Prover`](https://developer.unirep.io/docs/circuits-api/interfaces/src.Prover).
 */
export class BaseProof {
    /**
     * The proof data in [`SnarkProof`](https://developer.unirep.io/docs/utils-api/interfaces/SnarkProof.md) format. Use this when manually verifying with `snarkjs`.
     */
    readonly _snarkProof: SnarkProof
    /**
     * The string name of the type of circuit this proof came from. For the `BaseProof` class this is undefined.
     */
    protected circuit?: Circuit

    /**
     * The raw array of public signals for the proof.
     */
    readonly publicSignals: bigint[]
    /**
     * The proof data formatted as `string[]`. Use this property when interacting with smart contracts.
     */
    public proof: bigint[]
    /**
     * The [`Prover`](https://developer.unirep.io/docs/circuits-api/interfaces/src.Prover) object.
     */
    public prover?: Prover

    /**
     * Create a new instance of the class.
     * @param publicSignals The public signals of the proof that can be verified by the prover
     * @param proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     * @example
     * ```ts
     * import { BaseProof } from '@unirep/circuits'
     *
     * class MyCustomProof extends BaseProof {
     *  constructor(publicSignals, proof, prover) {
     *   super(publicSignals, proof, prover)
     *
     *   // Specify a circuit name for the Prover
     *   // This is typically a filename
     *   this.circuit = 'MyCustomProof'
     *  }
     * }
     * ```
     */
    constructor(
        publicSignals: (bigint | string)[],
        proof: SnarkProof | (bigint | string)[],
        prover?: Prover
    ) {
        if (Array.isArray(proof)) {
            // assume it's formatted for verifier contract
            this.proof = proof.map((v) => BigInt(v))
            this._snarkProof = formatProofForSnarkjsVerification(
                proof.map((p) => p.toString())
            )
        } else if (typeof proof === 'object') {
            // assume it's a SnarkProof
            const formattedProof: any[] = formatProofForVerifierContract(proof)
            this._snarkProof = proof as SnarkProof
            this.proof = formattedProof
        } else {
            throw new Error('Invalid proof supplied')
        }
        this.publicSignals = publicSignals.map((v) => BigInt(v))
        this.prover = prover
    }

    /**
     * A function to verify the proof with the supplied `Prover`.
     * The `prover` property must be set either in the constructor or manually, otherwise this will throw.
     * @returns True if the proof is valid, false otherwise
     * @example
     * ```ts
     * const isValid: boolean = await proof.verify()
     * ```
     */
    public async verify(): Promise<boolean> {
        if (!this.prover) {
            throw new Error('No prover set')
        }
        if (!this.circuit) {
            throw new Error('No circuit specified')
        }
        return this.prover.verifyProof(
            this.circuit,
            this.publicSignals.map((n) => BigInt(n.toString())),
            this._snarkProof
        )
    }
}
