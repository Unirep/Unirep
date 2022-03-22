import {
    IncrementalMerkleTree,
    SparseMerkleTree,
    ZkIdentity,
} from '@unirep/crypto'
import { IAttestation, IUnirepState, UnirepState } from './UnirepState'
interface IUserStateLeaf {
    attesterId: BigInt
    reputation: Reputation
}
interface IReputation {
    posRep: BigInt
    negRep: BigInt
    graffiti: BigInt
    signUp: BigInt
}
interface IUserState {
    idNullifier: BigInt
    idCommitment: BigInt
    hasSignedUp: boolean
    latestTransitionedEpoch: number
    latestGSTLeafIndex: number
    latestUserStateLeaves: {
        [key: string]: string
    }
    transitionedFromAttestations: {
        [key: string]: string[]
    }
    unirepState: IUnirepState
}
declare class Reputation implements IReputation {
    posRep: BigInt
    negRep: BigInt
    graffiti: BigInt
    graffitiPreImage: BigInt
    signUp: BigInt
    constructor(
        _posRep: BigInt,
        _negRep: BigInt,
        _graffiti: BigInt,
        _signUp: BigInt
    )
    static default(): Reputation
    update: (
        _posRep: BigInt,
        _negRep: BigInt,
        _graffiti: BigInt,
        _signUp: BigInt
    ) => Reputation
    addGraffitiPreImage: (_graffitiPreImage: BigInt) => void
    hash: () => BigInt
    toJSON: (space?: number) => string
}
declare class UserState {
    userStateTreeDepth: number
    numEpochKeyNoncePerEpoch: number
    numAttestationsPerProof: number
    private unirepState
    id: ZkIdentity
    commitment: any
    private hasSignedUp
    latestTransitionedEpoch: number
    latestGSTLeafIndex: number
    private latestUserStateLeaves
    private transitionedFromAttestations
    constructor(
        _unirepState: UnirepState,
        _id: ZkIdentity,
        _hasSignedUp?: boolean,
        _latestTransitionedEpoch?: number,
        _latestGSTLeafIndex?: number,
        _latestUserStateLeaves?: IUserStateLeaf[],
        _transitionedFromAttestations?: {
            [key: string]: IAttestation[]
        }
    )
    toJSON: (space?: number) => string
    getUnirepStateCurrentEpoch: () => number
    getUnirepStateGSTree: (epoch: number) => IncrementalMerkleTree
    getUnirepStateEpochTree: (epoch: number) => Promise<SparseMerkleTree>
    getUnirepState: () => UnirepState
    getAttestations: (epochKey: string) => IAttestation[]
    addAttestation: (
        epochKey: string,
        attestation: IAttestation,
        blockNumber?: number | undefined
    ) => void
    addReputationNullifiers: (
        nullifier: BigInt,
        blockNumber?: number | undefined
    ) => void
    getEpochKeyNullifiers: (epoch: number) => BigInt[]
    getRepByAttester: (attesterId: BigInt) => Reputation
    nullifierExist: (nullifier: BigInt) => boolean
    private _checkUserSignUp
    private _checkUserNotSignUp
    private _checkEpkNonce
    private _checkAttesterId
    signUp: (
        _epoch: number,
        _identityCommitment: BigInt,
        _attesterId?: number | undefined,
        _airdropAmount?: number | undefined,
        blockNumber?: number | undefined
    ) => Promise<void>
    private _genUserStateTreeFromLeaves
    genUserStateTree: () => Promise<SparseMerkleTree>
    GSTRootExists: (GSTRoot: BigInt | string, epoch: number) => boolean
    epochTreeRootExists: (
        _epochTreeRoot: BigInt | string,
        epoch: number
    ) => Promise<boolean>
    userStateTransition: (
        fromEpoch: number,
        GSTLeaf: BigInt,
        nullifiers: BigInt[],
        blockNumber?: number | undefined
    ) => Promise<void>
    genVerifyEpochKeyProof: (epochKeyNonce: number) => Promise<{
        proof: any
        publicSignals: any
        globalStateTree: any
        epoch: any
        epochKey: any
    }>
    private _updateUserStateLeaf
    private _saveAttestations
    epochTransition: (
        epoch: number,
        blockNumber?: number | undefined
    ) => Promise<void>
    private _genNewUserStateAfterTransition
    private _genStartTransitionCircuitInputs
    genUserStateTransitionProofs: () => Promise<{
        startTransitionProof: {
            proof: any
            publicSignals: any
            blindedUserState: any
            blindedHashChain: any
            globalStateTreeRoot: any
        }
        processAttestationProofs: any[]
        finalTransitionProof: {
            proof: any
            publicSignals: any
            newGlobalStateTreeLeaf: any
            epochKeyNullifiers: any
            transitionedFromEpoch: any
            blindedUserStates: any
            fromGSTRoot: any
            blindedHashChains: any
            fromEpochTree: any
        }
    }>
    private _transition
    genProveReputationProof: (
        attesterId: BigInt,
        epkNonce: number,
        minRep?: number | undefined,
        proveGraffiti?: BigInt | undefined,
        graffitiPreImage?: BigInt | undefined,
        nonceList?: BigInt[] | undefined
    ) => Promise<{
        proof: any
        publicSignals: any
        reputationNullifiers: any
        epoch: any
        epochKey: any
        globalStatetreeRoot: any
        attesterId: any
        proveReputationAmount: any
        minRep: any
        proveGraffiti: any
        graffitiPreImage: any
    }>
    genUserSignUpProof: (attesterId: BigInt) => Promise<{
        proof: any
        publicSignals: any
        epoch: any
        epochKey: any
        globalStateTreeRoot: any
        attesterId: any
        userHasSignedUp: any
    }>
}
export { IReputation, IUserStateLeaf, IUserState, Reputation, UserState }
