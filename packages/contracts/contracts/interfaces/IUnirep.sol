// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

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
        uint256 negRep,
        uint256 graffiti,
        uint256 timestamp
    );

    event StateTreeLeaf(
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

    event HashchainBuilt(
        uint256 indexed epoch,
        uint160 indexed attesterId,
        uint256 index
    );

    event HashchainProcessed(
        uint256 indexed epoch,
        uint160 indexed attesterId,
        bool isEpochSealed
    );

    event EpochEnded(uint256 indexed epoch, uint160 indexed attesterId);

    // error
    error UserAlreadySignedUp(uint256 identityCommitment);
    error ReachedMaximumNumberUserSignedUp();
    error AttesterAlreadySignUp(uint160 attester);
    error AttesterNotSignUp(uint160 attester);
    error AttesterInvalid();
    error ProofAlreadyUsed(bytes32 nullilier);
    error NullifierAlreadyUsed(uint256 nullilier);
    error AttesterIdNotMatch(uint160 attesterId);

    error InvalidSignature();
    error InvalidEpochKey();
    error EpochNotMatch();
    error InvalidEpoch(uint256 epoch);

    error InvalidProof();
    error InvalidStateTreeRoot(uint256 stateTreeRoot);
    error InvalidEpochTreeRoot(uint256 epochTreeRoot);

    error HashchainInvalid();
    error HashchainNotProcessed();

    struct EpochKeySignals {
        uint256 revealNonce;
        uint256 stateTreeRoot;
        uint256 epochKey;
        uint256 data;
        uint256 nonce;
        uint256 epoch;
        uint256 attesterId;
    }

    struct ReputationSignals {
        uint256 stateTreeRoot;
        uint256 epochKey;
        uint256 graffitiPreImage;
        uint256 proveGraffiti;
        uint256 nonce;
        uint256 epoch;
        uint256 attesterId;
        uint256 revealNonce;
        uint256 proveMinRep;
        uint256 proveMaxRep;
        uint256 proveZeroRep;
        uint256 minRep;
        uint256 maxRep;
    }

    struct Reputation {
        uint256 posRep;
        uint256 negRep;
        uint256 graffiti;
        uint256 timestamp;
    }

    struct EpochKeyHashchain {
        uint256 index;
        uint256 head;
        uint256[] epochKeys;
        Reputation[] epochKeyBalances;
        bool processed;
    }

    struct EpochKeyState {
        // key the head to the struct?
        mapping(uint256 => EpochKeyHashchain) hashchain;
        uint256 totalHashchains;
        uint256 processedHashchains;
        mapping(uint256 => Reputation) balances;
        mapping(uint256 => bool) isKeyOwed;
        uint256[] owedKeys;
    }

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
        // attestation management
        mapping(uint256 => EpochKeyState) epochKeyState;
    }

    struct Config {
        // circuit config
        uint8 stateTreeDepth;
        uint8 epochTreeDepth;
        uint8 epochTreeArity;
        uint256 numEpochKeyNoncePerEpoch;
        // contract config
        uint256 emptyEpochTreeRoot;
        uint256 aggregateKeyCount;
    }
}
