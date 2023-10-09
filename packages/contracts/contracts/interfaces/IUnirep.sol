// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IncrementalBinaryTree, IncrementalTreeData} from '@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol';
import {ReusableMerkleTree, ReusableTreeData} from '../libraries/ReusableMerkleTree.sol';
import {LazyMerkleTree, LazyTreeData} from '../libraries/LazyMerkleTree.sol';

/// @title IUnirep
/// @dev https://developer.unirep.io/docs/contracts-api/iunirep-sol
interface IUnirep {
    /// @dev https://developer.unirep.io/docs/contracts-api/iunirep-sol#attestersignedup
    event AttesterSignedUp(
        uint160 indexed attesterId,
        uint48 epochLength,
        uint48 timestamp
    );

    /// @dev https://developer.unirep.io/docs/contracts-api/iunirep-sol#usersignup
    event UserSignedUp(
        uint48 indexed epoch,
        uint256 indexed identityCommitment,
        uint160 indexed attesterId,
        uint256 leafIndex
    );

    /// @dev https://developer.unirep.io/docs/contracts-api/iunirep-sol#userstatetransitioned
    event UserStateTransitioned(
        uint48 indexed epoch,
        uint160 indexed attesterId,
        uint256 indexed leafIndex,
        uint256 hashedLeaf,
        uint256 nullifier
    );

    /// @dev https://developer.unirep.io/docs/contracts-api/iunirep-sol#attestation
    event Attestation(
        uint48 indexed epoch,
        uint256 indexed epochKey,
        uint160 indexed attesterId,
        uint256 fieldIndex,
        uint256 change
    );

    /// @dev https://developer.unirep.io/docs/contracts-api/iunirep-sol#statetreeleaf
    event StateTreeLeaf(
        uint48 indexed epoch,
        uint160 indexed attesterId,
        uint256 indexed index,
        uint256 leaf
    );

    /// @dev https://developer.unirep.io/docs/contracts-api/iunirep-sol#epochtreeleaf
    event EpochTreeLeaf(
        uint48 indexed epoch,
        uint160 indexed attesterId,
        uint256 indexed index,
        uint256 leaf
    );

    /// @dev https://developer.unirep.io/docs/contracts-api/iunirep-sol#historytreeleaf
    event HistoryTreeLeaf(uint160 indexed attesterId, uint256 leaf);

    /// @dev https://developer.unirep.io/docs/contracts-api/iunirep-sol#epochended
    event EpochEnded(uint48 indexed epoch, uint160 indexed attesterId);

    // error
    /// @dev https://developer.unirep.io/docs/contracts-api/errorss
    error UserAlreadySignedUp(uint256 identityCommitment);
    /// @dev https://developer.unirep.io/docs/contracts-api/errorss
    error AttesterAlreadySignUp(uint160 attester);
    /// @dev https://developer.unirep.io/docs/contracts-api/errorss
    error AttesterNotSignUp(uint160 attester);
    /// @dev https://developer.unirep.io/docs/contracts-api/errorss
    error AttesterInvalid();
    /// @dev https://developer.unirep.io/docs/contracts-api/errorss
    error NullifierAlreadyUsed(uint256 nullilier);
    /// @dev https://developer.unirep.io/docs/contracts-api/errorss
    error AttesterIdNotMatch(uint160 attesterId);
    /// @dev https://developer.unirep.io/docs/contracts-api/errorss
    error OutOfRange();
    /// @dev https://developer.unirep.io/docs/contracts-api/errorss
    error InvalidField();
    /// @dev https://developer.unirep.io/docs/contracts-api/errorss
    error EpochKeyNotProcessed();
    /// @dev https://developer.unirep.io/docs/contracts-api/errorss
    error InvalidSignature();
    /// @dev https://developer.unirep.io/docs/contracts-api/errorss
    error InvalidEpochKey();
    /// @dev https://developer.unirep.io/docs/contracts-api/errorss
    error EpochNotMatch();
    /// @dev https://developer.unirep.io/docs/contracts-api/errorss
    error InvalidEpoch(uint256 epoch);
    /// @dev https://developer.unirep.io/docs/contracts-api/errorss
    error ChainIdNotMatch(uint48 chainId);
    /// @dev https://developer.unirep.io/docs/contracts-api/errorss
    error InvalidProof();
    /// @dev https://developer.unirep.io/docs/contracts-api/errorss
    error InvalidHistoryTreeRoot(uint256 historyTreeRoot);

    /// @dev https://developer.unirep.io/docs/contracts-api/iunirep-sol#signupsignals
    struct SignupSignals {
        uint48 epoch;
        uint48 chainId;
        uint160 attesterId;
        uint256 stateTreeLeaf;
        uint256 identityCommitment;
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/iunirep-sol#userstatetransitionsignals
    struct UserStateTransitionSignals {
        uint256 historyTreeRoot;
        uint256 stateTreeLeaf;
        uint48 toEpoch;
        uint160 attesterId;
        uint256[] epochKeys;
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/iunirep-sol#epochkeydata
    struct EpochKeyData {
        uint40 leafIndex;
        uint48 epoch;
        uint256 leaf;
        // use a constant because compile time variables are not supported
        uint256[128] data;
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/iunirep-sol#attesterdata
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

    /// @dev https://developer.unirep.io/docs/contracts-api/iunirep-sol#config
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
