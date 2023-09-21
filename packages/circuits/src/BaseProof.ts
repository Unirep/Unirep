import {
    formatProofForVerifierContract,
    formatProofForSnarkjsVerification,
} from './utils'
import { SnarkProof } from '@unirep/utils'
import { Circuit, Prover } from './type'

/**
 * The basic proof structure that is used in unirep protocol
 */
export class BaseProof {
    readonly _snarkProof: SnarkProof
    protected circuit?: Circuit

    readonly publicSignals: string[]
    public proof: string[]
    public prover?: Prover

    /**
     * @param publicSignals The public signals of the proof that can be verified by the prover
     * @param proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        publicSignals: string[],
        proof: SnarkProof | string[],
        prover?: Prover
    ) {
        if (Array.isArray(proof)) {
            this.proof = proof
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
        this.publicSignals = publicSignals
        this.prover = prover
    }

    /**
     * Call the `verifyProof` function in the prover that verifies the proof.
     * @returns True if the proof is valid, false otherwise
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
            this.publicSignals,
            this._snarkProof
        )
    }
}
