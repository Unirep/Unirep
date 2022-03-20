import { BigNumberish, ethers } from 'ethers'
import { IncrementalMerkleTree, SparseMerkleTree } from '@unirep/crypto'
interface IEpochTreeLeaf {
    epochKey: BigInt
    hashchainResult: BigInt
}
interface IAttestation {
    attesterId: BigNumberish
    posRep: BigNumberish
    negRep: BigNumberish
    graffiti: BigNumberish
    signUp: BigNumberish
    hash(): BigInt
    toJSON(): string
}
interface ISettings {
    readonly globalStateTreeDepth: number
    readonly userStateTreeDepth: number
    readonly epochTreeDepth: number
    readonly attestingFee: ethers.BigNumber
    readonly epochLength: number
    readonly numEpochKeyNoncePerEpoch: number
    readonly maxReputationBudget: number
}
interface IUnirepState {
    readonly settings: ISettings
    currentEpoch: number
    latestProcessedBlock: number
    GSTLeaves: {
        [key: string]: string[]
    }
    epochTreeLeaves: {
        [key: string]: string[]
    }
    latestEpochKeyToAttestationsMap: {
        [key: string]: string[]
    }
    nullifiers: string[]
}
declare class Attestation implements IAttestation {
    attesterId: BigNumberish
    posRep: BigNumberish
    negRep: BigNumberish
    graffiti: BigNumberish
    signUp: BigNumberish
    constructor(
        _attesterId: BigNumberish,
        _posRep: BigNumberish,
        _negRep: BigNumberish,
        _graffiti: BigNumberish,
        _signUp: BigNumberish
    )
    hash: () => BigInt
    toJSON: (space?: number) => string
}
declare class UnirepState {
    readonly setting: ISettings
    currentEpoch: number
    private epochTreeRoot
    private GSTLeaves
    private epochTreeLeaves
    private nullifiers
    private globalStateTree
    private epochTree
    private defaultGSTLeaf
    private userNum
    latestProcessedBlock: number
    private sealedEpochKey
    private epochKeyInEpoch
    private epochKeyToAttestationsMap
    private epochGSTRootMap
    constructor(
        _setting: ISettings,
        _currentEpoch?: number,
        _latestBlock?: number,
        _GSTLeaves?: {
            [key: number]: BigInt[]
        },
        _epochTreeLeaves?: {
            [key: number]: IEpochTreeLeaf[]
        },
        _epochKeyToAttestationsMap?: {
            [key: string]: IAttestation[]
        },
        _nullifiers?: {
            [key: string]: boolean
        }
    )
    toJSON: (space?: number) => string
    getNumGSTLeaves: (epoch: number) => number
    getAttestations: (epochKey: string) => IAttestation[]
    getEpochKeys: (epoch: number) => string[]
    nullifierExist: (nullifier: BigInt) => boolean
    nullifiersExist: (nullifiers: BigInt[]) => boolean
    private _checkBlockNumber
    private _checkCurrentEpoch
    private _checkValidEpoch
    private _checkMaxUser
    private _checkNullifier
    private _checkEpochKeyRange
    private _isEpochKeySealed
    private _updateGSTree
    genGSTree: (epoch: number) => IncrementalMerkleTree
    genEpochTree: (epoch: number) => Promise<SparseMerkleTree>
    GSTRootExists: (GSTRoot: BigInt | string, epoch: number) => boolean
    epochTreeRootExists: (
        _epochTreeRoot: BigInt | string,
        epoch: number
    ) => Promise<boolean>
    signUp: (
        epoch: number,
        idCommitment: BigInt,
        attesterId?: number | undefined,
        airdropAmount?: number | undefined,
        blockNumber?: number | undefined
    ) => Promise<void>
    addAttestation: (
        epochKey: string,
        attestation: IAttestation,
        blockNumber?: number | undefined
    ) => void
    addReputationNullifiers: (
        nullifier: BigInt,
        blockNumber?: number | undefined
    ) => void
    epochTransition: (
        epoch: number,
        blockNumber?: number | undefined
    ) => Promise<void>
    userStateTransition: (
        fromEpoch: number,
        GSTLeaf: BigInt,
        nullifiers: BigInt[],
        blockNumber?: number | undefined
    ) => void
}
export {
    Attestation,
    IAttestation,
    IEpochTreeLeaf,
    ISettings,
    IUnirepState,
    UnirepState,
}
