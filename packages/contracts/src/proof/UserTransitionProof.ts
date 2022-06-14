import {
    Circuit,
    formatProofForVerifierContract,
    verifyProof,
} from '@unirep/circuits'
import { NUM_EPOCH_KEY_NONCE_PER_EPOCH } from '@unirep/circuits/config'
import { SnarkProof, SnarkPublicSignals } from '@unirep/crypto'
import assert from 'assert'
import { BigNumberish } from 'ethers'
import { hashProof, IProofStruct } from '..'

export class UserTransitionProof implements IProofStruct {
    static readonly idx = {
        newGlobalStateTreeLeaf: 0,
        epkNullifiers: [1, NUM_EPOCH_KEY_NONCE_PER_EPOCH + 1],
        transitionFromEpoch: NUM_EPOCH_KEY_NONCE_PER_EPOCH + 1,
        blindedUserStates: [
            NUM_EPOCH_KEY_NONCE_PER_EPOCH + 2,
            NUM_EPOCH_KEY_NONCE_PER_EPOCH + 4,
        ],
        fromGlobalStateTree: 4 + NUM_EPOCH_KEY_NONCE_PER_EPOCH,
        blindedHashChains: [
            5 + NUM_EPOCH_KEY_NONCE_PER_EPOCH,
            5 + 2 * NUM_EPOCH_KEY_NONCE_PER_EPOCH,
        ],
        fromEpochTree: 5 + 2 * NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    }

    private _snarkProof: SnarkProof
    private _snarkPublicSignals: SnarkPublicSignals
    private _newGlobalStateTreeLeaf: BigNumberish
    private _epkNullifiers: BigNumberish[]
    private _transitionFromEpoch: BigNumberish
    private _blindedUserStates: BigNumberish[]
    private _fromGlobalStateTree: BigNumberish
    private _blindedHashChains: BigNumberish[]
    private _fromEpochTree: BigNumberish
    public proof: string[]
    public publicSignals: string[]

    constructor(
        _publicSignals: SnarkPublicSignals | BigNumberish[],
        _proof: SnarkProof
    ) {
        this._snarkProof = _proof
        this._snarkPublicSignals = _publicSignals.map((n) => BigInt(n))
        const formattedProof: any[] = formatProofForVerifierContract(_proof)
        this._newGlobalStateTreeLeaf =
            _publicSignals[
                UserTransitionProof.idx.newGlobalStateTreeLeaf
            ].toString()
        this._epkNullifiers = _publicSignals
            .slice(
                UserTransitionProof.idx.epkNullifiers[0],
                UserTransitionProof.idx.epkNullifiers[1]
            )
            .map((n) => n.toString())
        this._blindedUserStates = _publicSignals
            .slice(
                UserTransitionProof.idx.blindedUserStates[0],
                UserTransitionProof.idx.blindedUserStates[1]
            )
            .map((n) => n.toString())
        this._blindedHashChains = _publicSignals
            .slice(
                UserTransitionProof.idx.blindedHashChains[0],
                UserTransitionProof.idx.blindedHashChains[1]
            )
            .map((n) => n.toString())
        this._transitionFromEpoch =
            _publicSignals[
                UserTransitionProof.idx.transitionFromEpoch
            ].toString()

        this._fromGlobalStateTree =
            _publicSignals[
                UserTransitionProof.idx.fromGlobalStateTree
            ].toString()
        for (let i = 0; i < NUM_EPOCH_KEY_NONCE_PER_EPOCH; i++) {
            this._blindedHashChains.push(
                _publicSignals[5 + NUM_EPOCH_KEY_NONCE_PER_EPOCH + i].toString()
            )
        }
        this._fromEpochTree =
            _publicSignals[5 + NUM_EPOCH_KEY_NONCE_PER_EPOCH * 2].toString()
        this.proof = formattedProof
        this.publicSignals = _publicSignals.map((n) => n.toString())
    }

    get newGlobalStateTreeLeaf(): BigNumberish {
        return this._newGlobalStateTreeLeaf
    }

