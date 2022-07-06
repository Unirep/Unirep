import { Circuit, Prover } from '@unirep/circuits'
import { SnarkProof } from '@unirep/crypto'
import { BigNumberish } from 'ethers'
import { BaseProof } from './BaseProof'

export class EpochKeyProof extends BaseProof {
    readonly idx = {
        globalStateTree: 0,
        epoch: 1,
        epochKey: 2,
    }
    public globalStateTree: BigNumberish
    public epoch: BigNumberish
    public epochKey: BigNumberish

    constructor(
        _publicSignals: BigNumberish[],
        _proof: SnarkProof,
        prover?: Prover
    ) {
        super(_publicSignals, _proof, prover)
        this.globalStateTree =
            _publicSignals[this.idx.globalStateTree].toString()
        this.epoch = _publicSignals[this.idx.epoch].toString()
        this.epochKey = _publicSignals[this.idx.epochKey].toString()
        this.circuit = Circuit.verifyEpochKey
    }
}
