import { Circuit, Prover } from '@unirep/circuits'
import { SnarkProof } from '@unirep/crypto'
import { BigNumberish } from 'ethers'
import { BaseProof } from './BaseProof'

/**
 * The reputation proof structure that helps to query the public signals
 */
export class ReputationProof extends BaseProof {
    readonly idx: any
    public epochKey: BigNumberish
    public globalStateTreeRoot: BigNumberish
    public posRepBalance: BigNumberish
    public negRepBalance: BigNumberish
    public epoch: BigNumberish
    public attesterId: BigNumberish
    public minRep: BigNumberish
    public epochTreeRoot: BigNumberish

    /**
     * @param _publicSignals The public signals of the reputation proof that can be verified by the prover
     * @param _proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        _publicSignals: BigNumberish[],
        _proof: SnarkProof,
        prover?: Prover
    ) {
        super(_publicSignals, _proof, prover)
        this.idx = {
            epochKey: 0,
            globalStateTreeRoot: 1,
            posRepBalance: 2,
            negRepBalance: 3,
            epoch: 4,
            attesterId: 5,
            minRep: 6,
            epochTreeRoot: 7,
        }

        this.epochKey = _publicSignals[this.idx.epochKey]
        this.globalStateTreeRoot = _publicSignals[this.idx.globalStateTreeRoot]
        this.posRepBalance = _publicSignals[this.idx.posRepBalance]
        this.negRepBalance = _publicSignals[this.idx.negRepBalance]
        this.epoch = _publicSignals[this.idx.epoch]
        this.attesterId = _publicSignals[this.idx.attesterId]
        this.minRep = _publicSignals[this.idx.minRep]
        this.epochTreeRoot = _publicSignals[this.idx.epochTreeRoot]
        this.circuit = Circuit.proveReputation
    }
}
