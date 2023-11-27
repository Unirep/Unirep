import { Circuit, Prover } from './type'
import { Groth16Proof } from 'snarkjs'
import { BaseProof } from './BaseProof'
import { CircuitConfig } from './CircuitConfig'
import {
    buildUserStateTransitionControl,
    decodeUserStateTransitionControl,
} from './utils'

/**
 * A class representing a [user state transition proof](https://developer.unirep.io/docs/circuits-api/classes/src.UserStateTransitionProof). Each of the following properties are public signals for the proof.
 */
export class UserStateTransitionProof extends BaseProof {
    readonly idx = {
        historyTreeRoot: 0,
        stateTreeLeaf: 1,
        epochKeys: 2,
        control: 5,
    }
    // original data
    /**
     * The [history tree](https://developer.unirep.io/docs/protocol/trees.md#history-tree) root being proven against.
     */
    public historyTreeRoot: bigint
    /**
     * The new state tree leaf for the user.
     */
    public stateTreeLeaf: bigint
    /**
     * The epoch keys that are output as public signals. These should be verified to not exist in the epoch tree.
     */
    public epochKeys: bigint[]
    /**
     * The control field used for the proof. This field contains many signals binary encoded into a single 253 bit value. This value is automatically decoded into the other properties on this class.
     */
    public control: bigint
    // decoded data
    /**
     * The attester id for the proof.
     */
    public attesterId: bigint
    /**
     * The epoch the user is transitioning to.
     */
    public toEpoch: bigint

    /**
     * @param publicSignals The public signals of the user state transition proof that can be verified by the prover
     * @param proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     * @example
     * ```ts
     * import { UserStateTransitionProof } from '@unirep/circuits'
     * const data = new UserStateTransitionProof(publicSignals, proof)
     * ```
     */
    constructor(
        publicSignals: (bigint | string)[],
        proof: Groth16Proof,
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
     * Pack several variables into one `bigint` variable.
     * @param config The variables that will be packed.
     * @returns The control
     * @example
     * ```ts
     * UserStateTransitionProof.buildControl({
     *   toEpoch,
     *   attesterId,
     * })
     * ```
     */
    static buildControl({ attesterId, toEpoch }) {
        const control = buildUserStateTransitionControl({
            attesterId: BigInt(attesterId),
            toEpoch: BigInt(toEpoch),
        })
        return control
    }
}
