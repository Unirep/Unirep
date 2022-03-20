import { ethers } from "ethers";
import { Event } from "@unirep/contracts";
import { SnarkBigInt, SparseMerkleTree } from "@unirep/crypto";
import { IUnirepState, UnirepState } from "./UnirepState";
import { IUserState, UserState } from "./UserState";
import { formatProofForSnarkjsVerification } from "@unirep/circuits";
declare const defaultUserStateLeaf: BigInt;
declare const SMT_ZERO_LEAF: BigInt;
declare const SMT_ONE_LEAF: BigInt;
declare const computeEmptyUserStateRoot: (treeDepth: number) => BigInt;
declare const computeInitUserStateRoot: (
  treeDepth: number,
  leafIdx?: number | undefined,
  airdropPosRep?: number | undefined
) => Promise<BigInt>;
declare const genEpochKey: (
  identityNullifier: SnarkBigInt,
  epoch: number,
  nonce: number,
  _epochTreeDepth?: number
) => SnarkBigInt;
declare const genEpochKeyNullifier: (
  identityNullifier: SnarkBigInt,
  epoch: number,
  nonce: number
) => SnarkBigInt;
declare const genReputationNullifier: (
  identityNullifier: SnarkBigInt,
  epoch: number,
  nonce: number,
  attesterId: BigInt
) => SnarkBigInt;
declare const genNewSMT: (
  treeDepth: number,
  defaultLeafHash: BigInt
) => Promise<SparseMerkleTree>;
declare const verifyEpochKeyProofEvent: (
  event: ethers.Event
) => Promise<boolean>;
declare const verifyReputationProofEvent: (
  event: ethers.Event
) => Promise<boolean>;
declare const verifySignUpProofEvent: (event: ethers.Event) => Promise<boolean>;
declare const verifyStartTransitionProofEvent: (
  event: ethers.Event
) => Promise<boolean>;
declare const verifyProcessAttestationEvent: (
  event: ethers.Event
) => Promise<boolean>;
declare const verifyUserStateTransitionEvent: (
  event: ethers.Event
) => Promise<boolean>;
declare const verifyUSTEvents: (
  transitionEvent: ethers.Event,
  startTransitionEvent: ethers.Event,
  processAttestationEvents: ethers.Event[]
) => Promise<boolean>;
declare const verifyProcessAttestationEvents: (
  processAttestationEvents: ethers.Event[],
  startBlindedUserState: ethers.BigNumber,
  finalBlindedUserState: ethers.BigNumber
) => Promise<boolean>;
declare const genUnirepStateFromParams: (
  _unirepState: IUnirepState
) => UnirepState;
declare const genUnirepStateFromContract: (
  provider: ethers.providers.Provider,
  address: string,
  _unirepState?: IUnirepState | undefined
) => Promise<UnirepState>;
declare const genUserStateFromParams: (
  userIdentity: any,
  _userState: IUserState
) => UserState;
declare const genUserStateFromContract: (
  provider: ethers.providers.Provider,
  address: string,
  userIdentity: any,
  _userState?: IUserState | undefined
) => Promise<UserState>;
export {
  defaultUserStateLeaf,
  SMT_ONE_LEAF,
  SMT_ZERO_LEAF,
  computeEmptyUserStateRoot,
  computeInitUserStateRoot,
  formatProofForSnarkjsVerification,
  verifyEpochKeyProofEvent,
  verifyReputationProofEvent,
  verifySignUpProofEvent,
  verifyStartTransitionProofEvent,
  verifyProcessAttestationEvent,
  verifyProcessAttestationEvents,
  verifyUserStateTransitionEvent,
  verifyUSTEvents,
  genEpochKey,
  genEpochKeyNullifier,
  genReputationNullifier,
  genNewSMT,
  genUnirepStateFromContract,
  genUnirepStateFromParams,
  genUserStateFromContract,
  genUserStateFromParams,
};
