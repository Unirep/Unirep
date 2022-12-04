import { Circuit, Prover } from './circuits'
import { SnarkProof } from '@unirep/utils'
import { BigNumberish } from '@ethersproject/bignumber'
import { BaseProof } from './BaseProof'

export class EpochKeyLiteProof extends BaseProof {
    readonly idx = {
        control: 0,
        epochKey: 1,
        data: 2,
    }
    public epochKey: BigNumberish
    public control: BigNumberish
    public epoch: BigNumberish
    public attesterId: BigNumberish
    public nonce: BigNumberish
    public revealNonce: BigNumberish
    public data: BigNumberish

    constructor(
        _publicSignals: BigNumberish[],
        _proof: SnarkProof,
        prover?: Prover
    ) {
        super(_publicSignals, _proof, prover)
        this.epochKey = _publicSignals[this.idx.epochKey].toString()
        this.control = _publicSignals[this.idx.control].toString()
        this.data = _publicSignals[this.idx.data].toString()
        const typedConstructor = this
            .constructor as unknown as typeof EpochKeyLiteProof
        const decoded = typedConstructor.decodeControl(BigInt(this.control))
        this.revealNonce = decoded.revealNonce
        this.attesterId = decoded.attesterId
        this.epoch = decoded.epoch
        this.nonce = decoded.nonce
        this.circuit = Circuit.epochKeyLite
    }

    static buildControlInput({ attesterId, epoch, nonce, revealNonce }: any) {
        let control = BigInt(0)
        control += BigInt(revealNonce ?? 0) << BigInt(232)
        control += BigInt(attesterId) << BigInt(72)
        control += BigInt(epoch) << BigInt(8)
        control += BigInt(nonce)
        return control
    }

    static decodeControl(control: bigint): {
        revealNonce: bigint
        attesterId: bigint
        epoch: bigint
        nonce: bigint
    } {
        const revealNonce = (BigInt(control) >> BigInt(232)) & BigInt(1)
        const attesterId =
            (BigInt(control) >> BigInt(72)) &
            ((BigInt(1) << BigInt(160)) - BigInt(1))
        const epoch =
            (BigInt(control) >> BigInt(8)) &
            ((BigInt(1) << BigInt(64)) - BigInt(1))
        const nonce = BigInt(control) & ((BigInt(1) << BigInt(8)) - BigInt(1))
        return { attesterId, epoch, nonce, revealNonce }
    }
}
