import { BigNumberish } from 'ethers'

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
    posRep: BigNumberish
    negRep: BigNumberish
    graffiti: BigNumberish
    signUp: BigNumberish
    toJSON(): string
    hash(): BigInt
    update(
        _posRep: BigNumberish,
        _negRep: BigNumberish,
        _graffiti: BigNumberish,
        _signUp: BigNumberish
    ): IReputation
    addGraffitiPreImage(_graffitiPreImage: BigNumberish): void
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
