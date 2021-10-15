import { ethers } from 'ethers';
import { IAttestation } from '.';
/**
 * An API module of Unirep contracts.
 * All contract-interacting domain logic should be defined in here.
 */
export declare class UnirepContract {
    private url;
    private provider;
    private signer?;
    contract: ethers.Contract;
    constructor(unirepAddress?: any, providerUrl?: any);
    unlock: (eth_privkey?: string | undefined) => Promise<string>;
    currentEpoch: () => Promise<any>;
    epochLength: () => Promise<any>;
    latestEpochTransitionTime: () => Promise<any>;
    emptyUserStateRoot: () => Promise<any>;
    emptyGlobalStateTreeRoot: () => Promise<any>;
    numEpochKeyNoncePerEpoch: () => Promise<any>;
    maxReputationBudget: () => Promise<any>;
    maxUsers: () => Promise<any>;
    maxAttesters: () => Promise<any>;
    numUserSignUps: () => Promise<any>;
    hasUserSignedUp: (idCommitment: BigInt | string) => Promise<boolean>;
    attestingFee: () => Promise<any>;
    collectedAttestingFee: () => Promise<any>;
    epochTransitionCompensation: (ethAddr: string) => Promise<any>;
    attesters: (ethAddr: string) => Promise<any>;
    getAttesterId: () => Promise<any>;
    nextAttesterId: () => Promise<any>;
    airdropAmount: (ethAddr: string) => Promise<any>;
    treeDepths: () => Promise<any>;
    userSignUp: (commitment: string) => Promise<any>;
    attesterSignUp: () => Promise<any>;
    attesterSignUpViaRelayer: (attesterAddr: string, signature: string) => Promise<any>;
    setAirdropAmount: (airdropAmount: number | BigInt) => Promise<any>;
    submitEpochKeyProof: (epochKeyProof: BigInt[] | string[]) => Promise<any>;
    getEpochKeyProofIndex: (epochKeyProof: any[]) => Promise<any>;
    getReputationProofIndex: (reputationProof: any[]) => Promise<any>;
    getSignUpProofIndex: (signUpProof: any[]) => Promise<any>;
    getStartTransitionProofIndex: (blindedUserState: BigInt | string, blindedHashChain: BigInt | string, GSTreeRoot: BigInt | string, proof: BigInt[] | string[]) => Promise<any>;
    getProcessAttestationsProofIndex: (outputBlindedUserState: BigInt | string, outputBlindedHashChain: BigInt | string, inputBlindedUserState: BigInt | string, proof: BigInt[] | string[]) => Promise<any>;
    submitAttestation: (attestation: IAttestation, epochKey: BigInt | string, proofIndex: BigInt | string) => Promise<any>;
    submitAttestationViaRelayer: (attesterAddr: string, signature: string, attestation: IAttestation, epochKeyProof: BigInt[] | string[]) => Promise<any>;
    spendReputation: (outputNullifiers: BigInt[] | string[], epoch: number | BigInt | string, epk: number | BigInt | string, GSTRoot: BigInt | string, attesterId: number | BigInt | string, repNullifiersAmount: number | BigInt | string, minRep: number | BigInt | string, proveGraffiti: number | BigInt | string, graffitiPreImage: BigInt | string, proof: any) => Promise<any>;
    airdropEpochKey: (epoch: number | BigInt | string, epk: number | BigInt | string, GSTRoot: BigInt | string, attesterId: number | BigInt | string, proof: any) => Promise<any>;
    fastForward: () => Promise<void>;
    epochTransition: () => Promise<any>;
    startUserStateTransition: (blindedUserState: BigInt | string, blindedHashChain: BigInt | string, GSTRoot: BigInt | string, proof: any) => Promise<any>;
    processAttestations: (outputBlindedUserState: BigInt | string, outputBlindedHashChain: BigInt | string, inputBlindedUserState: BigInt | string, proof: any) => Promise<any>;
    updateUserStateRoot: (newGSTLeaf: BigInt | string, epochKeyNullifiers: BigInt[] | string[], blindedUserStates: BigInt[] | string[], blindedHashChains: BigInt[] | string[], transitionedFromEpoch: BigInt | number | string, fromGSTRoot: BigInt | string, fromEpochTree: BigInt | string, proof: any, proofIndexes: BigInt[] | string[]) => Promise<any>;
    verifyEpochKeyValidity: (GSTRoot: BigInt, currentEpoch: number, epk: BigInt, proof: any) => Promise<boolean>;
    verifyStartTransitionProof: (blindedUserState: BigInt | string, blindedHashChain: BigInt | string, GSTRoot: BigInt | string, proof: any) => Promise<boolean>;
    verifyProcessAttestationProof: (outputBlindedUserState: BigInt | string, outputBlindedHashChain: BigInt | string, intputBlindedUserState: BigInt | string, proof: any) => Promise<boolean>;
    verifyUserStateTransition: (newGSTLeaf: BigInt | string, epkNullifiers: BigInt[] | string[], fromEpoch: number | BigInt | string, blindedUserStates: BigInt[] | string[], fromGlobalStateTree: BigInt | string, blindedHashChains: BigInt[] | string[], fromEpochTree: BigInt | string, proof: any) => Promise<boolean>;
    verifyReputation: (outputNullifiers: BigInt[] | string[], epoch: number | BigInt | string, epk: number | BigInt | string, GSTRoot: BigInt | string, attesterId: number | BigInt | string, repNullifiersAmount: number | BigInt | string, minRep: number | BigInt | string, proveGraffiti: number | BigInt | string, graffitiPreImage: BigInt | string, proof: any) => Promise<boolean>;
    verifyUserSignUp: (epoch: number | BigInt | string, epk: number | BigInt | string, GSTRoot: BigInt | string, attesterId: number | BigInt | string, proof: any) => Promise<boolean>;
    hashedBlankStateLeaf: () => Promise<any>;
    calcAirdropUSTRoot: (leafIndex: number | BigInt, leafValue: BigInt | string) => Promise<any>;
    burnAttestingFee: () => Promise<any>;
    collectEpochTransitionCompensation: () => Promise<any>;
    verifyProcessAttestationEvents: (startBlindedUserState: BigInt | string, currentBlindedUserState: BigInt | string) => Promise<boolean>;
}
