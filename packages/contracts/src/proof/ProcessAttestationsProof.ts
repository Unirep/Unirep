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
    public outputBlindedUserState: BigNumberish
    public outputBlindedHashChain: BigNumberish
    public inputBlindedUserState: BigNumberish
    public proof: string[]
    public publicSignals: string[]

    constructor(_publicSignals: SnarkPublicSignals, _proof: SnarkProof) {
        this._snarkProof = _proof
        this._snarkPublicSignals = _publicSignals
        const formattedProof: any[] = formatProofForVerifierContract(_proof)
        this.outputBlindedUserState =
            _publicSignals[
                ProcessAttestationsProof.idx.outputBlindedUserState
            ].toString()
        this.outputBlindedHashChain =
            _publicSignals[
                ProcessAttestationsProof.idx.outputBlindedHashChain
            ].toString()
        this.inputBlindedUserState =
            _publicSignals[
                ProcessAttestationsProof.idx.inputBlindedUserState
            ].toString()
        this.proof = formattedProof
        this.publicSignals = _publicSignals.map((n) => n.toString())
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
