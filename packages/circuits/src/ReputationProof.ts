import { Circuit, Prover } from './type'
import { Groth16Proof } from 'snarkjs'
import { BaseProof } from './BaseProof'
import {
    buildEpochKeyControl,
    buildReputationControl,
    decodeEpochKeyControl,
    decodeReputationControl,
} from './utils'

/**
 * The reputation proof structure that helps to query the public signals
 */
export class ReputationProof extends BaseProof {
    /**
     * The index of the data in the public signals
     */
    readonly idx = {
        epochKey: 0,
        stateTreeRoot: 1,
        control0: 2,
        control1: 3,
        graffiti: 4,
        data: 5,
    }
    // original data
    /**
     * The epoch key that owns the reputation.
     */
    public epochKey: bigint
    /**
     * The state tree root the user is a member of.
     */
    public stateTreeRoot: bigint
    /**
     * The control field used for the proof. This field contains many signals binary encoded into a single 253 bit value. This value is automatically decoded into the other properties on this class.
     * See the [circuit documentation](https://developer.unirep.io/docs/circuits-api/circuits) for more information.
     */
    public control0: bigint
    /**
     * The control field used for the proof. This field contains many signals binary encoded into a single 253 bit value. This value is automatically decoded into the other properties on this class.
     * See the [circuit documentation](https://developer.unirep.io/docs/circuits-api/circuits) for more information.
     */
    public control1: bigint
    /**
     * The graffiti controlled by the user, which is defined by `data[SUM_FIELD_COUNT] % (2 ** REPL_NONCE_BITS)` in the circuits. This value is only checked if `proveGraffiti` is non-zero.

     */
    public graffiti: bigint
    /**
     * The signature data included for the proof.
     */
    public data: bigint
    // decoded data
    // control 0
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
    // control 1
    /**
     * A minimum amount of net positive reputation the user controls. This value is only used if `proveMinRep` is non-zero.
     * Example: Alice has 10 `posRep` and 5 `negRep`. Alice can prove a `minRep` of 2 because she has a net positive reputation of 5.
     */
    public minRep: bigint
    /**
     * A maximum amount of net positive reputation the user controls. This value is only used if `proveMaxRep` is non-zero.
     * Example: Bob has 10 `posRep` and 5 `negRep`. Bob can prove a `maxRep` of 7 because he has a net positive reputation of 5.
     */
    public maxRep: bigint
    /**
     * Whether or not to enforce the provided `minRep` value. If this value is non-zero the `minRep` will be proven.
     */
    public proveMinRep: bigint
    /**
     * Whether or not to enforce the provided `maxRep` value. If this value is non-zero the `maxRep` will be proven.
     */
    public proveMaxRep: bigint
    /**
     * Whether or not to prove the user has a net 0 reputation balance. If this value is non-zero the user `posRep` and `negRep` must be equal.
     */
    public proveZeroRep: bigint
    /**
     * Whether the user has chosen to prove a graffiti. If this value is non-zero the user graffiti will be proven.
     */
    public proveGraffiti: bigint

    /**
     * @param publicSignals The public signals of the reputation proof that can be verified by the prover
     * @param proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     * @example
     * ```ts
     * import { ReputationProof } from '@unirep/circuits'
     * const data = new ReputationProof(publicSignals, proof)
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
        this.control0 = BigInt(this.publicSignals[this.idx.control0])
        this.control1 = BigInt(this.publicSignals[this.idx.control1])
        const { nonce, epoch, attesterId, revealNonce, chainId } =
            decodeEpochKeyControl(this.control0)
        this.nonce = nonce
        this.epoch = epoch
        this.attesterId = attesterId
        this.revealNonce = revealNonce
        this.chainId = chainId
        const {
            minRep,
            maxRep,
            proveMinRep,
            proveMaxRep,
            proveZeroRep,
            proveGraffiti,
        } = decodeReputationControl(this.control1)
        this.minRep = minRep
        this.maxRep = maxRep
        this.proveMinRep = proveMinRep
        this.proveMaxRep = proveMaxRep
        this.proveZeroRep = proveZeroRep
        this.proveGraffiti = proveGraffiti
        this.graffiti = this.publicSignals[this.idx.graffiti]
        this.data = this.publicSignals[this.idx.data]
        this.circuit = Circuit.reputation
    }

    /**
     * Pack several variables into one `bigint` variable.
     * @param config The variables that will be packed.
     * @returns The controls
     * @example
     * ```ts
     * ReputationProof.buildControl({
     *  attesterId,
     *  epoch,
     *  nonce,
     *  revealNonce,
     *  chainId,
     *  proveGraffiti,
     *  minRep,
     *  maxRep,
     *  proveMinRep,
     *  proveMaxRep,
     *  proveZeroRep,
     * })
     * ```
     */
    static buildControl({
        attesterId,
        epoch,
        nonce,
        revealNonce = BigInt(0),
        chainId,
        proveGraffiti = BigInt(0),
        minRep = BigInt(0),
        maxRep = BigInt(0),
        proveMinRep = BigInt(0),
        proveMaxRep = BigInt(0),
        proveZeroRep = BigInt(0),
    }: any) {
        let control0 = buildEpochKeyControl({
            attesterId: BigInt(attesterId),
            epoch: BigInt(epoch),
            nonce: BigInt(nonce),
            revealNonce: BigInt(revealNonce),
            chainId: BigInt(chainId),
        })
        let control1 = buildReputationControl({
            minRep: BigInt(minRep),
            maxRep: BigInt(maxRep),
            proveMinRep: BigInt(proveMinRep),
            proveMaxRep: BigInt(proveMaxRep),
            proveZeroRep: BigInt(proveZeroRep),
            proveGraffiti: BigInt(proveGraffiti),
        })
        return [control0, control1]
    }
}
