pragma solidity ^0.8.0;

import {UnirepTypes} from '../types/UnirepTypes.sol';

interface IUnirep is UnirepTypes {
    enum Event {
        UserSignedUp,
        UserStateTransitioned,
        AttestationSubmitted,
        EpochEnded
    }

    enum AttestationEvent {
        SendAttestation,
        Airdrop,
        SpendReputation
    }

      // Events
    event Sequencer(
        uint256 indexed epoch, 
        Event userEvent 
    );

    // Two global state tree leaf inserted events in Unirep
    // 1. UserSignUp
    // 2. UserStateTransition
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
        AttestationEvent attestationEvent,
        Attestation attestation,
        uint256 toProofIndex,
        uint256 fromProofIndex
    );

    event EpochEnded(uint256 indexed epoch);

    // Proof index events
    event IndexedEpochKeyProof(
        uint256 indexed proofIndex,
        uint256 indexed epoch,
        uint256 indexed epochKey,
        EpochKeyProof proof
    );

    event IndexedReputationProof(
        uint256 indexed proofIndex,
        uint256 indexed epoch,
        uint256 indexed epochKey,
        ReputationProof proof
    );

    // This event is emitted if a user wants to prove that he has a signup flag in an attester ID
    event IndexedUserSignedUpProof(
        uint256 indexed proofIndex,
        uint256 indexed epoch,
        uint256 indexed epochKey,
        SignUpProof proof
    );

    event IndexedStartedTransitionProof(
        uint256 indexed proofIndex,
        uint256 indexed blindedUserState,
        uint256 indexed globalStateTree,
        uint256 blindedHashChain,
        uint256[8] proof
    );

    event IndexedProcessedAttestationsProof(
        uint256 indexed proofIndex,
        uint256 indexed inputBlindedUserState,
        uint256 outputBlindedUserState,
        uint256 outputBlindedHashChain,
        uint256[8] proof
    );

    event IndexedUserStateTransitionProof(
        uint256 indexed proofIndex,
        UserTransitionProof proof,
        uint256[] proofIndexRecords
    );

    /*
     * Sign up an attester using the address who sends the transaction
     */
    function attesterSignUp() external;

    /*
     * Sign up an attester using the claimed address and the signature
     * @param attester The address of the attester who wants to sign up
     * @param signature The signature of the attester
     */
    function attesterSignUpViaRelayer(
        address attester,
        bytes calldata signature
    ) external;
}
