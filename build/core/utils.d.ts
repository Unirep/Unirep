import { ethers } from 'ethers';
import { SnarkBigInt, SparseMerkleTreeImpl } from '@unirep/crypto';
import { UnirepState } from './UnirepState';
import { UserState } from './UserState';
export interface ISettings {
    readonly globalStateTreeDepth: number;
    readonly userStateTreeDepth: number;
    readonly epochTreeDepth: number;
    readonly attestingFee: ethers.BigNumber;
    readonly epochLength: number;
    readonly numEpochKeyNoncePerEpoch: number;
    readonly maxReputationBudget: number;
    readonly defaultGSTLeaf: BigInt;
}
export interface IUnirepState {
    readonly settings: ISettings;
    currentEpoch: number;
    latestProcessedBlock: number;
    GSTLeaves: {
        [key: string]: string[];
    };
    epochTreeLeaves: {
        [key: string]: string[];
    };
    latestEpochKeyToAttestationsMap: {
        [key: string]: string[];
    };
    nullifiers: string[];
}
export interface IUserState {
    idNullifier: BigInt;
    idCommitment: BigInt;
    hasSignedUp: boolean;
    latestTransitionedEpoch: number;
    latestGSTLeafIndex: number;
    latestUserStateLeaves: {
        [key: string]: string;
    };
    unirepState: IUnirepState;
}
declare const defaultUserStateLeaf: BigInt;
declare const SMT_ZERO_LEAF: BigInt;
declare const SMT_ONE_LEAF: BigInt;
declare const computeEmptyUserStateRoot: (treeDepth: number) => BigInt;
declare const computeInitUserStateRoot: (treeDepth: number, leafIdx: number, airdropPosRep: number) => Promise<BigInt>;
declare const getTreeDepthsForTesting: (deployEnv?: string) => {
    userStateTreeDepth: number;
    globalStateTreeDepth: number;
    epochTreeDepth: number;
};
declare const genEpochKey: (identityNullifier: SnarkBigInt, epoch: number, nonce: number, _epochTreeDepth?: number) => SnarkBigInt;
declare const genEpochKeyNullifier: (identityNullifier: SnarkBigInt, epoch: number, nonce: number) => SnarkBigInt;
declare const genReputationNullifier: (identityNullifier: SnarkBigInt, epoch: number, nonce: number, attesterId: BigInt) => SnarkBigInt;
declare const genNewSMT: (treeDepth: number, defaultLeafHash: BigInt) => Promise<SparseMerkleTreeImpl>;
declare const verifyUSTEvents: (transitionEvent: ethers.Event, startTransitionEvent: ethers.Event, processAttestationEvents: ethers.Event[]) => Promise<boolean>;
declare const genUnirepStateFromContract: (provider: ethers.providers.Provider, address: string, _unirepState?: IUnirepState | undefined) => Promise<UnirepState>;
declare const genUserStateFromParams: (userIdentity: any, userIdentityCommitment: any, _userState: IUserState) => UserState;
declare const genUserStateFromContract: (provider: ethers.providers.Provider, address: string, userIdentity: any, userIdentityCommitment: any, _userState?: IUserState | undefined) => Promise<UserState>;
export { defaultUserStateLeaf, SMT_ONE_LEAF, SMT_ZERO_LEAF, computeEmptyUserStateRoot, computeInitUserStateRoot, getTreeDepthsForTesting, genEpochKey, genEpochKeyNullifier, genReputationNullifier, genNewSMT, genUnirepStateFromContract, genUserStateFromContract, genUserStateFromParams, verifyUSTEvents, };
