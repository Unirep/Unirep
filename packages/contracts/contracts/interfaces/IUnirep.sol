// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SparseTreeData} from '../SparseMerkleTree.sol';
import {IncrementalBinaryTree, IncrementalTreeData} from '@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol';

interface IUnirep {
    event UserSignedUp(
        uint256 indexed epoch,
        uint256 indexed identityCommitment,
        uint160 indexed attesterId,
        uint256 leafIndex
    );

    event UserStateTransitioned(
        uint256 indexed epoch,
        uint160 indexed attesterId,
        uint256 indexed leafIndex,
        uint256 hashedLeaf,
        uint256 nullifier
    );

    event AttestationSubmitted(
        uint256 indexed epoch,
        uint256 indexed epochKey,
        uint160 indexed attesterId,
        uint256 posRep,
        uint256 negRep
    );

    event NewGSTLeaf(
        uint256 indexed epoch,
        uint160 indexed attesterId,
        uint256 indexed index,
        uint256 leaf
    );

    event EpochTreeLeaf(
        uint256 indexed epoch,
        uint160 indexed attesterId,
        uint256 indexed index,
        uint256 leaf
    );

    event EpochEnded(uint256 indexed epoch, uint160 indexed attesterId);

    enum AttestationFieldError {
        POS_REP,
        NEG_REP,
        GRAFFITI
    }

    // error
    error UserAlreadySignedUp(uint256 identityCommitment);
    error ReachedMaximumNumberUserSignedUp();
    error AttesterAlreadySignUp(uint160 attester);
    error AttesterNotSignUp(uint160 attester);
    error ProofAlreadyUsed(bytes32 nullilier);
    error NullifierAlreadyUsed(uint256 nullilier);
    error AttesterIdNotMatch(uint160 attesterId);

    error InvalidSignature();
    error InvalidEpochKey();
    error EpochNotMatch();

    error InvalidSNARKField(AttestationFieldError); // better name???
    error InvalidProof();
    error InvalidGlobalStateTreeRoot(uint256 globalStateTreeRoot);
    error InvalidEpochTreeRoot(uint256 epochTreeRoot);

    struct AttesterData {
        // epoch keyed to tree data
        mapping(uint256 => IncrementalTreeData) stateTrees;
        // epoch keyed to root keyed to whether it's valid
        mapping(uint256 => mapping(uint256 => bool)) stateTreeRoots;
        // epoch keyed to root
        mapping(uint256 => uint256) epochTreeRoots;
        uint256 startTimestamp;
        uint256 currentEpoch;
        uint256 epochLength;
        mapping(uint256 => bool) identityCommitments;
        IncrementalTreeData semaphoreGroup;
    }

    struct Attestation {
        // The attester’s ID
        uint160 attesterId;
        // Positive reputation
        uint256 posRep;
        // Negative reputation
        uint256 negRep;
        // A hash of an arbitary string
        uint256 graffiti;
        // A flag to indicate if user has signed up in the attester's app
        uint256 signUp;
    }

    struct Config {
        // circuit config
        uint8 globalStateTreeDepth;
        uint8 epochTreeDepth;
        uint256 numEpochKeyNoncePerEpoch;
        // contract config
        uint256 emptyEpochTreeRoot;
    }
}
