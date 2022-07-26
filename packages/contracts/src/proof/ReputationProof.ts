import { Circuit, Prover } from '@unirep/circuits'
import { MAX_REPUTATION_BUDGET } from '@unirep/circuits'
import { SnarkProof } from '@unirep/crypto'
import { BigNumberish } from 'ethers'
import { BaseProof } from './BaseProof'

/**
 * The reputation proof structure that helps to query the public signals
 */
export class ReputationProof extends BaseProof {
    readonly idx: any
    public repNullifiers: BigNumberish[]
    public epoch: BigNumberish
    public epochKey: BigNumberish
    public globalStateTree: BigNumberish
    public attesterId: BigNumberish
    public proveReputationAmount: BigNumberish
    public minRep: BigNumberish
    public proveGraffiti: BigNumberish
    public graffitiPreImage: BigNumberish

    public maxReputationBudget: number

    /**
     * @param _publicSignals The public signals of the reputation proof that can be verified by the prover
     * @param _proof The proof that can be verified by the prover
     * @param prover The prover that can verify the public signals and the proof
     */
    constructor(
        _publicSignals: BigNumberish[],
        _proof: SnarkProof,
        prover?: Prover,
        maxRepBudget = MAX_REPUTATION_BUDGET
    ) {
        super(_publicSignals, _proof, prover)
        this.maxReputationBudget = maxRepBudget
        this.idx = {
            epochKey: 0,
            globalStateTree: 1,
            repNullifiers: [2, 2 + this.maxReputationBudget],
            epoch: this.maxReputationBudget + 2,
            attesterId: this.maxReputationBudget + 3,
            proveReputationAmount: this.maxReputationBudget + 4,
            minRep: this.maxReputationBudget + 5,
            proveGraffiti: this.maxReputationBudget + 6,
            graffitiPreImage: this.maxReputationBudget + 7,
        }

        this.repNullifiers = _publicSignals.slice(
            this.idx.repNullifiers[0],
            this.idx.repNullifiers[1]
        )
        this.epoch = _publicSignals[this.idx.epoch]
        this.epochKey = _publicSignals[this.idx.epochKey]
        this.globalStateTree = _publicSignals[this.idx.globalStateTree]
        this.attesterId = _publicSignals[this.idx.attesterId]
        this.proveReputationAmount =
            _publicSignals[this.idx.proveReputationAmount]
        this.minRep = _publicSignals[this.idx.minRep]
        this.proveGraffiti = _publicSignals[this.idx.proveGraffiti]
        this.graffitiPreImage = _publicSignals[this.idx.graffitiPreImage]
        this.circuit = Circuit.proveReputation
    }
}
