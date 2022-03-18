import { ethers } from 'ethers';
import { SparseMerkleTree, SnarkBigInt, Identity, SnarkProof, IncrementalMerkleTree } from '@unirep/crypto';
import { Circuit } from '@unirep/circuits';
import { Attestation } from '../src';
declare const SMT_ZERO_LEAF: BigInt;
declare const SMT_ONE_LEAF: BigInt;
declare const GSTZERO_VALUE = 0;
export declare type Field = BigInt | string | number | ethers.BigNumber;
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
}
declare const getTreeDepthsForTesting: () => {
    userStateTreeDepth: number;
    globalStateTreeDepth: number;
    epochTreeDepth: number;
};
declare const toCompleteHexString: (str: string, len?: number | undefined) => string;
declare const genNewSMT: (treeDepth: number, defaultLeafHash: BigInt) => Promise<SparseMerkleTree>;
declare const genNewEpochTree: (_epochTreeDepth?: number) => Promise<SparseMerkleTree>;
declare const defaultUserStateLeaf: BigInt;
declare const computeEmptyUserStateRoot: (treeDepth: number) => BigInt;
declare const defaultGSTLeaf: (treeDepth: number) => BigInt;
declare const genNewUserStateTree: (_userStateTreeDepth?: number) => Promise<SparseMerkleTree>;
declare const genEpochKey: (identityNullifier: SnarkBigInt, epoch: number, nonce: number, _epochTreeDepth?: number) => SnarkBigInt;
declare const genEpochKeyNullifier: (identityNullifier: SnarkBigInt, epoch: number, nonce: number) => SnarkBigInt;
declare const bootstrapRandomUSTree: () => Promise<any>;
declare const genEpochKeyCircuitInput: (id: Identity, tree: IncrementalMerkleTree, leafIndex: number, ustRoot: BigInt, epoch: number, nonce: number) => any;
declare const genStartTransitionCircuitInput: (id: Identity, tree: IncrementalMerkleTree, leafIndex: number, ustRoot: BigInt, epoch: number, nonce: number) => any;
declare const genProcessAttestationsCircuitInput: (id: Identity, epoch: BigInt, fromNonce: BigInt, toNonce: BigInt, _selectors?: number[] | undefined, _hashChainStarter?: BigInt | undefined, _attestations?: Attestation[] | undefined) => Promise<{
    circuitInputs: any;
    hashChainResult: BigInt;
}>;
declare const genUserStateTransitionCircuitInput: (id: Identity, epoch: number) => Promise<any>;
declare const genReputationCircuitInput: (id: Identity, epoch: number, nonce: number, reputationRecords: any, attesterId: any, _repNullifiersAmount?: any, _minRep?: any, _proveGraffiti?: any, _graffitiPreImage?: any) => Promise<any>;
declare const genProveSignUpCircuitInput: (id: Identity, epoch: number, reputationRecords: any, attesterId: any, _signUp?: number | undefined) => Promise<any>;
declare const formatProofAndPublicSignals: (circuit: Circuit, proof: SnarkProof, publicSignals: any[]) => any;
declare const genProofAndVerify: (circuit: Circuit, circuitInputs: any) => Promise<boolean>;
declare const genInputForContract: (circuit: Circuit, circuitInputs: any) => Promise<any>;
export { Attestation, Reputation, SMT_ONE_LEAF, SMT_ZERO_LEAF, GSTZERO_VALUE, computeEmptyUserStateRoot, defaultUserStateLeaf, defaultGSTLeaf, getTreeDepthsForTesting, genNewEpochTree, genNewUserStateTree, genNewSMT, toCompleteHexString, genEpochKey, genEpochKeyNullifier, bootstrapRandomUSTree, genEpochKeyCircuitInput, genStartTransitionCircuitInput, genProcessAttestationsCircuitInput, genUserStateTransitionCircuitInput, genReputationCircuitInput, genProveSignUpCircuitInput, formatProofAndPublicSignals, genProofAndVerify, genInputForContract, };
