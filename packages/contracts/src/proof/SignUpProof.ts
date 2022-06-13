import {
    Circuit,
    formatProofForVerifierContract,
    verifyProof,
} from '@unirep/circuits'
import { SnarkProof, SnarkPublicSignals } from '@unirep/crypto'
import { BigNumberish } from 'ethers'
import { hashProof, IProofStruct } from '..'

export class SignUpProof implements IProofStruct {
    static readonly idx = {
        epoch: 0,
        epochKey: 1,
        globalStateTree: 2,
        attesterId: 3,
        userHasSignedUp: 4,
    }

    private _snarkProof: SnarkProof
    private _snarkPublicSignals: SnarkPublicSignals
    public epoch: BigNumberish
    public epochKey: BigNumberish
    public globalStateTree: BigNumberish
    public attesterId: BigNumberish
    public userHasSignedUp: BigNumberish
    public proof: string[]
    public publicSignals: string[]

    constructor(_publicSignals: SnarkPublicSignals, _proof: SnarkProof) {
        this._snarkProof = _proof
        this._snarkPublicSignals = _publicSignals
        const formattedProof: any[] = formatProofForVerifierContract(_proof)
        this.epoch = _publicSignals[SignUpProof.idx.epoch].toString()
        this.epochKey = _publicSignals[SignUpProof.idx.epochKey].toString()
        this.globalStateTree =
            _publicSignals[SignUpProof.idx.globalStateTree].toString()
        this.attesterId = _publicSignals[SignUpProof.idx.attesterId].toString()
        this.userHasSignedUp =
            _publicSignals[SignUpProof.idx.userHasSignedUp].toString()
        this.proof = formattedProof
        this.publicSignals = _publicSignals.map((n) => n.toString())
    }

    public verify = (): Promise<boolean> => {
        return verifyProof(
            Circuit.proveUserSignUp,
            this._snarkProof,
            this._snarkPublicSignals
        )
    }

    public hash = () => {
        return hashProof(this.publicSignals, this.proof)
    }
}
