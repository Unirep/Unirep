import { Circuit, Prover } from './circuits'
import { SnarkProof } from '@unirep/utils'
import { BaseProof } from './BaseProof'

export class EpochKeyLiteProof extends BaseProof {
    readonly idx = {
        control: 0,
        epochKey: 1,
        data: 2,
    }
    public epochKey: bigint
    public control: bigint
    public epoch: bigint
    public attesterId: bigint
    public nonce: bigint
    public revealNonce: bigint
    public data: bigint

    constructor(
        _publicSignals: (bigint | string)[],
        _proof: SnarkProof,
        prover?: Prover
    ) {
        super(_publicSignals, _proof, prover)
        this.epochKey = this.publicSignals[this.idx.epochKey]
        this.control = this.publicSignals[this.idx.control]
        this.data = this.publicSignals[this.idx.data]
        this.revealNonce = (BigInt(this.control) >> BigInt(232)) & BigInt(1)
        this.attesterId =
            (BigInt(this.control) >> BigInt(72)) &
            ((BigInt(1) << BigInt(160)) - BigInt(1))
        this.epoch =
            (BigInt(this.control) >> BigInt(8)) &
            ((BigInt(1) << BigInt(64)) - BigInt(1))
        this.nonce =
            BigInt(this.control) & ((BigInt(1) << BigInt(8)) - BigInt(1))
        this.circuit = Circuit.epochKeyLite
    }

    static buildControl({ attesterId, epoch, nonce, revealNonce }: any) {
        let control = BigInt(0)
        control += BigInt(revealNonce ?? 0) << BigInt(232)
        control += BigInt(attesterId) << BigInt(72)
        control += BigInt(epoch) << BigInt(8)
        control += BigInt(nonce) * BigInt(revealNonce ?? 0)
        return control
    }
}
