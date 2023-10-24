import { Circuit, Prover, EpochKeyControl } from './type'
import { Groth16Proof } from 'snarkjs'
import { BaseProof } from './BaseProof'
import { buildEpochKeyControl, decodeEpochKeyControl } from './utils'

/**
 * A class representing an [epoch key proof](https://developer.unirep.io/docs/circuits-api/classes/src.EpochKeyProof). Each of the following properties are public signals for the proof.
 */
export class EpochKeyProof extends BaseProof {
    /**
     * The index of the data in the public signals
     */
    readonly idx = {
        epochKey: 0,
        stateTreeRoot: 1,
        control: 2,
        data: 3,
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
     * The 32 byte data endorsed by the proof.
     */
    public data: bigint
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
     * @param publicSignals The public signals of the epoch key proof that can be verified by the prover
     * @param proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     * @example
     * ```ts
     * import { EpochKeyProof } from '@unirep/circuits'
     * const data = new EpochKeyProof(publicSignals, proof)
     * ```
     */
    constructor(
        publicSignals: (bigint | string)[],
        proof: Groth16Proof,
        prover?: Prover
    ) {
        super(publicSignals, proof, prover)
        this.epochKey = this.publicSignals[this.idx.epochKey]
        this.stateTreeRoot = this.publicSignals[this.idx.stateTreeRoot]
        this.control = this.publicSignals[this.idx.control]
        const { nonce, epoch, attesterId, revealNonce, chainId } =
            decodeEpochKeyControl(this.control)
        this.nonce = nonce
        this.epoch = epoch
        this.attesterId = attesterId
        this.revealNonce = revealNonce
        this.chainId = chainId
        this.data = this.publicSignals[this.idx.data]
        this.circuit = Circuit.epochKey
    }

    /**
     * Pack several variables into one `bigint` variable.
     * @param config The variables that will be packed.
     * @returns The control
     * @example
     * ```ts
     * EpochKeyProof.buildControl({
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
