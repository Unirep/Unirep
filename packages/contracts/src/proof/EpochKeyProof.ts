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
    private _globalStateTree: BigNumberish
    private _epoch: BigNumberish
    private _epochKey: BigNumberish
    public proof: string[]
    public publicSignals: string[]

    constructor(
        _publicSignals: SnarkPublicSignals | BigNumberish[],
        _proof: SnarkProof
    ) {
        this._snarkProof = _proof
        this._snarkPublicSignals = _publicSignals.map((n) => BigInt(n))
        const formattedProof: any[] = formatProofForVerifierContract(_proof)
        this._globalStateTree =
            _publicSignals[EpochKeyProof.idx.globalStateTree].toString()
        this._epoch = _publicSignals[EpochKeyProof.idx.epoch].toString()
        this._epochKey = _publicSignals[EpochKeyProof.idx.epochKey].toString()
        this.proof = formattedProof
        this.publicSignals = _publicSignals.map((n) => n.toString())
    }

    get globalStateTree(): BigNumberish {
        return this._globalStateTree
    }

    set globalStateTree(value: BigNumberish | BigInt) {
        this._globalStateTree = value.toString()
        this.publicSignals[EpochKeyProof.idx.globalStateTree] = value.toString()
        this._snarkPublicSignals[EpochKeyProof.idx.globalStateTree] = BigInt(
            value.toString()
        )
    }

    get epoch(): BigNumberish {
        return this._epoch
    }

    set epoch(value: BigNumberish | BigInt) {
        this._epoch = value.toString()
        this.publicSignals[EpochKeyProof.idx.epoch] = value.toString()
        this._snarkPublicSignals[EpochKeyProof.idx.epoch] = BigInt(
            value.toString()
        )
    }

    get epochKey(): BigNumberish {
        return this._epochKey
    }

    set epochKey(value: BigNumberish | BigInt) {
        this._epochKey = value.toString()
        this.publicSignals[EpochKeyProof.idx.epochKey] = value.toString()
        this._snarkPublicSignals[EpochKeyProof.idx.epochKey] = BigInt(
            value.toString()
        )
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
