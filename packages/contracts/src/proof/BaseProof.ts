import {
    Circuit,
    formatProofForVerifierContract,
    Prover,
} from '@unirep/circuits'
import { SnarkProof } from '@unirep/crypto'
import { ethers, BigNumberish } from 'ethers'

export class BaseProof {
    private _snarkProof: SnarkProof
    protected circuit?: Circuit

    readonly publicSignals: BigNumberish[]
    public proof: BigNumberish[]
    public prover?: Prover

    constructor(
        publicSignals: BigNumberish[],
        proof: SnarkProof,
        prover?: Prover
    ) {
        this._snarkProof = proof
        const formattedProof: any[] = formatProofForVerifierContract(proof)
        this.proof = formattedProof
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
