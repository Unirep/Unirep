import { Circuit, Prover, EpochKeyControl } from './type'
import { Groth16Proof } from 'snarkjs'
import { BaseProof } from './BaseProof'
import { buildEpochKeyControl, decodeEpochKeyControl } from './utils'

/**
 * A class representing a [scope nullifier proof](https://developer.unirep.io/docs/circuits-api/classes/src.ScopeNullifierProof). Each of the following properties are public signals for the proof.
 */
export class ScopeNullifierProof extends BaseProof {
    /**
     * The index of the data in the public signals
     */
    readonly idx = {
        epochKey: 0,
        stateTreeRoot: 1,
        control: 2,
        nullifier: 3,
        sigData: 4,
        scope: 5,
    }
    // original data
    /**
     * The epoch key being proved.
     */
    public epochKey: bigint
    /**
     * The state tree root the proof was made against.
     * This should be verified to exist onchain when verifying the proof.
     */
    public stateTreeRoot: bigint
    /**
     * The control field used for the proof. This field contains many signals binary encoded into a single 253 bit value. This value is automatically decoded into the other properties on this class.
     */
    public control: bigint
    /**
     * The nullifier for the proof, which is computed by `hash(scope, identitySecret)` in circuit
     */
    public nullifier: bigint
    /**
     * The 32 byte data endorsed by the proof.
     */
    public sigData: bigint
    /**
     * The scope for the proof, which indicates the user will take action on which event/scope.
     */
    public scope: bigint
    // decoded data
    /**
     * The nonce used to generate the epoch key. To determine if this value is set check that `revealNonce == 1`.
     */
    public nonce: bigint
    /**
     * The epoch the proof was made within.
     */
    public epoch: bigint
    /**
     * The attester id for the proof.
     */
    public attesterId: bigint
    /**
     * A number indicating whether the epoch key nonce was revealed in the proof. This value will be either `1` or `0`.
     */
    public revealNonce: bigint
    /**
     * The chain id for the proof.
     */
    public chainId: bigint

    /**
     * @param publicSignals The public signals of the prevent double action proof that can be verified by the prover
     * @param proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     * @example
     * ```ts
     * import { ScopeNullifierProof } from '@unirep/circuits'
     * const data = new ScopeNullifierProof(publicSignals, proof)
     * ```
     */
    constructor(
        publicSignals: (bigint | string)[],
        proof: Groth16Proof,
        prover?: Prover
    ) {
        super(publicSignals, proof, prover)
        this.epochKey = BigInt(this.publicSignals[this.idx.epochKey])
        this.stateTreeRoot = BigInt(this.publicSignals[this.idx.stateTreeRoot])
        this.control = BigInt(this.publicSignals[this.idx.control])
        this.nullifier = BigInt(this.publicSignals[this.idx.nullifier])
        this.sigData = BigInt(this.publicSignals[this.idx.sigData])
        this.scope = BigInt(this.publicSignals[this.idx.scope])
        const { nonce, epoch, attesterId, revealNonce, chainId } =
            decodeEpochKeyControl(this.control)
        this.nonce = nonce
        this.epoch = epoch
        this.attesterId = attesterId
        this.revealNonce = revealNonce
        this.chainId = chainId
        this.circuit = Circuit.scopeNullifier
    }

    /**
     * Pack several variables into one `bigint` variable.
     * @param config The variables that will be packed.
     * @returns The control
     * @example
     * ```ts
     * ScopeNullifierProof.buildControl({
     *   epoch,
     *   nonce,
     *   attesterId,
     *   revealNonce,
     *   chainId
     * })
     * ```
     */
    static buildControl(config: EpochKeyControl) {
        return buildEpochKeyControl(config)
    }
}
