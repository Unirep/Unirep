import { Circuit, Prover } from './circuits'
import { SnarkProof } from '@unirep/utils'
import { BigNumberish } from '@ethersproject/bignumber'
import { BaseProof } from './BaseProof'

/**
 * The epoch key proof structure that helps to query the public signals
 */
export class UserStateTransitionProof extends BaseProof {
    readonly idx = {
        stateTreeLeaf: 0,
        transitionNullifier: 1,
        historyTreeRoot: 2,
        toEpoch: 3,
        attesterId: 4,
    }
    public stateTreeLeaf: BigNumberish
    public transitionNullifier: BigNumberish
    public historyTreeRoot: BigNumberish
    public toEpoch: BigNumberish
    public attesterId: BigNumberish

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
        this.stateTreeLeaf = _publicSignals[this.idx.stateTreeLeaf].toString()
        this.transitionNullifier =
            _publicSignals[this.idx.transitionNullifier].toString()
        this.historyTreeRoot =
            _publicSignals[this.idx.historyTreeRoot].toString()
        this.toEpoch = _publicSignals[this.idx.toEpoch].toString()
        this.attesterId = _publicSignals[this.idx.attesterId].toString()
        this.circuit = Circuit.userStateTransition
    }
}
