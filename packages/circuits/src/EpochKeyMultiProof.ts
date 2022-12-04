import { Circuit, Prover } from './circuits'
import { SnarkProof } from '@unirep/utils'
import { BigNumberish } from '@ethersproject/bignumber'
import { BaseProof } from './BaseProof'
import { EpochKeyLiteProof } from './EpochKeyLiteProof'
import { EpochKeyProof } from './EpochKeyProof'

export class EpochKeyMultiProof extends BaseProof {
    readonly idx = {
        stateTreeRoot: 0,
        control: [1, 2],
        epochKey: [3, 4],
        data: 5,
    }
    public stateTreeRoot: BigNumberish
    public epochKey: [BigNumberish, BigNumberish]
    public control: [BigNumberish, BigNumberish]
    public epoch: [BigNumberish, BigNumberish]
    public attesterId: [BigNumberish, BigNumberish]
    public nonce: [BigNumberish, BigNumberish]
    public revealNonce: [BigNumberish, BigNumberish]
    public data: BigNumberish

    constructor(
        _publicSignals: BigNumberish[],
        _proof: SnarkProof,
        prover?: Prover
    ) {
        super(_publicSignals, _proof, prover)
        this.stateTreeRoot = _publicSignals[this.idx.stateTreeRoot].toString()
        this.epochKey = [
            _publicSignals[this.idx.epochKey[0]].toString(),
            _publicSignals[this.idx.epochKey[1]],
        ]
        this.control = [
            _publicSignals[this.idx.control[0]].toString(),
            _publicSignals[this.idx.control[1]].toString(),
        ]
        const fullDecoded = EpochKeyProof.decodeControl(
            BigInt(this.control[0].toString())
        )
        const liteDecoded = EpochKeyLiteProof.decodeControl(
            BigInt(this.control[1].toString())
        )
        this.epoch = [
            fullDecoded.epoch.toString(),
            liteDecoded.epoch.toString(),
        ]
        this.attesterId = [
            fullDecoded.attesterId.toString(),
            liteDecoded.attesterId.toString(),
        ]
        this.nonce = [
            fullDecoded.nonce.toString(),
            liteDecoded.nonce.toString(),
        ]
        this.revealNonce = [
            fullDecoded.revealNonce.toString(),
            liteDecoded.revealNonce.toString(),
        ]
        this.data = _publicSignals[this.idx.data].toString()
        this.circuit = Circuit.epochKeyLite
    }

    static encodeControl(fullControl: any, liteControl: any) {
        return [
            EpochKeyProof.buildControlInput(fullControl),
            EpochKeyLiteProof.buildControlInput(liteControl),
        ]
    }

    static decodeControl(control: [bigint, bigint]): Array<{
        revealNonce: bigint
        attesterId: bigint
        epoch: bigint
        nonce: bigint
    }> {
        return [
            EpochKeyProof.decodeControl(control[0]),
            EpochKeyLiteProof.decodeControl(control[1]),
        ]
    }
}
