import {
    Circuit,
    formatProofForVerifierContract,
    verifyProof,
} from '@unirep/circuits'
import { SnarkProof, SnarkPublicSignals } from '@unirep/crypto'
import { BigNumberish } from 'ethers'
import { hashProof, IProofStruct } from '..'

export class EpochKeyProof implements IProofStruct {
    static readonly idx = {
        globalStateTree: 0,
        epoch: 1,
        epochKey: 2,
    }
    private _snarkProof: SnarkProof
    private _snarkPublicSignals: SnarkPublicSignals
    public globalStateTree: BigNumberish
    public epoch: BigNumberish
    public epochKey: BigNumberish
    public proof: string[]
    public publicSignals: string[]

    constructor(_publicSignals: SnarkPublicSignals, _proof: SnarkProof) {
        this._snarkProof = _proof
        this._snarkPublicSignals = _publicSignals
        const formattedProof: any[] = formatProofForVerifierContract(_proof)
        this.globalStateTree =
            _publicSignals[EpochKeyProof.idx.globalStateTree].toString()
        this.epoch = _publicSignals[EpochKeyProof.idx.epoch].toString()
        this.epochKey = _publicSignals[EpochKeyProof.idx.epochKey].toString()
        this.proof = formattedProof
        this.publicSignals = _publicSignals.map((n) => n.toString())
    }

    public verify = (): Promise<boolean> => {
        return verifyProof(
            Circuit.verifyEpochKey,
            this._snarkProof,
            this._snarkPublicSignals
        )
    }

    public hash = () => {
        return hashProof(this.publicSignals, this.proof)
    }
}
