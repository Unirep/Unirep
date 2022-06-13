import {
    Circuit,
    formatProofForVerifierContract,
    verifyProof,
} from '@unirep/circuits'
import { MAX_REPUTATION_BUDGET } from '@unirep/circuits/config'
import { SnarkProof, SnarkPublicSignals } from '@unirep/crypto'
import { BigNumberish } from 'ethers'
import { hashProof, IProofStruct } from '..'

export class ReputationProof implements IProofStruct {
    static readonly idx = {
        repNullifiers: [0, MAX_REPUTATION_BUDGET],
        epoch: MAX_REPUTATION_BUDGET,
        epochKey: MAX_REPUTATION_BUDGET + 1,
        globalStateTree: MAX_REPUTATION_BUDGET + 2,
        attesterId: MAX_REPUTATION_BUDGET + 3,
        proveReputationAmount: MAX_REPUTATION_BUDGET + 4,
        minRep: MAX_REPUTATION_BUDGET + 5,
        proveGraffiti: MAX_REPUTATION_BUDGET + 6,
        graffitiPreImage: MAX_REPUTATION_BUDGET + 7,
    }
    private _snarkProof: SnarkProof
    private _snarkPublicSignals: SnarkPublicSignals
    public repNullifiers: BigNumberish[]
    public epoch: BigNumberish
    public epochKey: BigNumberish
    public globalStateTree: BigNumberish
    public attesterId: BigNumberish
    public proveReputationAmount: BigNumberish
    public minRep: BigNumberish
    public proveGraffiti: BigNumberish
    public graffitiPreImage: BigNumberish
    public proof: string[]
    public publicSignals: string[]

    constructor(_publicSignals: SnarkPublicSignals, _proof: SnarkProof) {
        this._snarkProof = _proof
        this._snarkPublicSignals = _publicSignals
        const formattedProof: any[] = formatProofForVerifierContract(_proof)
        this.repNullifiers = _publicSignals
            .slice(
                ReputationProof.idx.repNullifiers[0],
                ReputationProof.idx.repNullifiers[1]
            )
            .map((n) => n.toString())
        this.epoch = _publicSignals[ReputationProof.idx.epoch].toString()
        this.epochKey = _publicSignals[ReputationProof.idx.epochKey].toString()
        this.globalStateTree =
            _publicSignals[ReputationProof.idx.globalStateTree].toString()
        this.attesterId =
            _publicSignals[ReputationProof.idx.attesterId].toString()
        this.proveReputationAmount =
            _publicSignals[ReputationProof.idx.proveReputationAmount].toString()
        this.minRep = _publicSignals[ReputationProof.idx.minRep].toString()
        this.proveGraffiti =
            _publicSignals[ReputationProof.idx.proveGraffiti].toString()
        this.graffitiPreImage =
            _publicSignals[ReputationProof.idx.graffitiPreImage].toString()
        this.proof = formattedProof
        this.publicSignals = _publicSignals.map((n) => n.toString())
    }

    public verify = (): Promise<boolean> => {
        return verifyProof(
            Circuit.proveReputation,
            this._snarkProof,
            this._snarkPublicSignals
        )
    }

    public hash = () => {
        return hashProof(this.publicSignals, this.proof)
    }
}
