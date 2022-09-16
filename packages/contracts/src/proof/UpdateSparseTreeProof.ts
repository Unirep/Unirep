import { Circuit, Prover } from '@unirep/circuits'
import { SnarkProof } from '@unirep/crypto'
import { BigNumberish } from 'ethers'
import { BaseProof } from './BaseProof'

/**
 * The epoch key proof structure that helps to query the public signals
 */
export class UpdateSparseTreeProof extends BaseProof {
    readonly idx = {
        toRoot: 0,
        newLeaf: 1,
        fromRoot: 2,
        leafIndex: 3,
        posRep: 4,
        negRep: 5,
    }
    public toRoot: BigNumberish
    public newLeaf: BigNumberish
    public fromRoot: BigNumberish
    public leafIndex: BigNumberish
    public posRep: BigNumberish
    public negRep: BigNumberish

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
        this.newLeaf = _publicSignals[this.idx.newLeaf].toString()
        this.fromRoot = _publicSignals[this.idx.fromRoot].toString()
        this.leafIndex = _publicSignals[this.idx.leafIndex].toString()
        this.posRep = _publicSignals[this.idx.posRep].toString()
        this.negRep = _publicSignals[this.idx.negRep].toString()
        this.circuit = Circuit.verifyEpochKey
    }
}
