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
        control: 2,
    }

    public identityCommitment: bigint
    public stateTreeLeaf: bigint
    public attesterId: bigint
    public epoch: bigint
    public control: bigint

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
        this.control = this.publicSignals[this.idx.control]
        this.epoch =
            (BigInt(this.control) >> BigInt(160)) &
            ((BigInt(1) << BigInt(48)) - BigInt(1))
        this.attesterId =
            BigInt(this.control) & ((BigInt(1) << BigInt(160)) - BigInt(1))
        this.circuit = Circuit.signup
    }

    static buildControl({ attesterId, epoch }: any) {
        let control = BigInt(attesterId)
        control += BigInt(epoch) << BigInt(160)
        return control
    }
}
