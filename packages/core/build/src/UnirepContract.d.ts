import { BigNumberish } from 'ethers';
import { EpochKeyProof, ReputationProof, SignUpProof, UserTransitionProof, Unirep } from '@unirep/contracts';
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
    contract: Unirep;
    constructor(unirepAddress?: any, providerUrl?: any);
    unlock: (eth_privkey: string) => Promise<string>;
    currentEpoch: () => Promise<any>;
    epochLength: () => Promise<any>;
    latestEpochTransitionTime: () => Promise<any>;
    numEpochKeyNoncePerEpoch: () => Promise<any>;
    maxReputationBudget: () => Promise<any>;
    maxUsers: () => Promise<any>;
    maxAttesters: () => Promise<any>;
    numUserSignUps: () => Promise<any>;
    hasUserSignedUp: (idCommitment: BigNumberish) => Promise<boolean>;
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
    setAirdropAmount: (airdropAmount: BigNumberish) => Promise<any>;
    submitEpochKeyProof: (epochKeyProof: EpochKeyProof) => Promise<any>;
    getEpochKeyProofIndex: (epochKeyProof: EpochKeyProof) => Promise<any>;
    getReputationProofIndex: (reputationProof: ReputationProof) => Promise<any>;
    getSignUpProofIndex: (signUpProof: SignUpProof) => Promise<any>;
    getStartTransitionProofIndex: (blindedUserState: BigNumberish, blindedHashChain: BigNumberish, GSTreeRoot: BigNumberish, proof: SnarkProof) => Promise<any>;
    getProcessAttestationsProofIndex: (outputBlindedUserState: BigNumberish, outputBlindedHashChain: BigNumberish, inputBlindedUserState: BigNumberish, proof: SnarkProof) => Promise<any>;
    submitAttestation: (attestation: IAttestation, epochKey: BigNumberish, toProofIndex: BigNumberish | number, fromProofIndex: BigNumberish | number) => Promise<any>;
    submitAttestationViaRelayer: (attesterAddr: string, signature: string, attestation: IAttestation, epochKey: BigNumberish, toProofIndex: BigNumberish | number, fromProofIndex: BigNumberish | number) => Promise<any>;
    spendReputation: (reputationProof: ReputationProof) => Promise<any>;
    airdropEpochKey: (userSignUpProof: SignUpProof) => Promise<any>;
    fastForward: () => Promise<void>;
    epochTransition: () => Promise<any>;
    startUserStateTransition: (blindedUserState: BigNumberish, blindedHashChain: BigNumberish, GSTRoot: BigNumberish, proof: any) => Promise<any>;
    processAttestations: (outputBlindedUserState: BigNumberish, outputBlindedHashChain: BigNumberish, inputBlindedUserState: BigNumberish, proof: any) => Promise<any>;
    updateUserStateRoot: (USTProof: UserTransitionProof, proofIndexes: BigNumberish[]) => Promise<any>;
    verifyEpochKeyValidity: (epochKeyProof: EpochKeyProof) => Promise<boolean>;
    verifyStartTransitionProof: (blindedUserState: BigNumberish, blindedHashChain: BigNumberish, GSTRoot: BigNumberish, proof: any) => Promise<boolean>;
    verifyProcessAttestationProof: (outputBlindedUserState: BigNumberish, outputBlindedHashChain: BigNumberish, intputBlindedUserState: BigNumberish, proof: any) => Promise<boolean>;
    verifyUserStateTransition: (USTProof: UserTransitionProof) => Promise<boolean>;
    verifyReputation: (reputationProof: ReputationProof) => Promise<boolean>;
    verifyUserSignUp: (signUpProof: SignUpProof) => Promise<boolean>;
    burnAttestingFee: () => Promise<any>;
    collectEpochTransitionCompensation: () => Promise<any>;
    verifyProcessAttestationEvents: (startBlindedUserState: BigNumberish, currentBlindedUserState: BigNumberish) => Promise<boolean>;
}
