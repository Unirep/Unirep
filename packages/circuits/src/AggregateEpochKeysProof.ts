import { Circuit, Prover } from './circuits'
import { SnarkProof } from '@unirep/utils'
import { BigNumberish } from '@ethersproject/bignumber'
import { BaseProof } from './BaseProof'

export class AggregateEpochKeysProof extends BaseProof {
    readonly idx = {
        toRoot: 0,
        hashchain: 1,
        fromRoot: 2,
    }
    public toRoot: BigNumberish
    public hashchain: BigNumberish
    public fromRoot: BigNumberish

    /**
     * @param _publicSignals The public signals of the epoch key proof that can be verified by the prover
     * @param _proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        _publicSignals: BigNumberish[],
        _proof: SnarkProof,
        prover?: Prover
    ) {
        super(_publicSignals, _proof, prover)
        this.toRoot = _publicSignals[this.idx.toRoot].toString()
        this.hashchain = _publicSignals[this.idx.hashchain].toString()
        this.fromRoot = _publicSignals[this.idx.fromRoot].toString()
        this.circuit = Circuit.aggregateEpochKeys
    }
}
