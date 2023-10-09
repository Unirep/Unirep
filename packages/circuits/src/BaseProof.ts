import {
    formatProofForVerifierContract,
    formatProofForSnarkjsVerification,
} from './utils'
import { SnarkProof } from '@unirep/utils'
import { Circuit, Prover } from './type'

/**
 * @see https://developer.unirep.io/docs/circuits-api/base-proof
 */
export class BaseProof {
    /**
     * @see https://developer.unirep.io/docs/circuits-api/base-proof#_snarkproof
     */
    readonly _snarkProof: SnarkProof
    /**
     * @see https://developer.unirep.io/docs/circuits-api/base-proof#circuit
     */
    protected circuit?: Circuit

    /**
     * @see https://developer.unirep.io/docs/circuits-api/base-proof#publicsignals
     */
    readonly publicSignals: bigint[]
    /**
     * @see https://developer.unirep.io/docs/circuits-api/base-proof#proof
     */
    public proof: bigint[]
    /**
     * @see https://developer.unirep.io/docs/circuits-api/prover
     */
    public prover?: Prover

    /**
     * @see https://developer.unirep.io/docs/circuits-api/base-proof#constructor
     * @param publicSignals The public signals of the proof that can be verified by the prover
     * @param proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
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
     * @see https://developer.unirep.io/docs/circuits-api/base-proof#verify
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
