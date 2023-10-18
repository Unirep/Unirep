import { Circuit, Prover, EpochKeyControl } from './type'
import { SnarkProof } from '@unirep/utils'
import { BaseProof } from './BaseProof'
import { buildEpochKeyControl, decodeEpochKeyControl } from './utils'

/**
 * A class representing an [epoch key lite proof](https://developer.unirep.io/docs/circuits-api/classes/src.EpochKeyLiteProof). Each of the following properties are public signals for the proof.

Unlike the epoch key proof the lite proof does not prove membership in a state tree.
 */
export class EpochKeyLiteProof extends BaseProof {
    /**
     * The index of the data in the public signals
     */
    readonly idx = {
        control: 0,
        epochKey: 1,
        data: 2,
    }
    // original data
    /**
     * The control field used for the proof. This field contains many signals binary encoded into a single 253 bit value. This value is automatically decoded into the other properties on this class.
     */
    public control: bigint
    /**
     * The epoch key being proved.
     */
    public epochKey: bigint
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
     * @param publicSignals The public signals of the epoch key lite proof that can be verified by the prover
     * @param proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     * @example
     * ```ts
     * import { EpochKeyLiteProof } from '@unirep/circuits'
     * const data = new EpochKeyLiteProof(publicSignals, proof)
     * ```
     */
    constructor(
        publicSignals: (bigint | string)[],
        proof: SnarkProof,
        prover?: Prover
    ) {
        super(publicSignals, proof, prover)
        this.epochKey = BigInt(this.publicSignals[this.idx.epochKey])
        this.control = BigInt(this.publicSignals[this.idx.control])
        this.data = BigInt(this.publicSignals[this.idx.data])
        const { nonce, epoch, attesterId, revealNonce, chainId } =
            decodeEpochKeyControl(this.control)
        this.nonce = nonce
        this.epoch = epoch
        this.attesterId = attesterId
        this.revealNonce = revealNonce
        this.chainId = chainId
        this.circuit = Circuit.epochKeyLite
    }

    /**
     * Pack several variables into one `bigint` variable.
     * @param config The variables that will be packed.
     * @returns The control
     * @example
     * ```ts
     * const control: bigint = EpochKeyLiteProof.buildControl({
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
