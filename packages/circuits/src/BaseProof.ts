import {
    formatProofForVerifierContract,
    formatProofForSnarkjsVerification,
} from './utils'
import { Groth16Proof } from 'snarkjs'
import { Circuit, Prover } from './type'

/**
 * The basic proof structure that is used in unirep protocol
 */
export class BaseProof {
    readonly _snarkProof: Groth16Proof
    protected circuit?: Circuit

    readonly publicSignals: bigint[]
    public proof: bigint[]
    public prover?: Prover

    /**
     * @param publicSignals The public signals of the proof that can be verified by the prover
     * @param proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        publicSignals: (bigint | string)[],
        proof: Groth16Proof | (bigint | string)[],
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
            this._snarkProof = proof as Groth16Proof
            this.proof = formattedProof
        } else {
            throw new Error('Invalid proof supplied')
        }
        this.publicSignals = publicSignals.map((v) => BigInt(v))
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
            this.publicSignals.map((n) => BigInt(n.toString())),
            this._snarkProof
        )
    }
}
