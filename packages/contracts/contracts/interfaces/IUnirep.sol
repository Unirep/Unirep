// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IncrementalBinaryTree, IncrementalTreeData} from '@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol';
import {PolysumData} from '../libraries/Polysum.sol';

interface IUnirep {
    event AttesterSignedUp(
        uint160 indexed attesterId,
        uint256 epochLength,
        uint256 timestamp
    );

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

    event Attestation(
        uint256 indexed epoch,
        uint256 indexed epochKey,
        uint160 indexed attesterId,
        uint256 fieldIndex,
        uint256 change,
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

    event EpochEnded(uint256 indexed epoch, uint160 indexed attesterId);

    event EpochSealed(uint256 indexed epoch, uint160 indexed attesterId);

    // error
    error UserAlreadySignedUp(uint256 identityCommitment);
    error AttesterAlreadySignUp(uint160 attester);
    error AttesterNotSignUp(uint160 attester);
    error AttesterInvalid();
    error ProofAlreadyUsed(bytes32 nullilier);
    error NullifierAlreadyUsed(uint256 nullilier);
    error AttesterIdNotMatch(uint160 attesterId);
    error OutOfRange();
    error InvalidField();

    error InvalidSignature();
    error InvalidEpochKey();
    error EpochNotMatch();
    error InvalidEpoch(uint256 epoch);
    error MaxAttestations();
    error NoAttestations();
    error DoubleSeal();
    error IncorrectHash();

    error InvalidProof();
    error InvalidStateTreeRoot(uint256 stateTreeRoot);
    error InvalidEpochTreeRoot(uint256 epochTreeRoot);

    error EpochNotSealed();

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

    struct AttesterState {
        // latest epoch key balances
        ///// Needs to be manually set to FIELD_COUNT
        mapping(uint256 => PolysumData) epkPolysum;
        mapping(uint256 => uint256[30]) data;
        mapping(uint256 => uint256[30]) dataHashes;
        // epoch key => polyhash degree
        mapping(uint256 => uint256) epochKeyIndex;
        // epoch key => latest leaf (0 if no attestation in epoch)
        mapping(uint256 => uint256) epochKeyLeaves;
        // the attester polysum
        PolysumData polysum;
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
        mapping(uint256 => AttesterState) state;
    }

    struct Config {
        // circuit config
        uint8 stateTreeDepth;
        uint8 epochTreeDepth;
        uint8 epochTreeArity;
        uint8 fieldCount;
        uint8 sumFieldCount;
        uint8 numEpochKeyNoncePerEpoch;
    }
}
