import { Circuit, Prover } from './circuits'
import { SnarkProof } from '@unirep/utils'
import { BigNumberish } from '@ethersproject/bignumber'
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
    public revealNonce: BigNumberish
    public attesterId: BigNumberish
    public epoch: BigNumberish
    public nonce: BigNumberish
    public epochKey: BigNumberish
    public stateTreeRoot: BigNumberish
    public control: BigNumberish
    public sigData: BigNumberish
    public nullifier: BigNumberish
    public identityCommitment: BigNumberish

    /**
     * @param _publicSignals The public signals of the prevent double action proof that can be verified by the prover
     * @param _proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        _publicSignals: BigNumberish[],
        _proof: SnarkProof,
        prover?: Prover
    ) {
        super(_publicSignals, _proof, prover)
        this.epochKey = _publicSignals[this.idx.epochKey].toString()
        this.stateTreeRoot = _publicSignals[this.idx.stateTreeRoot].toString()
        this.control = _publicSignals[this.idx.control].toString()
        this.sigData = _publicSignals[this.idx.sigData].toString()
        this.nullifier = _publicSignals[this.idx.nullifier].toString()
        this.identityCommitment =
            _publicSignals[this.idx.identityCommitment].toString()
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
