import { IncrementalQuinTree, SparseMerkleTreeImpl } from '@unirep/crypto';
import { ISettings } from './utils';
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
    toJSON(): string;
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
    setting: ISettings;
    currentEpoch: number;
    private epochTreeRoot;
    private GSTLeaves;
    private epochTreeLeaves;
    private nullifiers;
    private globalStateTree;
    private epochTree;
    private latestProcessedBlock;
    private epochKeyInEpoch;
    private epochKeyToAttestationsMap;
    private epochGSTRootMap;
    constructor(_setting: ISettings, _currentEpoch?: number, _latestBlock?: number, _GSTLeaves?: {
        [key: number]: BigInt[];
    }, _epochTreeLeaves?: {
        [key: number]: IEpochTreeLeaf[];
    }, _epochKeyToAttestationsMap?: {
        [key: string]: IAttestation[];
    }, _nullifiers?: {
        [key: string]: boolean;
    });
    toJSON: (space?: number) => string;
    getNumGSTLeaves: (epoch: number) => number;
    getAttestations: (epochKey: string) => IAttestation[];
    getEpochKeys: (epoch: number) => string[];
    nullifierExist: (nullifier: BigInt) => boolean;
    addAttestation: (epochKey: string, attestation: IAttestation, blockNumber?: number | undefined) => void;
    addReputationNullifiers: (nullifier: BigInt, blockNumber?: number | undefined) => void;
    genGSTree: (epoch: number) => IncrementalQuinTree;
    genEpochTree: (epoch: number) => Promise<SparseMerkleTreeImpl>;
    signUp: (epoch: number, GSTLeaf: BigInt, blockNumber?: number | undefined) => void;
    epochTransition: (epoch: number, blockNumber?: number | undefined) => Promise<void>;
    userStateTransition: (epoch: number, GSTLeaf: BigInt, nullifiers: BigInt[], blockNumber?: number | undefined) => void;
    GSTRootExists: (GSTRoot: BigInt | string, epoch: number) => boolean;
    epochTreeRootExists: (_epochTreeRoot: BigInt | string, epoch: number) => Promise<boolean>;
}
export { Attestation, IAttestation, IEpochTreeLeaf, UnirepState, };
