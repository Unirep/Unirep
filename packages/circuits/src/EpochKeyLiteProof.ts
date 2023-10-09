import { Circuit, Prover, EpochKeyControl } from './type'
import { SnarkProof } from '@unirep/utils'
import { BaseProof } from './BaseProof'
import { buildEpochKeyControl, decodeEpochKeyControl } from './utils'

/**
 * @see https://developer.unirep.io/docs/circuits-api/epoch-key-lite-proof
 */
export class EpochKeyLiteProof extends BaseProof {
    // TODO: update docs
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
     * @see https://developer.unirep.io/docs/circuits-api/epoch-key-lite-proof#control
     */
    public control: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/epoch-key-lite-proof#epochkey
     */
    public epochKey: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/epoch-key-lite-proof#data
     */
    public data: bigint

    // decoded data
    /**
     * @see https://developer.unirep.io/docs/circuits-api/epoch-key-lite-proof#nonce
     */
    public nonce: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/epoch-key-lite-proof#epoch
     */
    public epoch: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/epoch-key-lite-proof#attesterid
     */
    public attesterId: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/epoch-key-lite-proof#revealnonce
     */
    public revealNonce: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/epoch-key-lite-proof#chainid
     */
    public chainId: bigint

    /**
     * @see https://developer.unirep.io/docs/circuits-api/base-proof#constructor
     * @param publicSignals The public signals of the proof that can be verified by the prover
     * @param proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
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
     * @see https://developer.unirep.io/docs/circuits-api/epoch-key-lite-proof#buildcontrol
     */
    static buildControl(config: EpochKeyControl) {
        return buildEpochKeyControl(config)
    }
}