    set newGlobalStateTreeLeaf(value: BigNumberish | BigInt) {
        this._newGlobalStateTreeLeaf = value.toString()
        this.publicSignals[UserTransitionProof.idx.newGlobalStateTreeLeaf] =
            value.toString()
        this._snarkPublicSignals[
            UserTransitionProof.idx.newGlobalStateTreeLeaf
        ] = BigInt(value.toString())
    }

    get epkNullifiers(): BigNumberish[] {
        return this._epkNullifiers
    }

    set epkNullifiers(values: BigNumberish[] | BigInt[]) {
        assert(
            values.length === NUM_EPOCH_KEY_NONCE_PER_EPOCH,
            `UserTransitionProof: Length of epoch key nullifiers should be ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}`
        )
        this._epkNullifiers = values.map((n) => n.toString())
        for (let i = 0; i < values.length; i++) {
            this.publicSignals[UserTransitionProof.idx.epkNullifiers[0] + i] =
                values[i].toString()
            this._snarkPublicSignals[
                UserTransitionProof.idx.epkNullifiers[0] + i
            ] = BigInt(values[i].toString())
        }
    }

    get transitionFromEpoch(): BigNumberish {
        return this._transitionFromEpoch
    }

    set transitionFromEpoch(value: BigNumberish | BigInt) {
        this._transitionFromEpoch = value.toString()
        this.publicSignals[UserTransitionProof.idx.transitionFromEpoch] =
            value.toString()
        this._snarkPublicSignals[UserTransitionProof.idx.transitionFromEpoch] =
            BigInt(value.toString())
    }

    get blindedUserStates(): BigNumberish[] {
        return this._blindedUserStates
    }

    set blindedUserStates(values: BigNumberish[] | BigInt[]) {
        assert(
            values.length === 2,
            `UserTransitionProof: Length of blinded user states should be ${2}`
        )
        this._blindedUserStates = values.map((n) => n.toString())
        for (let i = 0; i < values.length; i++) {
            this.publicSignals[
                UserTransitionProof.idx.blindedUserStates[0] + i
            ] = values[i].toString()
            this._snarkPublicSignals[
                UserTransitionProof.idx.blindedUserStates[0] + i
            ] = BigInt(values[i].toString())
        }
    }

    get fromGlobalStateTree(): BigNumberish {
        return this._fromGlobalStateTree
    }

    set fromGlobalStateTree(value: BigNumberish | BigInt) {
        this._fromGlobalStateTree = value.toString()
        this.publicSignals[UserTransitionProof.idx.fromGlobalStateTree] =
            value.toString()
        this._snarkPublicSignals[UserTransitionProof.idx.fromGlobalStateTree] =
            BigInt(value.toString())
    }

    get blindedHashChains(): BigNumberish[] {
        return this._blindedHashChains
    }

    set blindedHashChains(values: BigNumberish[] | BigInt[]) {
        assert(
            values.length === NUM_EPOCH_KEY_NONCE_PER_EPOCH,
            `UserTransitionProof: Length of blinded user states should be ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}`
        )
        this._blindedHashChains = values.map((n) => n.toString())
        for (let i = 0; i < values.length; i++) {
            this.publicSignals[
                UserTransitionProof.idx.blindedHashChains[0] + i
            ] = values[i].toString()
            this._snarkPublicSignals[
                UserTransitionProof.idx.blindedHashChains[0] + i
            ] = BigInt(values[i].toString())
        }
    }

    get fromEpochTree(): BigNumberish {
        return this._fromEpochTree
    }

    set fromEpochTree(value: BigNumberish | BigInt) {
        this._fromEpochTree = value.toString()
        this.publicSignals[UserTransitionProof.idx.fromEpochTree] =
            value.toString()
        this._snarkPublicSignals[UserTransitionProof.idx.fromEpochTree] =
            BigInt(value.toString())
    }

    public verify = (): Promise<boolean> => {
        return verifyProof(
            Circuit.userStateTransition,
            this._snarkProof,
            this._snarkPublicSignals
        )
    }

    public hash = () => {
        return hashProof(this.publicSignals, this.proof)
    }
}
