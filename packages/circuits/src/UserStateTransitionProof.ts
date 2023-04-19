import { Circuit, Prover } from './circuits'
import { SnarkProof } from '@unirep/utils'
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
    public historyTreeRoot: bigint
    public stateTreeLeaf: bigint
    public epochKeys: bigint[]
    public toEpoch: bigint
    public attesterId: bigint

    /**
     * @param _publicSignals The public signals of the epoch key proof that can be verified by the prover
     * @param _proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        _publicSignals: (bigint | string)[],
        _proof: SnarkProof,
        prover?: Prover,
        config: CircuitConfig = CircuitConfig.default
    ) {
        super(_publicSignals, _proof, prover)
        const { NUM_EPOCH_KEY_NONCE_PER_EPOCH } = config
        this.historyTreeRoot = this.publicSignals[this.idx.historyTreeRoot]
        this.stateTreeLeaf = this.publicSignals[this.idx.stateTreeLeaf]
        this.epochKeys = this.publicSignals.slice(
            this.idx.epochKeys,
            this.idx.epochKeys + NUM_EPOCH_KEY_NONCE_PER_EPOCH
        )
        this.toEpoch =
            this.publicSignals[
                this.idx.toEpoch + NUM_EPOCH_KEY_NONCE_PER_EPOCH - 1
            ]
        this.attesterId =
            this.publicSignals[
                this.idx.attesterId + NUM_EPOCH_KEY_NONCE_PER_EPOCH - 1
            ]
        this.circuit = Circuit.userStateTransition
    }
}
