// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {UnirepTypes} from '../types/UnirepTypes.sol';

interface IUnirep is UnirepTypes {
    event UserSignedUp(
        uint256 indexed epoch,
        uint256 indexed identityCommitment,
        uint256 attesterId,
        uint256 airdropAmount,
        uint256 leafIndex
    );

    event UserStateTransitioned(
        uint256 indexed epoch,
        uint256 indexed hashedLeaf,
        uint256 indexed leafIndex,
        uint256 firstEpkNullifier
    );

    event AttestationSubmitted(
        uint256 indexed epoch,
        uint256 indexed epochKey,
        address indexed attester,
        Attestation attestation
    );

    event NewGSTLeaf(
        uint256 indexed epoch,
        uint256 indexed leaf,
        uint256 indexed index
    );

    event EpochEnded(uint256 indexed epoch);

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
    error ProofAlreadyUsed(bytes32 nullilier);
    error NullifierAlreadyUsed(uint256 nullilier);
    error AttestingFeeInvalid();
    error AttesterIdNotMatch(uint256 attesterId);
    error AirdropWithoutAttester();

    error InvalidSignature();
    error InvalidProofIndex();
    error InvalidSignUpFlag();
    error InvalidEpochKey();
    error EpochNotMatch();
    error InvalidTransitionEpoch();
    error InvalidBlindedUserState(uint256 blindedUserState);
    error InvalidBlindedHashChain(uint256 blindedHashChain);

    error InvalidSNARKField(AttestationFieldError); // better name???
    error EpochNotEndYet();
    error InvalidSignals();
    error InvalidProof();
    error InvalidGlobalStateTreeRoot(uint256 globalStateTreeRoot);
    error InvalidEpochTreeRoot(uint256 epochTreeRoot);

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
