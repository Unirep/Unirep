import { BigNumber, ethers } from 'ethers'

export interface IEpochTreeLeaf {
    epochKey: bigint
    hashchainResult: bigint
}

export interface ISettings {
    readonly globalStateTreeDepth: number
    readonly userStateTreeDepth: number
    readonly epochTreeDepth: number
    readonly attestingFee: ethers.BigNumber
    readonly epochLength: number
    readonly numEpochKeyNoncePerEpoch: number
    readonly maxReputationBudget: number
}

export interface IUnirepState {
    readonly settings: ISettings
    currentEpoch: number
    latestProcessedBlock: number
    GSTLeaves: { [key: string]: string[] }
    epochTreeLeaves: { [key: string]: string[] }
    latestEpochKeyToAttestationsMap: { [key: string]: string[] }
    nullifiers: string[]
}

export interface IUserStateLeaf {
    attesterId: bigint
    reputation: IReputation
}

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
