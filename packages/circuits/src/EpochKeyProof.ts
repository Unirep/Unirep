import { Circuit, Prover, EpochKeyControl } from './type'
import { SnarkProof } from '@unirep/utils'
import { BaseProof } from './BaseProof'
import { buildEpochKeyControl, decodeEpochKeyControl } from './utils'

/**
 * @see https://developer.unirep.io/docs/circuits-api/epoch-key-proof
 */
export class EpochKeyProof extends BaseProof {
    // TODO: update docs
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
     * @see https://developer.unirep.io/docs/circuits-api/epoch-key-proof#epochkey
     */
    public epochKey: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/epoch-key-proof#statetreeroot
     */
    public stateTreeRoot: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/epoch-key-proof#control
     */
    public control: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/epoch-key-proof#data
     */
    public data: bigint

    // decoded data
    /**
     * @see https://developer.unirep.io/docs/circuits-api/epoch-key-proof#nonce
     */
    public nonce: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/epoch-key-proof#epoch
     */
    public epoch: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/epoch-key-proof#attesterid
     */
    public attesterId: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/epoch-key-proof#revealnonce
     */
    public revealNonce: bigint
    /**
     * @see https://developer.unirep.io/docs/circuits-api/epoch-key-proof#chainid
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
     * @see https://developer.unirep.io/docs/circuits-api/epoch-key-proof#buildcontrol
     */
    static buildControl(config: EpochKeyControl) {
        return buildEpochKeyControl(config)
    }
}
