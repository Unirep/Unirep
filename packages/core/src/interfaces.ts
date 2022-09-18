import { BigNumber, ethers } from 'ethers'

/**
 * The information of an epoch tree
 * An epoch tree is a sparse merkle tree that the key is the epoch key and the value is the hash
 * chain result.
 */
export interface IEpochTreeLeaf {
    epochKey: bigint
    hashchainResult: bigint
}

/**
 * The settings in the unirep contract, includes circuit configs and contract configs.
 */
export interface ISettings {
    globalStateTreeDepth: number
    userStateTreeDepth: number
    epochTreeDepth: number
    attestingFee: ethers.BigNumber
    epochLength: number
    numEpochKeyNoncePerEpoch: number
    maxReputationBudget: number
    numAttestationsPerProof: number
}

/**
 * TODO: don't know whether unirep social uses this object.
 * to be removed
 */
export interface IUnirepState {
    readonly settings: ISettings
    currentEpoch: number
    latestProcessedBlock: number
    GSTLeaves: { [key: string]: string[] }
    epochTreeLeaves: { [key: string]: string[] }
    latestEpochKeyToAttestationsMap: { [key: string]: string[] }
    nullifiers: string[]
}

/**
 * The information of a user state tree
 * A user state tree is a sparse merkle tree that the key is the attester ID and the value is
 * the hash value of the accumulated reputation.
 */
export interface IUserStateLeaf {
    attesterId: bigint
    reputation: IReputation
}

/**
 * The information of the reputation object and its methods.
 */
export interface IReputation {
    posRep: BigNumber
    negRep: BigNumber
    graffiti: BigNumber
    signUp: BigNumber
    toJSON(): string
    hash(): bigint
    update(
        _posRep: BigNumber,
        _negRep: BigNumber,
        _graffiti: BigNumber,
        _signUp: BigNumber
    ): IReputation
    addGraffitiPreImage(_graffitiPreImage: BigNumber): void
}

/**
 * TODO: don't know whether unirep social uses this object.
 * to be removed
 */
export interface IUserState {
    idNullifier: bigint
    idCommitment: bigint
    hasSignedUp: boolean
    latestTransitionedEpoch: number
    latestGSTLeafIndex: number
    latestUserStateLeaves: { [key: string]: string }
    transitionedFromAttestations: { [key: string]: string[] }
    unirepState: IUnirepState
}
