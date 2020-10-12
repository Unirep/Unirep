import assert from 'assert'
import { BigNumber } from 'ethers'
import {
    hashLeftRight,
    IncrementalQuinTree,
    hash5,
} from 'maci-crypto'
import { SparseMerkleTreeImpl } from '../crypto/SMT'
import { defaultUserStateLeaf, genNewSMT, SMT_ONE_LEAF, SMT_ZERO_LEAF } from '../test/utils'
import { IAttestation, UnirepState } from './UnirepState'

interface IUserStateLeaf {
    attesterId: BigInt;
    reputation: Reputation;
}

interface IReputation {
    posRep: number;
    negRep: number;
    graffiti: BigInt;
}

class Reputation implements IReputation {
    public posRep: number
    public negRep: number
    public graffiti: BigInt

    constructor(
        _posRep: number,
        _negRep: number,
        _graffiti: BigInt,
    ) {
        this.posRep = _posRep
        this.negRep = _negRep
        this.graffiti = _graffiti
    }

    public static default(): Reputation {
        return new Reputation(0, 0, BigInt(0))
    }

    public update = (
        _posRep: number,
        _negRep: number,
        _graffiti: BigInt,
        _overwriteGraffiti: boolean,
    )=> {
        this.posRep = _posRep
        this.negRep = _negRep
        if (_overwriteGraffiti) this.graffiti = _graffiti
    }

    public hash = (): BigInt => {
        return hash5([
            BigInt(this.posRep),
            BigInt(this.negRep),
            this.graffiti,
            BigInt(0),
            BigInt(0),
        ])
    }
}

class UserState {
    public userStateTreeDepth: number
    
    public maxEpochKeyNonce: number
    public numAttestationsPerBatch: number

    private unirepState: UnirepState

    public id
    public commitment

    public latestTransitionedEpoch: number  // Latest epoch where the user has a record in the GST of that epoch
    public latestGSTLeafIndex: number  // Leaf index of the latest GST where the user has a record in
    private latestUserStateLeaves: IUserStateLeaf[] = []  // Latest non-default user state leaves
    private currentEpochKeys: string[] = []

    constructor(
        _userStateTreeDepth: number,
        _maxNonce: number,
        _numAttestationsPerBatch: number,
        _unirepState: UnirepState,
        _id,
        _commitment,
        _latestTransitionedEpoch: number,
        _latestGSTLeafIndex: number
    ) {

        this.userStateTreeDepth = _userStateTreeDepth
        this.maxEpochKeyNonce = _maxNonce
        this.numAttestationsPerBatch = _numAttestationsPerBatch
        this.unirepState = _unirepState
        this.id = _id
        this.commitment = _commitment
        this.latestTransitionedEpoch = _latestTransitionedEpoch
        this.latestGSTLeafIndex = _latestGSTLeafIndex
    }

    /*
     * Get the attestations of given epoch key
     */
    public getAttestations = (epochKey: string): IAttestation[] => {
        return this.unirepState.getAttestations(epochKey)
    }

    /*
     * Computes the epoch tree of given epoch
     */
    public genUserStateTree = async (): Promise<SparseMerkleTreeImpl> => {
        const USTree = await genNewSMT(this.userStateTreeDepth, defaultUserStateLeaf)

        const leaves = this.latestUserStateLeaves
        if (!leaves) return USTree
        else {
            for (const leaf of leaves) {
                await USTree.update(leaf.attesterId, leaf.reputation.hash())
            }
            return USTree
        }
    }

    /*
     * Add a new epoch key to the list of epoch key of current epoch.
     */
    public addEpochKey = (epochKey: string) => {
        if (this.currentEpochKeys.indexOf(epochKey) == -1) {
            this.currentEpochKeys.push(epochKey)
        }
    }

    /*
     * Update transition data including latest transition epoch, GST leaf index and user state tree leaves.
     */
    public transition = (
        transitionToEpoch: number,
        transitionToGSTIndex: number,
        latestStateLeaves: IUserStateLeaf[],
    ) => {
        assert(transitionToEpoch <= this.unirepState.currentEpoch, `Epoch(${transitionToEpoch}) must be less than or equal to current epoch`)

        this.latestTransitionedEpoch = transitionToEpoch
        this.latestGSTLeafIndex = transitionToGSTIndex
        // Clear all current epoch keys
        while (this.currentEpochKeys.length > 0) this.currentEpochKeys.pop()
        // Update user state leaves
        this.latestUserStateLeaves = latestStateLeaves.slice()
    }
}

export {
    IReputation,
    IUserStateLeaf,
    Reputation,
    UserState,
}