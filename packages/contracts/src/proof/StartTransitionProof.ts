import {
    Circuit,
    formatProofForVerifierContract,
    verifyProof,
} from '@unirep/circuits'
import { SnarkProof, SnarkPublicSignals } from '@unirep/crypto'
import { BigNumberish } from 'ethers'
import { hashProof, IProofStruct } from '..'

export class StartTransitionProof implements IProofStruct {
    static readonly idx = {
        blindedUserState: 0,
        blindedHashChain: 1,
        globalStateTree: 2,
    }

    private _snarkProof: SnarkProof
    private _snarkPublicSignals: SnarkPublicSignals
    private _blindedUserState: BigNumberish
    private _blindedHashChain: BigNumberish
    private _globalStateTree: BigNumberish
    public proof: string[]
    public publicSignals: string[]

    constructor(
        _publicSignals: SnarkPublicSignals | BigNumberish[],
        _proof: SnarkProof
    ) {
        this._snarkProof = _proof
        this._snarkPublicSignals = _publicSignals.map((n) => BigInt(n))
        const formattedProof: any[] = formatProofForVerifierContract(_proof)
        this._blindedUserState =
            _publicSignals[StartTransitionProof.idx.blindedUserState].toString()
        this._blindedHashChain =
            _publicSignals[StartTransitionProof.idx.blindedHashChain].toString()
        this._globalStateTree =
            _publicSignals[StartTransitionProof.idx.globalStateTree].toString()
        this.proof = formattedProof
        this.publicSignals = _publicSignals.map((n) => n.toString())
    }

    get blindedUserState(): BigNumberish {
        return this._blindedUserState
    }

    set blindedUserState(value: BigNumberish | BigInt) {
        this._blindedUserState = value.toString()
        this.publicSignals[StartTransitionProof.idx.blindedUserState] =
            value.toString()
        this._snarkPublicSignals[StartTransitionProof.idx.blindedUserState] =
            BigInt(value.toString())
    }

    get blindedHashChain(): BigNumberish {
        return this._blindedHashChain
    }

    set blindedHashChain(value: BigNumberish | BigInt) {
        this._blindedHashChain = value.toString()
        this.publicSignals[StartTransitionProof.idx.blindedHashChain] =
            value.toString()
        this._snarkPublicSignals[StartTransitionProof.idx.blindedHashChain] =
            BigInt(value.toString())
    }

    get globalStateTree(): BigNumberish {
        return this._globalStateTree
    }

    set globalStateTree(value: BigNumberish | BigInt) {
        this._globalStateTree = value.toString()
        this.publicSignals[StartTransitionProof.idx.globalStateTree] =
            value.toString()
        this._snarkPublicSignals[StartTransitionProof.idx.globalStateTree] =
            BigInt(value.toString())
    }

    public verify = (): Promise<boolean> => {
        return verifyProof(
            Circuit.startTransition,
            this._snarkProof,
            this._snarkPublicSignals
        )
    }

    public hash = () => {
        return hashProof(this.publicSignals, this.proof)
    }
}
