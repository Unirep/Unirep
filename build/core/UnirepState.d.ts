import { ethers } from 'ethers';
import { IncrementalQuinTree, SparseMerkleTreeImpl } from '@unirep/crypto';
interface IEpochTreeLeaf {
    epochKey: BigInt;
    hashchainResult: BigInt;
}
interface IAttestation {
    attesterId: BigInt;
    posRep: BigInt;
    negRep: BigInt;
    graffiti: BigInt;
    signUp: BigInt;
    hash(): BigInt;
}
declare class Attestation implements IAttestation {
    attesterId: BigInt;
    posRep: BigInt;
    negRep: BigInt;
    graffiti: BigInt;
    signUp: BigInt;
    constructor(_attesterId: BigInt, _posRep: BigInt, _negRep: BigInt, _graffiti: BigInt, _signUp: BigInt);
    hash: () => BigInt;
    toJSON: (space?: number) => string;
}
declare class UnirepState {
    globalStateTreeDepth: number;
    userStateTreeDepth: number;
    epochTreeDepth: number;
    attestingFee: ethers.BigNumber;
    epochLength: number;
    numEpochKeyNoncePerEpoch: number;
    maxReputationBudget: number;
    currentEpoch: number;
    defaultGSTLeaf: BigInt;
    epochTreeRoot: {
        [key: number]: BigInt;
    };
    private GSTLeaves;
    private epochTreeLeaves;
    private nullifiers;
    private globalStateTree;
    private epochTree;
    private epochKeyInEpoch;
    private epochKeyToHashchainMap;
    private epochKeyToAttestationsMap;
    private epochGSTRootMap;
    constructor(_globalStateTreeDepth: number, _userStateTreeDepth: number, _epochTreeDepth: number, _attestingFee: ethers.BigNumber, _epochLength: number, _numEpochKeyNoncePerEpoch: number, _maxReputationBudget: number);
    toJSON: (space?: number) => string;
    getNumGSTLeaves: (epoch: number) => number;
    getHashchain: (epochKey: string) => BigInt;
    getAttestations: (epochKey: string) => IAttestation[];
    getEpochKeys: (epoch: number) => string[];
    nullifierExist: (nullifier: BigInt) => boolean;
    addAttestation: (epochKey: string, attestation: IAttestation) => void;
    addReputationNullifiers: (nullifier: BigInt) => void;
    genGSTree: (epoch: number) => IncrementalQuinTree;
    genEpochTree: (epoch: number) => SparseMerkleTreeImpl;
    signUp: (epoch: number, GSTLeaf: BigInt) => void;
    epochTransition: (epoch: number) => Promise<void>;
    userStateTransition: (epoch: number, GSTLeaf: BigInt, nullifiers: BigInt[]) => void;
    GSTRootExists: (GSTRoot: BigInt | string, epoch: number) => boolean;
    epochTreeRootExists: (_epochTreeRoot: BigInt | string, epoch: number) => boolean;
}
export { Attestation, IAttestation, IEpochTreeLeaf, UnirepState, };
