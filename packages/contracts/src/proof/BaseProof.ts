import {
    Circuit,
    formatProofForVerifierContract,
    formatProofForSnarkjsVerification,
    Prover,
} from '@unirep/circuits'
import { SnarkProof } from '@unirep/crypto'
import { ethers, BigNumberish } from 'ethers'

export class BaseProof {
    readonly _snarkProof: SnarkProof
    protected circuit?: Circuit

    readonly publicSignals: BigNumberish[]
    public proof: BigNumberish[]
    public prover?: Prover

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

    public hash(): string {
        return ethers.utils.solidityKeccak256(
            ['uint256[]', 'uint256[8]'],
            [this.publicSignals, this.proof]
        )
    }
}
