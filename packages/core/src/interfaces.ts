import { BigNumber } from 'ethers'

export interface IEpochTreeLeaf {
    epochKey: BigInt
    hashchainResult: BigInt
}

export interface IUnirepState {
    readonly config: string
    currentEpoch: number
    latestProcessedBlock: number
    GSTLeaves: { [key: string]: string[] }
    epochTreeLeaves: { [key: string]: string[] }
    latestEpochKeyToAttestationsMap: { [key: string]: string[] }
    nullifiers: string[]
}

export interface IUserStateLeaf {
    attesterId: BigInt
    reputation: IReputation
}

export interface IReputation {
    posRep: BigNumber
    negRep: BigNumber
    graffiti: BigNumber
    signUp: BigNumber
    toJSON(): string
    hash(): BigInt
    update(
        _posRep: BigNumber,
        _negRep: BigNumber,
        _graffiti: BigNumber,
        _signUp: BigNumber
    ): IReputation
    addGraffitiPreImage(_graffitiPreImage: BigNumber): void
}

export interface IUserState extends IUnirepState {
    idNullifier: BigInt
    idCommitment: BigInt
    hasSignedUp: boolean
    latestTransitionedEpoch: number
    latestGSTLeafIndex: number
    latestUserStateLeaves: { [key: string]: string }
    transitionedFromAttestations: { [key: string]: string[] }
}
