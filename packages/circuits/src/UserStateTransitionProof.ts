import { Circuit, Prover } from './circuits'
import { SnarkProof } from '@unirep/utils'
import { BigNumberish } from '@ethersproject/bignumber'
import { BaseProof } from './BaseProof'
import { CircuitConfig } from './CircuitConfig'

/**
 * The epoch key proof structure that helps to query the public signals
 */
export class UserStateTransitionProof extends BaseProof {
    readonly idx = {
        historyTreeRoot: 0,
        stateTreeLeaf: 1,
        epochKeys: 2,
        toEpoch: 3,
        attesterId: 4,
    }
    public historyTreeRoot: BigNumberish
    public stateTreeLeaf: BigNumberish
    public epochKeys: BigNumberish[]
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
        prover?: Prover,
        config: CircuitConfig = CircuitConfig.default
    ) {
        super(_publicSignals, _proof, prover)
        const { NUM_EPOCH_KEY_NONCE_PER_EPOCH } = config
        this.historyTreeRoot =
            _publicSignals[this.idx.historyTreeRoot].toString()
        this.stateTreeLeaf = _publicSignals[this.idx.stateTreeLeaf].toString()
        this.epochKeys = _publicSignals.slice(
            this.idx.epochKeys,
            this.idx.epochKeys + NUM_EPOCH_KEY_NONCE_PER_EPOCH
        )
        this.toEpoch =
            _publicSignals[
                this.idx.toEpoch + NUM_EPOCH_KEY_NONCE_PER_EPOCH - 1
            ].toString()
        this.attesterId =
            _publicSignals[
                this.idx.attesterId + NUM_EPOCH_KEY_NONCE_PER_EPOCH - 1
            ].toString()
        this.circuit = Circuit.userStateTransition
    }
}
