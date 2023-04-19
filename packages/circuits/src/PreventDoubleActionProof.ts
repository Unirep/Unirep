import { Circuit, Prover } from './circuits'
import { SnarkProof } from '@unirep/utils'
import { BaseProof } from './BaseProof'

/**
 * The prevent double action proof structure that helps to query the public signals
 */
export class PreventDoubleActionProof extends BaseProof {
    readonly idx = {
        epochKey: 0,
        stateTreeRoot: 1,
        control: 2,
        nullifier: 3,
        identityCommitment: 4,
        sigData: 5,
    }
    public revealNonce: bigint
    public attesterId: bigint
    public epoch: bigint
    public nonce: bigint
    public epochKey: bigint
    public stateTreeRoot: bigint
    public control: bigint
    public sigData: bigint
    public nullifier: bigint
    public identityCommitment: bigint

    /**
     * @param _publicSignals The public signals of the prevent double action proof that can be verified by the prover
     * @param _proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        _publicSignals: (bigint | string)[],
        _proof: SnarkProof,
        prover?: Prover
    ) {
        super(_publicSignals, _proof, prover)
        this.epochKey = this.publicSignals[this.idx.epochKey]
        this.stateTreeRoot = this.publicSignals[this.idx.stateTreeRoot]
        this.control = this.publicSignals[this.idx.control]
        this.sigData = this.publicSignals[this.idx.sigData]
        this.nullifier = this.publicSignals[this.idx.nullifier]
        this.identityCommitment =
            this.publicSignals[this.idx.identityCommitment]
        this.revealNonce = (BigInt(this.control) >> BigInt(232)) & BigInt(1)
        this.attesterId =
            (BigInt(this.control) >> BigInt(72)) &
            ((BigInt(1) << BigInt(160)) - BigInt(1))
        this.epoch =
            (BigInt(this.control) >> BigInt(8)) &
            ((BigInt(1) << BigInt(64)) - BigInt(1))
        this.nonce =
            BigInt(this.control) & ((BigInt(1) << BigInt(8)) - BigInt(1))
        this.circuit = Circuit.preventDoubleAction
    }
}
