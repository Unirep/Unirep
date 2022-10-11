import { Circuit, Prover } from '@unirep/circuits'
import { SnarkProof } from '@unirep/crypto'
import { BigNumberish } from 'ethers'
import { BaseProof } from './BaseProof'

/**
 * The epoch key proof structure that helps to query the public signals
 */
export class UserStateTransitionProof extends BaseProof {
    readonly idx = {
        fromGlobalStateTreeRoot: 0,
        globalStateTreeLeaf: 1,
        transitionNullifier: 2,
        fromEpoch: 3,
        toEpoch: 4,
        attesterId: 5,
        epochTreeRoot: 6,
    }
    public fromGlobalStateTreeRoot: BigNumberish
    public globalStateTreeLeaf: BigNumberish
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
        this.fromGlobalStateTreeRoot =
            _publicSignals[this.idx.fromGlobalStateTreeRoot].toString()
        this.globalStateTreeLeaf =
            _publicSignals[this.idx.globalStateTreeLeaf].toString()
        this.transitionNullifier =
            _publicSignals[this.idx.transitionNullifier].toString()
        this.fromEpoch = _publicSignals[this.idx.fromEpoch].toString()
        this.toEpoch = _publicSignals[this.idx.toEpoch].toString()
        this.attesterId = _publicSignals[this.idx.attesterId].toString()
        this.epochTreeRoot = _publicSignals[this.idx.epochTreeRoot].toString()
        this.circuit = Circuit.userStateTransition
    }
}
