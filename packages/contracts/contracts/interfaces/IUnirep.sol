// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {UnirepTypes} from '../types/UnirepTypes.sol';

interface IUnirep is UnirepTypes {
    event UserSignedUp(
        uint256 indexed epoch,
        uint256 indexed identityCommitment,
        uint256 attesterId,
        uint256 airdropAmount
    );

    event UserStateTransitioned(
        uint256 indexed epoch,
        uint256 indexed hashedLeaf,
        uint256 proofIndex
    );

    event AttestationSubmitted(
        uint256 indexed epoch,
        uint256 indexed epochKey,
        address indexed attester,
        Attestation attestation,
        uint256 toProofIndex,
        uint256 fromProofIndex
    );

    event GSTAttestationSubmitted(
        uint256 indexed epoch,
        uint256 indexed epochKey,
        address indexed attester,
        Attestation attestation,
        uint256 gstRoot
    );

    event EpochEnded(uint256 indexed epoch);

    // Proof index events
    event IndexedEpochKeyProof(
        uint256 indexed proofIndex,
        uint256 indexed epoch,
        uint256 indexed epochKey,
        uint256[] publicSignals,
        uint256[8] proof
    );

    event IndexedReputationProof(
        uint256 indexed proofIndex,
        uint256 indexed epoch,
        uint256 indexed epochKey,
        uint256[] publicSignals,
        uint256[8] proof
    );

    event IndexedStartedTransitionProof(
        uint256 indexed proofIndex,
        uint256 indexed blindedUserState,
        uint256 indexed globalStateTree,
        uint256[] publicSignals,
        uint256[8] proof
    );

    event IndexedProcessedAttestationsProof(
        uint256 indexed proofIndex,
        uint256 indexed inputBlindedUserState,
        uint256[] publicSignals,
        uint256[8] proof
    );

    event IndexedUserStateTransitionProof(
        uint256 indexed proofIndex,
        uint256[] publicSignals,
        uint256[8] proof,
        uint256[] proofIndexRecords
    );

    enum AttestationFieldError {
        POS_REP,
        NEG_REP,
        GRAFFITI
    }

    // error
    error UserAlreadySignedUp(uint256 identityCommitment);
    error ReachedMaximumNumberUserSignedUp();
    error AttesterAlreadySignUp(address attester);
    error AttesterNotSignUp(address attester);
    error NullifierAlreadyUsed(bytes32 nullilier);
    error AttestingFeeInvalid();
    error AttesterIdNotMatch(uint256 attesterId);
    error AirdropWithoutAttester();

    error InvalidSignature();
    error InvalidProofIndex();
    error InvalidSignUpFlag();
    error InvalidEpochKey();
    error EpochNotMatch();
    error InvalidTransitionEpoch();

    error InvalidSNARKField(AttestationFieldError); // better name???
    error EpochNotEndYet();
    error InvalidSignals();
    error InvalidProof();

    /**
     * Sign up an attester using the address who sends the transaction
     */
    function attesterSignUp() external;

    /**
     * Sign up an attester using the claimed address and the signature
     * @param attester The address of the attester who wants to sign up
     * @param signature The signature of the attester
     */
    function attesterSignUpViaRelayer(
        address attester,
        bytes calldata signature
    ) external;
}
