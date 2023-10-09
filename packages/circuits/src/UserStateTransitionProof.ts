import { Circuit, Prover } from './type'
import { SnarkProof } from '@unirep/utils'
import { BaseProof } from './BaseProof'
import { CircuitConfig } from './CircuitConfig'
import {
    buildUserStateTransitionControl,
    decodeUserStateTransitionControl,
} from './utils'

/**
 * @see https://developer.unirep.io/docs/circuits-api/user-state-transition-proof
 */
export class UserStateTransitionProof extends BaseProof {
    // TODO: update docs
    /**
     * The index of the data in the public signals
     */
    readonly idx = {
        historyTreeRoot: 0,
        stateTreeLeaf: 1,
        epochKeys: 2,
        control: 5,
    }
    // original data
    /**
     * @see https://developer.unirep.io/docs/circuits-api/user-state-transition-proof#historytreeroot
     */
    public historyTreeRoot: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/user-state-transition-proof#statetreeleaf
     */
    public stateTreeLeaf: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/user-state-transition-proof#epochkeys
     */
    public epochKeys: bigint[]
    /**
     * @see https://developer.unirep.io/docs/circuits-api/user-state-transition-proof#control
     */
    public control: bigint
    // decoded data
    /**
     * @see https://developer.unirep.io/docs/circuits-api/user-state-transition-proof#attesterid
     */
    public attesterId: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/user-state-transition-proof#toepoch
     */
    public toEpoch: bigint

    /**
     * @see https://developer.unirep.io/docs/circuits-api/base-proof#constructor
     * @param publicSignals The public signals of the proof that can be verified by the prover
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

    /**
     * @see https://developer.unirep.io/docs/circuits-api/user-state-transition-proof#buildcontrol
     */
    static buildControl({ attesterId, toEpoch }) {
        const control = buildUserStateTransitionControl({
            attesterId: BigInt(attesterId),
            toEpoch: BigInt(toEpoch),
        })
        return control
    }
}
