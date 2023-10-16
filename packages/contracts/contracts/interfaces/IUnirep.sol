// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IncrementalBinaryTree, IncrementalTreeData} from '@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol';
import {ReusableMerkleTree, ReusableTreeData} from '../libraries/ReusableMerkleTree.sol';
import {LazyMerkleTree, LazyTreeData} from '../libraries/LazyMerkleTree.sol';

/// @title IUnirep
/// @dev https://developer.unirep.io/docs/contracts-api/iunirep-sol
interface IUnirep {
    event AttesterSignedUp(
        uint160 indexed attesterId,
        uint48 epochLength,
        uint48 timestamp
    );

    event UserSignedUp(
        uint48 indexed epoch,
        uint256 indexed identityCommitment,
        uint160 indexed attesterId,
        uint256 leafIndex
    );

    event UserStateTransitioned(
        uint48 indexed epoch,
        uint160 indexed attesterId,
        uint256 indexed leafIndex,
        uint256 hashedLeaf,
        uint256 nullifier
    );

    event Attestation(
        uint48 indexed epoch,
        uint256 indexed epochKey,
        uint160 indexed attesterId,
        uint256 fieldIndex,
        uint256 change
    );

    event StateTreeLeaf(
        uint48 indexed epoch,
        uint160 indexed attesterId,
        uint256 indexed index,
        uint256 leaf
    );

    event EpochTreeLeaf(
        uint48 indexed epoch,
        uint160 indexed attesterId,
        uint256 indexed index,
        uint256 leaf
    );

    event HistoryTreeLeaf(uint160 indexed attesterId, uint256 leaf);

    event EpochEnded(uint48 indexed epoch, uint160 indexed attesterId);

    // error
    error UserAlreadySignedUp(uint256 identityCommitment);
    error AttesterAlreadySignUp(uint160 attester);
    error AttesterNotSignUp(uint160 attester);
    error AttesterInvalid();
    error NullifierAlreadyUsed(uint256 nullilier);
    error AttesterIdNotMatch(uint160 attesterId);
    error OutOfRange();
    error InvalidField();
    error EpochKeyNotProcessed();

    error InvalidSignature();
    error InvalidEpochKey();
    error EpochNotMatch();
    error InvalidEpoch(uint256 epoch);
    error ChainIdNotMatch(uint48 chainId);

    error InvalidProof();
    error InvalidHistoryTreeRoot(uint256 historyTreeRoot);

    struct SignupSignals {
        uint48 epoch;
        uint48 chainId;
        uint160 attesterId;
        uint256 stateTreeLeaf;
        uint256 identityCommitment;
    }

    struct UserStateTransitionSignals {
        uint256 historyTreeRoot;
        uint256 stateTreeLeaf;
        uint48 toEpoch;
        uint160 attesterId;
        uint256[] epochKeys;
    }

    struct EpochKeyData {
        uint40 leafIndex;
        uint48 epoch;
        uint256 leaf;
        // use a constant because compile time variables are not supported
        uint256[128] data;
    }

    struct AttesterData {
        uint48 startTimestamp;
        uint48 currentEpoch;
        uint48 epochLength;
        // epoch keyed to root keyed to whether it's valid
        mapping(uint256 => mapping(uint256 => bool)) stateTreeRoots;
        mapping(uint256 => bool) historyTreeRoots;
        // epoch keyed to root
        mapping(uint256 => uint256) epochTreeRoots;
        mapping(uint256 => bool) identityCommitments;
        IncrementalTreeData semaphoreGroup;
        // epoch key management
        mapping(uint256 => EpochKeyData) epkData;
        IncrementalTreeData historyTree;
        ReusableTreeData stateTree;
        LazyTreeData epochTree;
    }

    struct Config {
        // circuit config
        uint8 stateTreeDepth;
        uint8 epochTreeDepth;
        uint8 historyTreeDepth;
        uint8 fieldCount;
        uint8 sumFieldCount;
        uint8 numEpochKeyNoncePerEpoch;
        uint8 replNonceBits;
        uint8 replFieldBits;
    }
}
