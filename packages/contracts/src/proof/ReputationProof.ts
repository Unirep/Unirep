import assert from 'assert'
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
    private _repNullifiers: BigNumberish[]
    private _epoch: BigNumberish
    private _epochKey: BigNumberish
    private _globalStateTree: BigNumberish
    private _attesterId: BigNumberish
    private _proveReputationAmount: BigNumberish
    private _minRep: BigNumberish
    private _proveGraffiti: BigNumberish
    private _graffitiPreImage: BigNumberish
    public proof: string[]
    public publicSignals: string[]

    constructor(
        _publicSignals: SnarkPublicSignals | BigNumberish[],
        _proof: SnarkProof
    ) {
        this._snarkProof = _proof
        this._snarkPublicSignals = _publicSignals.map((n) => BigInt(n))
        const formattedProof: any[] = formatProofForVerifierContract(_proof)
        this._repNullifiers = _publicSignals
            .slice(
                ReputationProof.idx.repNullifiers[0],
                ReputationProof.idx.repNullifiers[1]
            )
            .map((n) => n.toString())
        this._epoch = _publicSignals[ReputationProof.idx.epoch].toString()
        this._epochKey = _publicSignals[ReputationProof.idx.epochKey].toString()
        this._globalStateTree =
            _publicSignals[ReputationProof.idx.globalStateTree].toString()
        this._attesterId =
            _publicSignals[ReputationProof.idx.attesterId].toString()
        this._proveReputationAmount =
            _publicSignals[ReputationProof.idx.proveReputationAmount].toString()
        this._minRep = _publicSignals[ReputationProof.idx.minRep].toString()
        this._proveGraffiti =
            _publicSignals[ReputationProof.idx.proveGraffiti].toString()
        this._graffitiPreImage =
            _publicSignals[ReputationProof.idx.graffitiPreImage].toString()
        this.proof = formattedProof
        this.publicSignals = _publicSignals.map((n) => n.toString())
    }

    get repNullifiers(): BigNumberish[] {
        return this._repNullifiers
    }

    set repNullifiers(values: BigNumberish[] | BigInt[]) {
        assert(
            values.length === MAX_REPUTATION_BUDGET,
            `ReputationProof: Length of reputation nullifiers should be ${MAX_REPUTATION_BUDGET}`
        )
        this._repNullifiers = values.map((n) => n.toString())
        for (let i = 0; i < values.length; i++) {
            this.publicSignals[ReputationProof.idx.repNullifiers[0] + i] =
                values[i].toString()
            this._snarkPublicSignals[ReputationProof.idx.repNullifiers[0] + i] =
                BigInt(values[i].toString())
        }
    }

    get epoch(): BigNumberish {
        return this._epoch
    }

    set epoch(value: BigNumberish | BigInt) {
        this._epoch = value.toString()
        this.publicSignals[ReputationProof.idx.epoch] = value.toString()
        this._snarkPublicSignals[ReputationProof.idx.epoch] = BigInt(
            value.toString()
        )
    }

    get epochKey(): BigNumberish {
        return this._epochKey
    }

    set epochKey(value: BigNumberish | BigInt) {
        this._epochKey = value.toString()
        this.publicSignals[ReputationProof.idx.epochKey] = value.toString()
        this._snarkPublicSignals[ReputationProof.idx.epochKey] = BigInt(
            value.toString()
        )
    }

    get globalStateTree(): BigNumberish {
        return this._globalStateTree
    }

    set globalStateTree(value: BigNumberish | BigInt) {
        this._globalStateTree = value.toString()
        this.publicSignals[ReputationProof.idx.globalStateTree] =
            value.toString()
        this._snarkPublicSignals[ReputationProof.idx.globalStateTree] = BigInt(
            value.toString()
        )
    }

    get attesterId(): BigNumberish {
        return this._attesterId
    }

    set attesterId(value: BigNumberish | BigInt) {
        this._attesterId = value.toString()
        this.publicSignals[ReputationProof.idx.attesterId] = value.toString()
        this._snarkPublicSignals[ReputationProof.idx.attesterId] = BigInt(
            value.toString()
        )
    }

    get proveReputationAmount() {
        return this._proveReputationAmount
    }

    set proveReputationAmount(value: BigNumberish | BigInt) {
        this._proveReputationAmount = value.toString()
        this.publicSignals[ReputationProof.idx.proveReputationAmount] =
            value.toString()
        this._snarkPublicSignals[ReputationProof.idx.proveReputationAmount] =
            BigInt(value.toString())
    }

    get minRep() {
        return this._minRep
    }

    set minRep(value: BigNumberish | BigInt) {
        this._minRep = value.toString()
        this.publicSignals[ReputationProof.idx.minRep] = value.toString()
        this._snarkPublicSignals[ReputationProof.idx.minRep] = BigInt(
            value.toString()
        )
    }

    get proveGraffiti() {
        return this._proveGraffiti
    }

    set proveGraffiti(value: BigNumberish | BigInt) {
        this._proveGraffiti = value.toString()
        this.publicSignals[ReputationProof.idx.proveGraffiti] = value.toString()
        this._snarkPublicSignals[ReputationProof.idx.proveGraffiti] = BigInt(
            value.toString()
        )
    }

    get graffitiPreImage() {
        return this._graffitiPreImage
    }

    set graffitiPreImage(value: BigNumberish | BigInt) {
        this._graffitiPreImage = value.toString()
        this.publicSignals[ReputationProof.idx.graffitiPreImage] =
            value.toString()
        this._snarkPublicSignals[ReputationProof.idx.graffitiPreImage] = BigInt(
            value.toString()
        )
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
