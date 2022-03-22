pragma solidity 0.8.1;

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
        uint256 indexed _epoch, 
        Event _event
    );

    // Two global state tree leaf inserted events in Unirep
    // 1. UserSignUp
    // 2. UserStateTransition
    event UserSignedUp(
        uint256 indexed _epoch,
        uint256 indexed _identityCommitment,
        uint256 _attesterId,
        uint256 _airdropAmount
    );

    event UserStateTransitioned(
        uint256 indexed _epoch,
        uint256 indexed _hashedLeaf,
        uint256 _proofIndex
    );

    event AttestationSubmitted(
        uint256 indexed _epoch,
        uint256 indexed _epochKey,
        address indexed _attester,
        AttestationEvent _event,
        Attestation _attestation,
        uint256 toProofIndex,
        uint256 fromProofIndex
    );

    event EpochEnded(uint256 indexed _epoch);

    // Proof index events
    event IndexedEpochKeyProof(
        uint256 indexed _proofIndex,
        uint256 indexed _epoch,
        uint256 indexed _epochKey,
        EpochKeyProof _proof
    );

    event IndexedReputationProof(
        uint256 indexed _proofIndex,
        uint256 indexed _epoch,
        uint256 indexed _epochKey,
        ReputationProof _proof
    );

    // This event is emitted if a user wants to prove that he has a signup flag in an attester ID
    event IndexedUserSignedUpProof(
        uint256 indexed _proofIndex,
        uint256 indexed _epoch,
        uint256 indexed _epochKey,
        SignUpProof _proof
    );

    event IndexedStartedTransitionProof(
        uint256 indexed _proofIndex,
        uint256 indexed _blindedUserState,
        uint256 indexed _globalStateTree,
        uint256 _blindedHashChain,
        uint256[8] _proof
    );

    event IndexedProcessedAttestationsProof(
        uint256 indexed _proofIndex,
        uint256 indexed _inputBlindedUserState,
        uint256 _outputBlindedUserState,
        uint256 _outputBlindedHashChain,
        uint256[8] _proof
    );

    event IndexedUserStateTransitionProof(
        uint256 indexed _proofIndex,
        UserTransitionProof _proof,
        uint256[] _proofIndexRecords
    );
}
