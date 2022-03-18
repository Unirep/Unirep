import { ethers } from 'ethers';
import { EpochKeyProof, ReputationProof, SignUpProof, UserTransitionProof } from '@unirep/contracts';
import { IAttestation } from '.';
import { SnarkProof } from '@unirep/crypto';
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
    unlock: (eth_privkey: string) => Promise<string>;
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
    submitEpochKeyProof: (epochKeyProof: EpochKeyProof) => Promise<any>;
    getEpochKeyProofIndex: (epochKeyProof: EpochKeyProof) => Promise<any>;
    getReputationProofIndex: (reputationProof: ReputationProof) => Promise<any>;
    getSignUpProofIndex: (signUpProof: SignUpProof) => Promise<any>;
    getStartTransitionProofIndex: (blindedUserState: BigInt | string, blindedHashChain: BigInt | string, GSTreeRoot: BigInt | string, proof: SnarkProof) => Promise<any>;
    getProcessAttestationsProofIndex: (outputBlindedUserState: BigInt | string, outputBlindedHashChain: BigInt | string, inputBlindedUserState: BigInt | string, proof: SnarkProof) => Promise<any>;
    submitAttestation: (attestation: IAttestation, epochKey: BigInt | string, toProofIndex: BigInt | string | number, fromProofIndex: BigInt | string | number) => Promise<any>;
    submitAttestationViaRelayer: (attesterAddr: string, signature: string, attestation: IAttestation, epochKey: BigInt | string, toProofIndex: BigInt | string | number, fromProofIndex: BigInt | string | number) => Promise<any>;
    spendReputation: (reputationProof: ReputationProof) => Promise<any>;
    airdropEpochKey: (userSignUpProof: SignUpProof) => Promise<any>;
    fastForward: () => Promise<void>;
    epochTransition: () => Promise<any>;
    startUserStateTransition: (blindedUserState: BigInt | string, blindedHashChain: BigInt | string, GSTRoot: BigInt | string, proof: any) => Promise<any>;
    processAttestations: (outputBlindedUserState: BigInt | string, outputBlindedHashChain: BigInt | string, inputBlindedUserState: BigInt | string, proof: any) => Promise<any>;
    updateUserStateRoot: (USTProof: UserTransitionProof, proofIndexes: BigInt[] | string[]) => Promise<any>;
    verifyEpochKeyValidity: (epochKeyProof: EpochKeyProof) => Promise<boolean>;
    verifyStartTransitionProof: (blindedUserState: BigInt | string, blindedHashChain: BigInt | string, GSTRoot: BigInt | string, proof: any) => Promise<boolean>;
    verifyProcessAttestationProof: (outputBlindedUserState: BigInt | string, outputBlindedHashChain: BigInt | string, intputBlindedUserState: BigInt | string, proof: any) => Promise<boolean>;
    verifyUserStateTransition: (USTProof: UserTransitionProof) => Promise<boolean>;
    verifyReputation: (reputationProof: ReputationProof) => Promise<boolean>;
    verifyUserSignUp: (signUpProof: SignUpProof) => Promise<boolean>;
    hashedBlankStateLeaf: () => Promise<any>;
    calcAirdropUSTRoot: (leafIndex: number | BigInt, leafValue: BigInt | string) => Promise<any>;
    burnAttestingFee: () => Promise<any>;
    collectEpochTransitionCompensation: () => Promise<any>;
    verifyProcessAttestationEvents: (startBlindedUserState: BigInt | string, currentBlindedUserState: BigInt | string) => Promise<boolean>;
}
