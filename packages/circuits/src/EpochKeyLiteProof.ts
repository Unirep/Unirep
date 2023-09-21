import { Circuit, Prover, EpochKeyControl } from './type'
import { SnarkProof } from '@unirep/utils'
import { BaseProof } from './BaseProof'
import { buildEpochKeyControl, decodeEpochKeyControl } from './utils'

export class EpochKeyLiteProof extends BaseProof {
    readonly idx = {
        control: 0,
        epochKey: 1,
        data: 2,
    }
    public epochKey: string
    public control: string
    public epoch: bigint
    public attesterId: bigint
    public nonce: bigint
    public revealNonce: bigint
    public data: string
    public chainId: bigint

    constructor(publicSignals: string[], proof: SnarkProof, prover?: Prover) {
        super(publicSignals, proof, prover)
        this.epochKey = this.publicSignals[this.idx.epochKey]
        this.control = this.publicSignals[this.idx.control]
        this.data = this.publicSignals[this.idx.data]
        const { nonce, epoch, attesterId, revealNonce, chainId } =
            decodeEpochKeyControl(this.control)
        this.nonce = nonce
        this.epoch = epoch
        this.attesterId = attesterId
        this.revealNonce = revealNonce
        this.chainId = chainId
        this.circuit = Circuit.epochKeyLite
    }

    static buildControl(config: EpochKeyControl) {
        return buildEpochKeyControl(config)
    }
}
