import {
    Circuit,
    formatProofForVerifierContract,
    formatProofForSnarkjsVerification,
    Prover,
} from './circuits'
import { SnarkProof } from '@unirep/utils'
import { BigNumberish } from '@ethersproject/bignumber'
import { keccak256 } from '@ethersproject/solidity'

/**
 * The basic proof structure that is used in unirep protocol
 */
export class BaseProof {
    readonly _snarkProof: SnarkProof
    protected circuit?: Circuit

    readonly publicSignals: BigNumberish[]
    public proof: BigNumberish[]
    public prover?: Prover

    /**
     * @param publicSignals The public signals of the proof that can be verified by the prover
     * @param proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        publicSignals: BigNumberish[],
        proof: SnarkProof | BigNumberish[],
        prover?: Prover
    ) {
        if (Array.isArray(proof)) {
            // assume it's formatted for verifier contract
            this.proof = proof
            this._snarkProof = formatProofForSnarkjsVerification(
                proof.map((p) => p.toString())
            )
        } else if (typeof proof === 'object') {
            // assume it's a SnarkProof
            const formattedProof: any[] = formatProofForVerifierContract(proof)
            this._snarkProof = proof
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
            this.publicSignals.map((n) => BigInt(n.toString())),
            this._snarkProof
        )
    }

    /**
     * Proof hash is used to find the proof index in the smart contract.
     * A submitted proof can obtain a proof index and a unique hash value
     * @returns A `keccak256` hash value of public signals and proof
     */
    public hash(): string {
        return keccak256(
            ['uint256[]', 'uint256[8]'],
            [this.publicSignals, this.proof]
        )
    }
}
