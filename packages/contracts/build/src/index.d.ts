import { BigNumber, BigNumberish, ethers } from 'ethers';
import { SnarkProof } from '@unirep/crypto';
import { Unirep, Unirep__factory as UnirepFactory } from '../typechain';
export declare type Field = BigNumberish;
declare enum Event {
    UserSignedUp = 0,
    UserStateTransitioned = 1,
    AttestationSubmitted = 2,
    EpochEnded = 3
}
declare enum AttestationEvent {
    SendAttestation = 0,
    Airdrop = 1,
    SpendReputation = 2
}
interface IAttestation {
    attesterId: BigNumber;
    posRep: BigNumber;
    negRep: BigNumber;
    graffiti: BigNumber;
    signUp: BigNumber;
    hash(): BigInt;
}
interface IEpochKeyProof {
    globalStateTree: Field;
    epoch: Field;
    epochKey: Field;
    proof: Field[];
}
interface IReputationProof {
    repNullifiers: Field[];
    epoch: Field;
    epochKey: Field;
    globalStateTree: Field;
    attesterId: Field;
    proveReputationAmount: Field;
    minRep: Field;
    proveGraffiti: Field;
    graffitiPreImage: Field;
    proof: Field[];
}
interface ISignUpProof {
    epoch: Field;
    epochKey: Field;
    globalStateTree: Field;
    attesterId: Field;
    userHasSignedUp: Field;
    proof: Field[];
}
interface IUserTransitionProof {
    newGlobalStateTreeLeaf: Field;
    epkNullifiers: Field[];
    transitionFromEpoch: Field;
    blindedUserStates: Field[];
    fromGlobalStateTree: Field;
    blindedHashChains: Field[];
    fromEpochTree: Field;
    proof: Field[];
}
declare class Attestation implements IAttestation {
    attesterId: BigNumber;
    posRep: BigNumber;
    negRep: BigNumber;
    graffiti: BigNumber;
    signUp: BigNumber;
    constructor(_attesterId: BigInt | BigNumberish, _posRep: BigInt | BigNumberish, _negRep: BigInt | BigNumberish, _graffiti: BigInt | BigNumberish, _signUp: BigInt | BigNumberish);
    hash: () => BigInt;
}
declare class EpochKeyProof implements IEpochKeyProof {
    globalStateTree: Field;
    epoch: Field;
    epochKey: Field;
    proof: Field[];
    private publicSignals;
    constructor(_publicSignals: Field[], _proof: SnarkProof);
    verify: () => Promise<boolean>;
    hash: () => string;
}
declare class ReputationProof implements IReputationProof {
    repNullifiers: Field[];
    epoch: Field;
    epochKey: Field;
    globalStateTree: Field;
    attesterId: Field;
    proveReputationAmount: Field;
    minRep: Field;
    proveGraffiti: Field;
    graffitiPreImage: Field;
    proof: Field[];
    private publicSignals;
    constructor(_publicSignals: Field[], _proof: SnarkProof);
    verify: () => Promise<boolean>;
    hash: () => string;
}
declare class SignUpProof implements ISignUpProof {
    epoch: Field;
    epochKey: Field;
    globalStateTree: Field;
    attesterId: Field;
    userHasSignedUp: Field;
    proof: Field[];
    private publicSignals;
    constructor(_publicSignals: Field[], _proof: SnarkProof);
    verify: () => Promise<boolean>;
    hash: () => string;
}
declare class UserTransitionProof implements IUserTransitionProof {
    newGlobalStateTreeLeaf: Field;
    epkNullifiers: Field[];
    transitionFromEpoch: Field;
    blindedUserStates: Field[];
    fromGlobalStateTree: Field;
    blindedHashChains: Field[];
    fromEpochTree: Field;
    proof: Field[];
    private publicSignals;
    constructor(_publicSignals: Field[], _proof: SnarkProof);
    verify: () => Promise<boolean>;
    hash: () => string;
}
declare const computeStartTransitionProofHash: (blindedUserState: Field, blindedHashChain: Field, globalStateTree: Field, proof: Field[]) => string;
declare const computeProcessAttestationsProofHash: (outputBlindedUserState: Field, outputBlindedHashChain: Field, inputBlindedUserState: Field, proof: Field[]) => string;
declare const deployUnirep: (deployer: ethers.Signer, _treeDepths: any, _settings?: any) => Promise<Unirep>;
declare const getUnirepContract: (addressOrName: string, signerOrProvider: ethers.Signer | ethers.providers.Provider | undefined) => ethers.Contract;
export { Event, AttestationEvent, IAttestation, IEpochKeyProof, IReputationProof, ISignUpProof, IUserTransitionProof, Attestation, EpochKeyProof, ReputationProof, SignUpProof, UserTransitionProof, computeStartTransitionProofHash, computeProcessAttestationsProofHash, deployUnirep, getUnirepContract, UnirepFactory, Unirep, };
