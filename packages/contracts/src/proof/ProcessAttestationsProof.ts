import {
    Circuit,
    formatProofForVerifierContract,
    verifyProof,
} from '@unirep/circuits'
import { SnarkProof, SnarkPublicSignals } from '@unirep/crypto'
import { BigNumberish } from 'ethers'
import { hashProof, IProofStruct } from '..'

export class ProcessAttestationsProof implements IProofStruct {
    static readonly idx = {
        outputBlindedUserState: 0,
        outputBlindedHashChain: 1,
        inputBlindedUserState: 2,
    }

    private _snarkProof: SnarkProof
    private _snarkPublicSignals: SnarkPublicSignals
    private _outputBlindedUserState: BigNumberish
    private _outputBlindedHashChain: BigNumberish
    private _inputBlindedUserState: BigNumberish
    public proof: string[]
    public publicSignals: string[]

    constructor(
        _publicSignals: SnarkPublicSignals | BigNumberish[],
        _proof: SnarkProof
    ) {
        this._snarkProof = _proof
        this._snarkPublicSignals = _publicSignals.map((n) => BigInt(n))
        const formattedProof: any[] = formatProofForVerifierContract(_proof)
        this._outputBlindedUserState =
            _publicSignals[
                ProcessAttestationsProof.idx.outputBlindedUserState
            ].toString()
        this._outputBlindedHashChain =
            _publicSignals[
                ProcessAttestationsProof.idx.outputBlindedHashChain
            ].toString()
        this._inputBlindedUserState =
            _publicSignals[
                ProcessAttestationsProof.idx.inputBlindedUserState
            ].toString()
        this.proof = formattedProof
        this.publicSignals = _publicSignals.map((n) => n.toString())
    }

    get outputBlindedUserState(): BigNumberish {
        return this._outputBlindedUserState
    }

    set outputBlindedUserState(value: BigNumberish | BigInt) {
        this._outputBlindedUserState = value.toString()
        this.publicSignals[
            ProcessAttestationsProof.idx.outputBlindedUserState
        ] = value.toString()
        this._snarkPublicSignals[
            ProcessAttestationsProof.idx.outputBlindedUserState
        ] = BigInt(value.toString())
    }

    get outputBlindedHashChain(): BigNumberish {
        return this._outputBlindedHashChain
    }

    set outputBlindedHashChain(value: BigNumberish | BigInt) {
        this._outputBlindedHashChain = value.toString()
        this.publicSignals[
            ProcessAttestationsProof.idx.outputBlindedHashChain
        ] = value.toString()
        this._snarkPublicSignals[
            ProcessAttestationsProof.idx.outputBlindedHashChain
        ] = BigInt(value.toString())
    }

    get inputBlindedUserState(): BigNumberish {
        return this._inputBlindedUserState
    }

    set inputBlindedUserState(value: BigNumberish | BigInt) {
        this._inputBlindedUserState = value.toString()
        this.publicSignals[ProcessAttestationsProof.idx.inputBlindedUserState] =
            value.toString()
        this._snarkPublicSignals[
            ProcessAttestationsProof.idx.inputBlindedUserState
        ] = BigInt(value.toString())
    }

    public verify = (): Promise<boolean> => {
        return verifyProof(
            Circuit.processAttestations,
            this._snarkProof,
            this._snarkPublicSignals
        )
    }

    public hash = () => {
        return hashProof(this.publicSignals, this.proof)
    }
}
