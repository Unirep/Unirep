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
    /// @dev The verifier is used to verify user signup snark proof
    IVerifier public immutable signupVerifier;
    /// @dev The verifier is used to verify user state transition snark proof
    IVerifier public immutable userStateTransitionVerifier;

    /// @dev The current snark finite field
    uint256 public constant SNARK_SCALAR_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    /// @dev The mapping from attester address to the attester data.
    /// where attester id == address
    mapping(uint160 => AttesterData) attesters;

    /// @dev The mapping of used nullifiers.
    mapping(uint256 => bool) public usedNullifiers;

    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#statetreedepth
    uint8 public immutable stateTreeDepth;
    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#epochtreedepth
    uint8 public immutable epochTreeDepth;
    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#historytreedepth
    uint8 public immutable historyTreeDepth;
    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#fieldcount
    uint8 public immutable fieldCount;
    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#sumfieldcount
    uint8 public immutable sumFieldCount;
    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#numepochkeynonceperepoch
    uint8 public immutable numEpochKeyNoncePerEpoch;
    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#replnoncebits
    uint8 public immutable replNonceBits;
    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#replfieldbits
    uint8 public immutable replFieldBits;
    /// @dev The current chain ID.
    uint48 public immutable chainid;
    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#defaultdatahash
    uint256 public immutable defaultDataHash;
    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#attestationcount
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

        uint256 id;
        assembly {
            id := chainid()
        }
        chainid = uint48(id);

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

    /// @dev Get the corrent circuit config.
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
                replFieldBits: replFieldBits
            });
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#manualusersignup
    /// @param epoch The signup epoch.
    /// @param identityCommitment The identity commitment of the user.
    /// @param leafIdentityHash The identity hash: H(identitySecret, attesterId, epoch, chainid).
    /// @param initialData The initial data when the user signs up.
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
            uint256 data = initialData[x] <<
                (x >= sumFieldCount ? replNonceBits : 0);
            if (x != 0) {
                initialDataHash = PoseidonT3.hash([initialDataHash, data]);
            }
            emit Attestation(
                type(uint48).max,
                identityCommitment,
                uint160(msg.sender),
                x,
                data
            );
        }
        uint256 stateTreeLeaf = PoseidonT3.hash(
            [leafIdentityHash, initialDataHash]
        );
        _userSignUp(epoch, identityCommitment, stateTreeLeaf);
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#usersignup
    /// @param publicSignals The public signals of user signup proof.
    /// @param proof The snark proof of user signup proof.
    function userSignUp(
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) public {
        SignupSignals memory signals = decodeSignupSignals(publicSignals);
        // Verify the proof
        // only allow attester to sign up users
        if (uint160(msg.sender) != signals.attesterId)
            revert AttesterIdNotMatch(uint160(msg.sender));
        if (signals.chainId != chainid) revert ChainIdNotMatch(signals.chainId);
        // Verify the proof
        if (!signupVerifier.verifyProof(publicSignals, proof))
            revert InvalidProof();

        _userSignUp(
            signals.epoch,
            signals.identityCommitment,
            signals.stateTreeLeaf
        );
    }

    /// @dev The internal function which is used in userSignUp and manualUserSignUp
    /// @param epoch The signup epoch.
    /// @param identityCommitment The identity commitment of the user.
    /// @param stateTreeLeaf The new state tree leaf: H(identityHash, H(data)).
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

    /// @dev Allow an attester to signup and specify their epoch length
    /// @param attesterId The EOA address or a contract address of the attester.
    /// @param epochLength The epoch length which the attester specifies.
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

    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#attestersignup
    /// @param epochLength The epoch length which the attester specifies.
    function attesterSignUp(uint48 epochLength) public {
        _attesterSignUp(msg.sender, epochLength);
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#attestersignupviarelayer
    /// @param attester The address of the attester who wants to sign up
    /// @param epochLength The epoch length which the attester specifies
    /// @param signature The signature of the attester
    function attesterSignUpViaRelayer(
        address attester,
        uint48 epochLength,
        bytes calldata signature
    ) public {
        if (!isValidSignature(attester, epochLength, signature))
            revert InvalidSignature();
        _attesterSignUp(attester, epochLength);
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#attest
    /// @param epochKey The receiver's epoch key
    /// @param epoch The attestation should happen in which epoch
    /// @param fieldIndex The field index the data will change
    /// @param change The amount of the data change
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
            change = (change << uint(replNonceBits)) + uint(attestationCount);
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

    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#userstatetransition
    /// @param publicSignals The public signals of user state transition proof.
    /// @param proof The snark proof of user state transition proof.
    function userStateTransition(
        uint256[] calldata publicSignals,
        uint256[8] calldata proof
    ) public {
        // Verify the proof
        if (!userStateTransitionVerifier.verifyProof(publicSignals, proof))
            revert InvalidProof();
        UserStateTransitionSignals
            memory signals = decodeUserStateTransitionSignals(publicSignals);
        if (signals.attesterId >= type(uint160).max) revert AttesterInvalid();
        updateEpochIfNeeded(signals.attesterId);
        AttesterData storage attester = attesters[signals.attesterId];
        // verify that the transition nullifier hasn't been used
        // just use the first outputted EPK as the nullifier
        if (usedNullifiers[signals.epochKeys[0]])
            revert NullifierAlreadyUsed(signals.epochKeys[0]);
        usedNullifiers[signals.epochKeys[0]] = true;

        // verify that we're transition to the current epoch
        if (attester.currentEpoch != signals.toEpoch) revert EpochNotMatch();

        for (uint8 x = 0; x < numEpochKeyNoncePerEpoch; x++) {
            if (
                attester.epkData[signals.epochKeys[x]].epoch <
                signals.toEpoch &&
                attester.epkData[signals.epochKeys[x]].leaf != 0
            ) {
                revert EpochKeyNotProcessed();
            }
        }

        // make sure from state tree root is valid
        if (!attester.historyTreeRoots[signals.historyTreeRoot])
            revert InvalidHistoryTreeRoot(signals.historyTreeRoot);

        // update the current state tree
        emit StateTreeLeaf(
            attester.currentEpoch,
            signals.attesterId,
            attester.stateTree.numberOfLeaves,
            signals.stateTreeLeaf
        );
        emit UserStateTransitioned(
            attester.currentEpoch,
            signals.attesterId,
            attester.stateTree.numberOfLeaves,
            signals.stateTreeLeaf,
            signals.epochKeys[0]
        );
        uint256 root = ReusableMerkleTree.insert(
            attester.stateTree,
            signals.stateTreeLeaf
        );
        attester.stateTreeRoots[attester.currentEpoch][root] = true;
    }

    /// @dev Update the currentEpoch for an attester
    /// if needed https://github.com/ethereum/solidity/issues/13813
    /// @param attesterId The address of the attester
    /// @return epoch The new epoch
    function _updateEpochIfNeeded(
        uint256 attesterId
    ) public returns (uint epoch) {
        if (attesterId >= type(uint160).max) revert AttesterInvalid();
        return updateEpochIfNeeded(uint160(attesterId));
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#updateepochifneeded
    /// @param attesterId The address of the attester
    /// @return epoch The new epoch
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

    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#decodesignupcontrol
    /// @param control The encoded control field
    /// @return attesterId The attester address information in the control
    /// @return epoch The epoch information in the control
    /// @return chainId The chain id information in the control
    function decodeSignupControl(
        uint256 control
    ) public pure returns (uint160 attesterId, uint48 epoch, uint48 chainId) {
        chainId = uint48((control >> (208)) & ((1 << 36) - 1));
        epoch = uint48((control >> 160) & ((1 << 48) - 1));
        attesterId = uint160(control & ((1 << 160) - 1));
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#decodesignupsignals
    /// @param publicSignals The public signals generated by a snark prover.
    /// @return signals The SignupSignals.
    function decodeSignupSignals(
        uint256[] calldata publicSignals
    ) public pure returns (SignupSignals memory) {
        SignupSignals memory signals;
        signals.identityCommitment = publicSignals[0];
        signals.stateTreeLeaf = publicSignals[1];
        // now decode the control values
        (
            signals.attesterId,
            signals.epoch,
            signals.chainId
        ) = decodeSignupControl(publicSignals[2]);
        return signals;
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#decodeuserstatetransitioncontrol
    /// @param control The encoded control field
    /// @return attesterId The attester address information in the control
    /// @return toEpoch The to epoch information in the control
    function decodeUserStateTransitionControl(
        uint256 control
    ) public pure returns (uint160 attesterId, uint48 toEpoch) {
        toEpoch = uint48((control >> 160) & ((1 << 48) - 1));
        attesterId = uint160(control & ((1 << 160) - 1));
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#decodeuserstatetransitionsignals
    /// @param publicSignals The public signals generated by a snark prover.
    /// @return signals The UserStateTransitionSignals.
    function decodeUserStateTransitionSignals(
        uint256[] calldata publicSignals
    ) public view returns (UserStateTransitionSignals memory) {
        UserStateTransitionSignals memory signals;
        signals.historyTreeRoot = publicSignals[0];
        signals.stateTreeLeaf = publicSignals[1];
        signals.epochKeys = new uint[](numEpochKeyNoncePerEpoch);

        for (uint8 i = 0; i < numEpochKeyNoncePerEpoch; i++) {
            signals.epochKeys[i] = publicSignals[2 + i];
        }
        // now decode the control values
        (
            signals.attesterId,
            signals.toEpoch
        ) = decodeUserStateTransitionControl(publicSignals[5]);
        return signals;
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#attesterstarttimestamp
    /// @param attesterId The given attester address
    /// @return timestamp The start time stamp
    function attesterStartTimestamp(
        uint160 attesterId
    ) public view returns (uint256) {
        AttesterData storage attester = attesters[attesterId];
        require(attester.startTimestamp != 0); // indicates the attester is signed up
        return attester.startTimestamp;
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#attestercurrentepoch
    /// @param attesterId The given attester address
    /// @return epoch The current epoch
    function attesterCurrentEpoch(
        uint160 attesterId
    ) public view returns (uint48) {
        uint48 timestamp = attesters[attesterId].startTimestamp;
        uint48 epochLength = attesters[attesterId].epochLength;
        if (timestamp == 0) revert AttesterNotSignUp(attesterId);
        return (uint48(block.timestamp) - timestamp) / epochLength;
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#attesterepochremainingtime
    /// @param attesterId The given attester address
    /// @return time The remaining time to the next epoch
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

    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#attesterepochlength
    /// @param attesterId The given attester address
    /// @return epochLength The epoch length information
    function attesterEpochLength(
        uint160 attesterId
    ) public view returns (uint48) {
        AttesterData storage attester = attesters[attesterId];
        return attester.epochLength;
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#attesterstatetreerootexists
    /// @param attesterId The given attester address
    /// @param epoch The epoch information of the state tree root
    /// @param root The state tree root information
    /// @return exist True if the state tree root exists before
    function attesterStateTreeRootExists(
        uint160 attesterId,
        uint48 epoch,
        uint256 root
    ) public view returns (bool) {
        AttesterData storage attester = attesters[attesterId];
        return attester.stateTreeRoots[epoch][root];
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#attesterstatetreeroot
    /// @param attesterId The given attester address
    /// @return root The current state tree root in current epoch
    function attesterStateTreeRoot(
        uint160 attesterId
    ) public view returns (uint256) {
        AttesterData storage attester = attesters[attesterId];
        return attester.stateTree.root;
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#attesterstatetreeleafcount
    /// @param attesterId The given attester address
    /// @return number The current number of state tree leaves in current epoch
    function attesterStateTreeLeafCount(
        uint160 attesterId
    ) public view returns (uint256) {
        AttesterData storage attester = attesters[attesterId];
        return attester.stateTree.numberOfLeaves;
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#attestersemaphoregrouproot
    /// @param attesterId The given attester address
    /// @return root The current root of semaphore group tree
    function attesterSemaphoreGroupRoot(
        uint160 attesterId
    ) public view returns (uint256) {
        AttesterData storage attester = attesters[attesterId];
        return attester.semaphoreGroup.root;
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#attestermembercount
    /// @param attesterId The given attester address
    /// @return number The number of current members
    function attesterMemberCount(
        uint160 attesterId
    ) public view returns (uint256) {
        AttesterData storage attester = attesters[attesterId];
        return attester.semaphoreGroup.numberOfLeaves;
    }

    /// @dev https://developer.unirep.io/docs/contracts-api/unirep-sol#attesterepochroot
    /// @param attesterId The given attester address
    /// @param epoch The given epoch number
    /// @return root The root of the epoch tree
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
