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
    // original data
    public historyTreeRoot: bigint
    public stateTreeLeaf: bigint
    public epochKeys: bigint[]
    public control: bigint
    // decoded data
    public attesterId: bigint
    public toEpoch: bigint

    /**
     * @param publicSignals The public signals of the epoch key proof that can be verified by the prover
     * @param proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        publicSignals: (bigint | string)[],
        proof: SnarkProof,
        prover?: Prover,
        config: CircuitConfig = CircuitConfig.default
    ) {
        super(publicSignals, proof, prover)
        const { NUM_EPOCH_KEY_NONCE_PER_EPOCH } = config
        this.historyTreeRoot = BigInt(
            this.publicSignals[this.idx.historyTreeRoot]
        )
        this.stateTreeLeaf = BigInt(this.publicSignals[this.idx.stateTreeLeaf])
        this.epochKeys = this.publicSignals
            .slice(
                this.idx.epochKeys,
                this.idx.epochKeys + NUM_EPOCH_KEY_NONCE_PER_EPOCH
            )
            .map((n) => BigInt(n))
        this.control = BigInt(this.publicSignals[this.idx.control])
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
