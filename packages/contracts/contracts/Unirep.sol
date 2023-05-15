// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {VerifySignature} from './libraries/VerifySignature.sol';

import {IUnirep} from './interfaces/IUnirep.sol';
import {IVerifier} from './interfaces/IVerifier.sol';

import {IncrementalBinaryTree, IncrementalTreeData} from '@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol';
import {ReusableMerkleTree, ReusableTreeData} from './libraries/ReusableMerkleTree.sol';
import {LazyMerkleTree, LazyTreeData} from './libraries/LazyMerkleTree.sol';

import 'poseidon-solidity/PoseidonT3.sol';

/**
 * @title Unirep
 * @dev Unirep is a reputation which uses ZKP to preserve users' privacy.
 * Attester can give attestations to users, and users can optionally prove that how much reputation they have.
 */
contract Unirep is IUnirep, VerifySignature {
    // All verifier contracts
    IVerifier public immutable signupVerifier;
    IVerifier public immutable userStateTransitionVerifier;

    uint256 public constant SNARK_SCALAR_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    // Attester id == address
    mapping(uint160 => AttesterData) attesters;

    // Mapping of used nullifiers
    mapping(uint256 => bool) public usedNullifiers;

    uint8 public immutable stateTreeDepth;
    uint8 public immutable epochTreeDepth;
    uint8 public immutable historyTreeDepth;
    uint8 public immutable fieldCount;
    uint8 public immutable sumFieldCount;
    uint8 public immutable numEpochKeyNoncePerEpoch;
    uint8 public immutable replNonceBits;
    uint8 public immutable replFieldBits;
    uint256 public immutable defaultDataHash;

    uint48 public attestationCount = 1;

    constructor(
        Config memory _config,
        IVerifier _signupVerifier,
        IVerifier _userStateTransitionVerifier
    ) {
        // see IUnirep.sol EpochKeyData.data
        require(_config.fieldCount < 128, 'datasize');
        stateTreeDepth = _config.stateTreeDepth;
        epochTreeDepth = _config.epochTreeDepth;
        historyTreeDepth = _config.historyTreeDepth;
        fieldCount = _config.fieldCount;
        sumFieldCount = _config.sumFieldCount;
        numEpochKeyNoncePerEpoch = _config.numEpochKeyNoncePerEpoch;
        replNonceBits = _config.replNonceBits;
        replFieldBits = _config.replFieldBits;

        // Set the verifier contracts
        signupVerifier = _signupVerifier;
        userStateTransitionVerifier = _userStateTransitionVerifier;

        emit AttesterSignedUp(0, type(uint48).max, uint48(block.timestamp));
        attesters[uint160(0)].epochLength = type(uint48).max;
        attesters[uint160(0)].startTimestamp = uint48(block.timestamp);

        uint256 zeroDataHash = 0;
        for (uint256 i = 1; i < fieldCount; i++) {
            zeroDataHash = PoseidonT3.hash([zeroDataHash, 0]);
        }
        defaultDataHash = zeroDataHash;
    }

    function config() public view returns (Config memory) {
        return
            Config({
                stateTreeDepth: stateTreeDepth,
                epochTreeDepth: epochTreeDepth,
                historyTreeDepth: historyTreeDepth,
                fieldCount: fieldCount,
                sumFieldCount: sumFieldCount,
                numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
                replNonceBits: replNonceBits,
                replFieldBits: replNonceBits
            });
    }

    /**
     * Use this if your application has custom signup proof logic.
     * e.g. to insert a non-zero data field in the state tree leaf
     **/
    function manualUserSignUp(
        uint48 epoch,
        uint256 identityCommitment,
        uint256 leafIdentityHash,
        uint256[] calldata initialData
    ) public {
        if (initialData.length > fieldCount) revert OutOfRange();
        uint256 initialDataHash = defaultDataHash;
        if (initialData.length != 0) {
            initialDataHash = initialData[0];
        }
        for (uint8 x = 0; x < initialData.length; x++) {
            if (initialData[x] >= SNARK_SCALAR_FIELD) revert InvalidField();
            if (x >= sumFieldCount && initialData[x] >= 2 ** replFieldBits)
                revert OutOfRange();
            if (x != 0) {
                initialDataHash = PoseidonT3.hash(
                    [initialDataHash, initialData[x]]
                );
            }
            emit Attestation(
                type(uint48).max,
                identityCommitment,
                uint160(msg.sender),
                x,
                initialData[x]
            );
        }
        uint256 stateTreeLeaf = PoseidonT3.hash(
            [leafIdentityHash, initialDataHash]
        );
        _userSignUp(epoch, identityCommitment, stateTreeLeaf);
    }

    /**
     * @dev User signs up by provding a zk proof outputting identity commitment and new gst leaf.
     * msg.sender must be attester
     */
    function userSignUp(
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) public {
        SignupSignals memory signals = decodeSignupSignals(publicSignals);
        // Verify the proof
        // only allow attester to sign up users
        if (uint160(msg.sender) != signals.attesterId)
            revert AttesterIdNotMatch(uint160(msg.sender));
        // Verify the proof
        if (!signupVerifier.verifyProof(publicSignals, proof))
            revert InvalidProof();

        _userSignUp(signals.epoch, signals.idCommitment, signals.stateTreeLeaf);
    }

    function _userSignUp(
        uint48 epoch,
        uint256 identityCommitment,
        uint256 stateTreeLeaf
    ) internal {
        uint160 attesterId = uint160(msg.sender);
        _updateEpochIfNeeded(attesterId);
        AttesterData storage attester = attesters[attesterId];
        if (attester.startTimestamp == 0) revert AttesterNotSignUp(attesterId);

        if (attester.identityCommitments[identityCommitment])
            revert UserAlreadySignedUp(identityCommitment);
        attester.identityCommitments[identityCommitment] = true;

        uint48 currentEpoch = attester.currentEpoch;
        if (currentEpoch != epoch) revert EpochNotMatch();

        emit UserSignedUp(
            currentEpoch,
            identityCommitment,
            attesterId,
            attester.stateTree.numberOfLeaves
        );
        emit StateTreeLeaf(
            attester.currentEpoch,
            attesterId,
            attester.stateTree.numberOfLeaves,
            stateTreeLeaf
        );
        uint256 root = ReusableMerkleTree.insert(
            attester.stateTree,
            stateTreeLeaf
        );
        attester.stateTreeRoots[currentEpoch][root] = true;
        IncrementalBinaryTree.insert(
            attester.semaphoreGroup,
            identityCommitment
        );
    }

    /**
     * @dev Allow an attester to signup and specify their epoch length
     */
    function _attesterSignUp(address attesterId, uint48 epochLength) private {
        AttesterData storage attester = attesters[uint160(attesterId)];
        if (attester.startTimestamp != 0)
            revert AttesterAlreadySignUp(uint160(attesterId));
        attester.startTimestamp = uint48(block.timestamp);

        // initialize the state tree
        ReusableMerkleTree.init(attester.stateTree, stateTreeDepth);

        // initialize the epoch tree
        LazyMerkleTree.init(attester.epochTree, epochTreeDepth);

        // initialize the semaphore group tree
        IncrementalBinaryTree.initWithDefaultZeroes(
            attester.semaphoreGroup,
            stateTreeDepth // TODO: increase this
        );

        // initialize history tree
        IncrementalBinaryTree.initWithDefaultZeroes(
            attester.historyTree,
            historyTreeDepth
        );

        // set the epoch length
        attester.epochLength = epochLength;

        emit AttesterSignedUp(
            uint160(attesterId),
            epochLength,
            attester.startTimestamp
        );
    }

    /**
     * @dev Sign up an attester using the address who sends the transaction
     */
    function attesterSignUp(uint48 epochLength) public {
        _attesterSignUp(msg.sender, epochLength);
    }

    /**
     * @dev Sign up an attester using the claimed address and the signature
     * @param attester The address of the attester who wants to sign up
     * @param signature The signature of the attester
     */
    function attesterSignUpViaRelayer(
        address attester,
        uint48 epochLength,
        bytes calldata signature
    ) public {
        // TODO: verify epoch length in signature
        if (!isValidSignature(attester, epochLength, signature))
            revert InvalidSignature();
        _attesterSignUp(attester, epochLength);
    }

    /**
     * @dev Attest to a change in data for a user that controls `epochKey`
     */
    function attest(
        uint256 epochKey,
        uint48 epoch,
        uint fieldIndex,
        uint change
    ) public {
        uint48 currentEpoch = updateEpochIfNeeded(uint160(msg.sender));
        if (epoch != currentEpoch) revert EpochNotMatch();

        if (epochKey >= SNARK_SCALAR_FIELD) revert InvalidEpochKey();

        if (fieldIndex >= fieldCount) revert InvalidField();

        EpochKeyData storage epkData = attesters[uint160(msg.sender)].epkData[
            epochKey
        ];

        uint256 epkEpoch = epkData.epoch;
        if (epkEpoch != 0 && epkEpoch != currentEpoch) {
            revert InvalidEpoch(epkEpoch);
        }
        // only allow an epoch key to be used in a single epoch
        // this is to prevent frontrunning DOS in UST
        // e.g. insert a tx attesting to the epk revealed by the UST
        // then the UST can never succeed
        if (epkEpoch != currentEpoch) {
            epkData.epoch = currentEpoch;
        }

        if (fieldIndex < sumFieldCount) {
            uint256 oldVal = epkData.data[fieldIndex];
            uint256 newVal = addmod(oldVal, change, SNARK_SCALAR_FIELD);
            epkData.data[fieldIndex] = newVal;
        } else {
            if (change >= 2 ** replFieldBits) {
                revert OutOfRange();
            }
            change += uint(attestationCount) << replFieldBits;
            epkData.data[fieldIndex] = change;
        }
        emit Attestation(
            epoch,
            epochKey,
            uint160(msg.sender),
            fieldIndex,
            change
        );
        attestationCount++;

        // now construct the leaf
        // TODO: only rebuild the hashchain as needed
        // e.g. if data[4] if attested to, don't hash 0,1,2,3

        uint256 leaf = epochKey;
        for (uint8 x = 0; x < fieldCount; x++) {
            leaf = PoseidonT3.hash([leaf, epkData.data[x]]);
        }
        bool newLeaf = epkData.leaf == 0;
        epkData.leaf = leaf;

        LazyTreeData storage epochTree = attesters[uint160(msg.sender)]
            .epochTree;
        if (newLeaf) {
            epkData.leafIndex = epochTree.numberOfLeaves;
            LazyMerkleTree.insert(epochTree, leaf);
        } else {
            LazyMerkleTree.update(epochTree, leaf, epkData.leafIndex);
        }

        emit EpochTreeLeaf(epoch, uint160(msg.sender), epkData.leafIndex, leaf);
    }

    /**
     * @dev Allow a user to epoch transition for an attester. Accepts a zk proof outputting the new gst leaf
     **/
    function userStateTransition(
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) public {
        // Verify the proof
        if (!userStateTransitionVerifier.verifyProof(publicSignals, proof))
            revert InvalidProof();
        uint256 attesterSignalIndex = 3 + numEpochKeyNoncePerEpoch;
        uint256 toEpochIndex = 2 + numEpochKeyNoncePerEpoch;
        if (publicSignals[attesterSignalIndex] >= type(uint160).max)
            revert AttesterInvalid();
        uint160 attesterId = uint160(publicSignals[attesterSignalIndex]);
        updateEpochIfNeeded(attesterId);
        AttesterData storage attester = attesters[attesterId];
        // verify that the transition nullifier hasn't been used
        // just use the first outputted EPK as the nullifier
        if (usedNullifiers[publicSignals[2]])
            revert NullifierAlreadyUsed(publicSignals[2]);
        usedNullifiers[publicSignals[2]] = true;

        uint256 toEpoch = publicSignals[toEpochIndex];

        // verify that we're transition to the current epoch
        if (attester.currentEpoch != toEpoch) revert EpochNotMatch();

        for (uint8 x = 0; x < numEpochKeyNoncePerEpoch; x++) {
            if (
                attester.epkData[publicSignals[2 + x]].epoch < toEpoch &&
                attester.epkData[publicSignals[2 + x]].leaf != 0
            ) {
                revert EpochKeyNotProcessed();
            }
        }

        // make sure from state tree root is valid
        if (!attester.historyTreeRoots[publicSignals[0]])
            revert InvalidHistoryTreeRoot(publicSignals[0]);

        // update the current state tree
        emit StateTreeLeaf(
            attester.currentEpoch,
            attesterId,
            attester.stateTree.numberOfLeaves,
            publicSignals[1]
        );
        emit UserStateTransitioned(
            attester.currentEpoch,
            attesterId,
            attester.stateTree.numberOfLeaves,
            publicSignals[1],
            publicSignals[2]
        );
        uint256 root = ReusableMerkleTree.insert(
            attester.stateTree,
            publicSignals[1]
        );
        attester.stateTreeRoots[attester.currentEpoch][root] = true;
    }

    /**
     * @dev Update the currentEpoch for an attester, if needed
     * https://github.com/ethereum/solidity/issues/13813
     */
    function _updateEpochIfNeeded(
        uint256 attesterId
    ) public returns (uint epoch) {
        if (attesterId >= type(uint160).max) revert AttesterInvalid();
        return updateEpochIfNeeded(uint160(attesterId));
    }

    function updateEpochIfNeeded(
        uint160 attesterId
    ) public returns (uint48 epoch) {
        AttesterData storage attester = attesters[attesterId];
        epoch = attesterCurrentEpoch(attesterId);
        uint48 fromEpoch = attester.currentEpoch;
        if (epoch == fromEpoch) return epoch;

        // otherwise reset the trees for the new epoch

        if (attester.stateTree.numberOfLeaves > 0) {
            uint256 epochTreeRoot = LazyMerkleTree.root(
                attester.epochTree,
                epochTreeDepth
            );
            uint256 historyTreeLeaf = PoseidonT3.hash(
                [attester.stateTree.root, epochTreeRoot]
            );
            uint256 root = IncrementalBinaryTree.insert(
                attester.historyTree,
                historyTreeLeaf
            );
            attester.historyTreeRoots[root] = true;

            ReusableMerkleTree.reset(attester.stateTree);

            attester.epochTreeRoots[fromEpoch] = epochTreeRoot;

            emit HistoryTreeLeaf(attesterId, historyTreeLeaf);
        }

        LazyMerkleTree.reset(attester.epochTree);

        emit EpochEnded(epoch - 1, attesterId);

        attester.currentEpoch = epoch;
    }

    function decodeSignupControl(
        uint256 control
    ) public pure returns (uint160 attesterId, uint48 epoch) {
        epoch = uint48((control >> 160) & ((1 << 48) - 1));
        attesterId = uint160(control & ((1 << 160) - 1));
        return (attesterId, epoch);
    }

    function decodeSignupSignals(
        uint256[] calldata publicSignals
    ) public pure returns (SignupSignals memory) {
        SignupSignals memory signals;
        signals.idCommitment = publicSignals[0];
        signals.stateTreeLeaf = publicSignals[1];
        // now decode the control values
        (signals.attesterId, signals.epoch) = decodeSignupControl(
            publicSignals[2]
        );
        return signals;
    }

    function attesterStartTimestamp(
        uint160 attesterId
    ) public view returns (uint256) {
        AttesterData storage attester = attesters[attesterId];
        require(attester.startTimestamp != 0); // indicates the attester is signed up
        return attester.startTimestamp;
    }

    function attesterCurrentEpoch(
        uint160 attesterId
    ) public view returns (uint48) {
        uint48 timestamp = attesters[attesterId].startTimestamp;
        uint48 epochLength = attesters[attesterId].epochLength;
        if (timestamp == 0) revert AttesterNotSignUp(attesterId);
        return (uint48(block.timestamp) - timestamp) / epochLength;
    }

    function attesterEpochRemainingTime(
        uint160 attesterId
    ) public view returns (uint48) {
        uint48 timestamp = attesters[attesterId].startTimestamp;
        uint48 epochLength = attesters[attesterId].epochLength;
        if (timestamp == 0) revert AttesterNotSignUp(attesterId);
        uint48 blockTimestamp = uint48(block.timestamp);
        uint48 _currentEpoch = (blockTimestamp - timestamp) / epochLength;
        return timestamp + (_currentEpoch + 1) * epochLength - blockTimestamp;
    }

    function attesterEpochLength(
        uint160 attesterId
    ) public view returns (uint48) {
        AttesterData storage attester = attesters[attesterId];
        return attester.epochLength;
    }

    function attesterStateTreeRootExists(
        uint160 attesterId,
        uint48 epoch,
        uint256 root
    ) public view returns (bool) {
        AttesterData storage attester = attesters[attesterId];
        return attester.stateTreeRoots[epoch][root];
    }

    function attesterStateTreeRoot(
        uint160 attesterId
    ) public view returns (uint256) {
        AttesterData storage attester = attesters[attesterId];
        return attester.stateTree.root;
    }

    function attesterStateTreeLeafCount(
        uint160 attesterId
    ) public view returns (uint256) {
        AttesterData storage attester = attesters[attesterId];
        return attester.stateTree.numberOfLeaves;
    }

    function attesterSemaphoreGroupRoot(
        uint160 attesterId
    ) public view returns (uint256) {
        AttesterData storage attester = attesters[attesterId];
        return attester.semaphoreGroup.root;
    }

    function attesterMemberCount(
        uint160 attesterId
    ) public view returns (uint256) {
        AttesterData storage attester = attesters[attesterId];
        return attester.semaphoreGroup.numberOfLeaves;
    }

    function attesterEpochRoot(
        uint160 attesterId,
        uint48 epoch
    ) public view returns (uint256) {
        AttesterData storage attester = attesters[attesterId];
        if (epoch == attesterCurrentEpoch(attesterId)) {
            return LazyMerkleTree.root(attester.epochTree, epochTreeDepth);
        }
        return attester.epochTreeRoots[epoch];
    }
}
