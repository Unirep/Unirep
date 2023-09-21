import { Circuit, Prover, EpochKeyControl } from './type'
import { SnarkProof } from '@unirep/utils'
import { BaseProof } from './BaseProof'
import { buildEpochKeyControl, decodeEpochKeyControl } from './utils'

/**
 * The epoch key proof structure that helps to query the public signals
 */
export class EpochKeyProof extends BaseProof {
    readonly idx = {
        epochKey: 0,
        stateTreeRoot: 1,
        control: 2,
        data: 3,
    }
    public epochKey: string
    public stateTreeRoot: string
    public control: string
    public epoch: bigint
    public attesterId: bigint
    public nonce: bigint
    public revealNonce: bigint
    public data: string
    public chainId: bigint

    /**
     * @param publicSignals The public signals of the epoch key proof that can be verified by the prover
     * @param proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(publicSignals: string[], proof: SnarkProof, prover?: Prover) {
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

    static buildControl(config: EpochKeyControl) {
        return buildEpochKeyControl(config)
    }
}
