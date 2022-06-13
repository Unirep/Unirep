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
    public blindedUserState: BigNumberish
    public blindedHashChain: BigNumberish
    public globalStateTree: BigNumberish
    public proof: string[]
    public publicSignals: string[]

    constructor(_publicSignals: SnarkPublicSignals, _proof: SnarkProof) {
        this._snarkProof = _proof
        this._snarkPublicSignals = _publicSignals
        const formattedProof: any[] = formatProofForVerifierContract(_proof)
        this.blindedUserState =
            _publicSignals[StartTransitionProof.idx.blindedUserState].toString()
        this.blindedHashChain =
            _publicSignals[StartTransitionProof.idx.blindedHashChain].toString()
        this.globalStateTree =
            _publicSignals[StartTransitionProof.idx.globalStateTree].toString()
        this.proof = formattedProof
        this.publicSignals = _publicSignals.map((n) => n.toString())
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
