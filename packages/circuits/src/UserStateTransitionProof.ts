import { Circuit, Prover } from './circuits'
import { SnarkProof } from '@unirep/utils'
import { BigNumberish } from '@ethersproject/bignumber'
import { BaseProof } from './BaseProof'

/**
 * The epoch key proof structure that helps to query the public signals
 */
export class UserStateTransitionProof extends BaseProof {
    readonly idx = {
        fromStateTreeRoot: 0,
        stateTreeLeaf: 1,
        transitionNullifier: 2,
        epochTreeRoot: 3,
        fromEpoch: 4,
        toEpoch: 5,
        attesterId: 6,
    }
    public fromStateTreeRoot: BigNumberish
    public stateTreeLeaf: BigNumberish
    public transitionNullifier: BigNumberish
    public fromEpoch: BigNumberish
    public toEpoch: BigNumberish
    public attesterId: BigNumberish
    public epochTreeRoot: BigNumberish

    /**
     * @param _publicSignals The public signals of the epoch key proof that can be verified by the prover
     * @param _proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        _publicSignals: BigNumberish[],
        _proof: SnarkProof,
        prover?: Prover
    ) {
        super(_publicSignals, _proof, prover)
        this.fromStateTreeRoot =
            _publicSignals[this.idx.fromStateTreeRoot].toString()
        this.stateTreeLeaf = _publicSignals[this.idx.stateTreeLeaf].toString()
        this.transitionNullifier =
            _publicSignals[this.idx.transitionNullifier].toString()
        this.fromEpoch = _publicSignals[this.idx.fromEpoch].toString()
        this.toEpoch = _publicSignals[this.idx.toEpoch].toString()
        this.attesterId = _publicSignals[this.idx.attesterId].toString()
        this.epochTreeRoot = _publicSignals[this.idx.epochTreeRoot].toString()
        this.circuit = Circuit.userStateTransition
    }
}
