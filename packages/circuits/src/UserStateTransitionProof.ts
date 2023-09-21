import { Circuit, Prover } from './type'
import { SnarkProof } from '@unirep/utils'
import { BaseProof } from './BaseProof'
import { CircuitConfig } from './CircuitConfig'
import {
    buildUserStateTransitionControl,
    decodeUserStateTransitionControl,
} from './utils'

/**
 * The epoch key proof structure that helps to query the public signals
 */
export class UserStateTransitionProof extends BaseProof {
    readonly idx = {
        historyTreeRoot: 0,
        stateTreeLeaf: 1,
        epochKeys: 2,
        control: 5,
    }
    public historyTreeRoot: string
    public stateTreeLeaf: string
    public epochKeys: string[]
    public toEpoch: bigint
    public attesterId: bigint
    public control: string

    /**
     * @param publicSignals The public signals of the epoch key proof that can be verified by the prover
     * @param proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        publicSignals: string[],
        proof: SnarkProof,
        prover?: Prover,
        config: CircuitConfig = CircuitConfig.default
    ) {
        super(publicSignals, proof, prover)
        const { NUM_EPOCH_KEY_NONCE_PER_EPOCH } = config
        this.historyTreeRoot = this.publicSignals[this.idx.historyTreeRoot]
        this.stateTreeLeaf = this.publicSignals[this.idx.stateTreeLeaf]
        this.epochKeys = this.publicSignals.slice(
            this.idx.epochKeys,
            this.idx.epochKeys + NUM_EPOCH_KEY_NONCE_PER_EPOCH
        )
        this.control = this.publicSignals[this.idx.control]
        const { attesterId, toEpoch } = decodeUserStateTransitionControl(
            this.control
        )
        this.attesterId = attesterId
        this.toEpoch = toEpoch
        this.circuit = Circuit.userStateTransition
    }

    static buildControl({ attesterId, toEpoch }) {
        const control = buildUserStateTransitionControl({
            attesterId: BigInt(attesterId),
            toEpoch: BigInt(toEpoch),
        })
        return control
    }
}
