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
    private _epoch: BigNumberish
    private _epochKey: BigNumberish
    private _globalStateTree: BigNumberish
    private _attesterId: BigNumberish
    private _userHasSignedUp: BigNumberish
    public proof: string[]
    public publicSignals: string[]

    constructor(
        _publicSignals: SnarkPublicSignals | BigNumberish[],
        _proof: SnarkProof
    ) {
        this._snarkProof = _proof
        this._snarkPublicSignals = _publicSignals.map((n) => BigInt(n))
        const formattedProof: any[] = formatProofForVerifierContract(_proof)
        this._epoch = _publicSignals[SignUpProof.idx.epoch].toString()
        this._epochKey = _publicSignals[SignUpProof.idx.epochKey].toString()
        this._globalStateTree =
            _publicSignals[SignUpProof.idx.globalStateTree].toString()
        this._attesterId = _publicSignals[SignUpProof.idx.attesterId].toString()
        this._userHasSignedUp =
            _publicSignals[SignUpProof.idx.userHasSignedUp].toString()
        this.proof = formattedProof
        this.publicSignals = _publicSignals.map((n) => n.toString())
    }

    get epoch(): BigNumberish {
        return this._epoch
    }

    set epoch(value: BigNumberish | BigInt) {
        this._epoch = value.toString()
        this.publicSignals[SignUpProof.idx.epoch] = value.toString()
        this._snarkPublicSignals[SignUpProof.idx.epoch] = BigInt(
            value.toString()
        )
    }

    get epochKey(): BigNumberish {
        return this._epochKey
    }

    set epochKey(value: BigNumberish | BigInt) {
        this._epochKey = value.toString()
        this.publicSignals[SignUpProof.idx.epochKey] = value.toString()
        this._snarkPublicSignals[SignUpProof.idx.epochKey] = BigInt(
            value.toString()
        )
    }

    get globalStateTree(): BigNumberish {
        return this._globalStateTree
    }

    set globalStateTree(value: BigNumberish | BigInt) {
        this._globalStateTree = value.toString()
        this.publicSignals[SignUpProof.idx.globalStateTree] = value.toString()
        this._snarkPublicSignals[SignUpProof.idx.globalStateTree] = BigInt(
            value.toString()
        )
    }

    get attesterId(): BigNumberish {
        return this._attesterId
    }

    set attesterId(value: BigNumberish | BigInt) {
        this._attesterId = value.toString()
        this.publicSignals[SignUpProof.idx.attesterId] = value.toString()
        this._snarkPublicSignals[SignUpProof.idx.attesterId] = BigInt(
            value.toString()
        )
    }

    get userHasSignedUp(): BigNumberish {
        return this._userHasSignedUp
    }

    set userHasSignedUp(value: BigNumberish | BigInt) {
        this._userHasSignedUp = value.toString()
        this.publicSignals[SignUpProof.idx.userHasSignedUp] = value.toString()
        this._snarkPublicSignals[SignUpProof.idx.userHasSignedUp] = BigInt(
            value.toString()
        )
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
