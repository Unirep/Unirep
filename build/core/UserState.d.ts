import { IncrementalQuinTree, SparseMerkleTreeImpl } from '@unirep/crypto';
import { IAttestation, UnirepState } from './UnirepState';
interface IUserStateLeaf {
    attesterId: BigInt;
    reputation: Reputation;
}
interface IReputation {
    posRep: BigInt;
    negRep: BigInt;
    graffiti: BigInt;
    signUp: BigInt;
}
declare class Reputation implements IReputation {
    posRep: BigInt;
    negRep: BigInt;
    graffiti: BigInt;
    graffitiPreImage: BigInt;
    signUp: BigInt;
    constructor(_posRep: BigInt, _negRep: BigInt, _graffiti: BigInt, _signUp: BigInt);
    static default(): Reputation;
    update: (_posRep: BigInt, _negRep: BigInt, _graffiti: BigInt, _signUp: BigInt) => Reputation;
    addGraffitiPreImage: (_graffitiPreImage: BigInt) => void;
    hash: () => BigInt;
    toJSON: (space?: number) => string;
}
declare class UserState {
    userStateTreeDepth: number;
    numEpochKeyNoncePerEpoch: number;
    numAttestationsPerProof: number;
    private unirepState;
    id: any;
    commitment: any;
    private hasSignedUp;
    latestTransitionedEpoch: number;
    latestGSTLeafIndex: number;
    private latestUserStateLeaves;
    constructor(_unirepState: UnirepState, _id: any, _commitment: any, _hasSignedUp: boolean, _transitionedPosRep?: number, _transitionedNegRep?: number, _currentEpochPosRep?: number, _currentEpochNegRep?: number, _latestTransitionedEpoch?: number, _latestGSTLeafIndex?: number, _latestUserStateLeaves?: IUserStateLeaf[]);
    toJSON: (space?: number) => string;
    getUnirepStateCurrentEpoch: () => number;
    getUnirepStateGSTree: (epoch: number) => IncrementalQuinTree;
    getUnirepStateEpochTree: (epoch: number) => Promise<SparseMerkleTreeImpl>;
    getAttestations: (epochKey: string) => IAttestation[];
    getEpochKeyNullifiers: (epoch: number) => BigInt[];
    getRepByAttester: (attesterId: BigInt) => Reputation;
    nullifierExist: (nullifier: BigInt) => boolean;
    signUp: (_latestTransitionedEpoch: number, _latestGSTLeafIndex: number, _attesterId: number, _airdropAmount: number) => void;
    private _genUserStateTreeFromLeaves;
    genUserStateTree: () => Promise<SparseMerkleTreeImpl>;
    genVerifyEpochKeyProof: (epochKeyNonce: number) => Promise<{
        proof: any;
        publicSignals: any;
        globalStateTree: any;
        epoch: any;
        epochKey: any;
    }>;
    private _updateUserStateLeaf;
    genNewUserStateAfterTransition: () => Promise<{
        newGSTLeaf: BigInt;
        newUSTLeaves: IUserStateLeaf[];
    }>;
    private _genStartTransitionCircuitInputs;
    genUserStateTransitionProofs: () => Promise<{
        startTransitionProof: {
            proof: any;
            publicSignals: any;
            blindedUserState: any;
            blindedHashChain: any;
            globalStateTreeRoot: any;
        };
        processAttestationProofs: any[];
        finalTransitionProof: {
            proof: any;
            publicSignals: any;
            newGlobalStateTreeLeaf: any;
            epochKeyNullifiers: any;
            transitionedFromEpoch: any;
            blindedUserStates: any;
            fromGSTRoot: any;
            blindedHashChains: any;
            fromEpochTree: any;
        };
    }>;
    transition: (latestStateLeaves: IUserStateLeaf[]) => void;
    genProveReputationProof: (attesterId: BigInt, repNullifiersAmount: number, epkNonce: number, minRep: BigInt, proveGraffiti: BigInt, graffitiPreImage: BigInt) => Promise<{
        proof: any;
        publicSignals: any;
        reputationNullifiers: any;
        epoch: any;
        epochKey: any;
        globalStatetreeRoot: any;
        attesterId: any;
        proveReputationAmount: any;
        minRep: any;
        proveGraffiti: any;
        graffitiPreImage: any;
    }>;
    genUserSignUpProof: (attesterId: BigInt) => Promise<{
        proof: any;
        publicSignals: any;
        epoch: any;
        epochKey: any;
        globalStateTreeRoot: any;
        attesterId: any;
    }>;
}
export { IReputation, IUserStateLeaf, Reputation, UserState, };
