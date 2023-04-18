import { Circuit, Prover } from './circuits'
import { SnarkProof } from '@unirep/utils'
import { BaseProof } from './BaseProof'

/**
 * The sign up proof structure that helps to query the public signals
 */
export class SignupProof extends BaseProof {
    readonly idx = {
        identityCommitment: 0,
        stateTreeLeaf: 1,
        attesterId: 2,
        epoch: 3,
    }

    public identityCommitment: bigint
    public stateTreeLeaf: bigint
    public attesterId: bigint
    public epoch: bigint

    /**
     * @param _publicSignals The public signals of the user sign up proof that can be verified by the prover
     * @param _proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        _publicSignals: (bigint | string)[],
        _proof: SnarkProof,
        prover?: Prover
    ) {
        super(_publicSignals, _proof, prover)
        this.identityCommitment =
            this.publicSignals[this.idx.identityCommitment]
        this.stateTreeLeaf = this.publicSignals[this.idx.stateTreeLeaf]
        this.attesterId = this.publicSignals[this.idx.attesterId]
        this.epoch = this.publicSignals[this.idx.epoch]
        this.circuit = Circuit.signup
    }
}
