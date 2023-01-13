// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/utils/Address.sol';

import {VerifySignature} from './libraries/VerifySignature.sol';

import {IUnirep} from './interfaces/IUnirep.sol';
import {IVerifier} from './interfaces/IVerifier.sol';

import {IncrementalBinaryTree, IncrementalTreeData} from '@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol';
import {Poseidon6, Poseidon5, Poseidon4, Poseidon3} from './Hash.sol';
import {Polyhash, PolyhashData} from './libraries/Polyhash.sol';

import 'hardhat/console.sol';

/**
 * @title Unirep
 * @dev Unirep is a reputation which uses ZKP to preserve users' privacy.
 * Attester can give attestations to users, and users can optionally prove that how much reputation they have.
 */
contract Unirep is IUnirep, VerifySignature {
    using SafeMath for uint256;

    // All verifier contracts
    IVerifier public immutable signupVerifier;
    IVerifier public immutable aggregateEpochKeysVerifier;
    IVerifier public immutable userStateTransitionVerifier;
    IVerifier public immutable reputationVerifier;
    IVerifier public immutable epochKeyVerifier;
    IVerifier public immutable epochKeyLiteVerifier;
    IVerifier public immutable buildOrderedTreeVerifier;

    // Circuits configurations and contracts configurations
    Config public config;

    // The max epoch key can be computed by 2 ** config.epochTreeDepth - 1
    uint256 public immutable maxEpochKey;

    // Attester id == address
    mapping(uint160 => AttesterData) attesters;

    // for cheap initialization
    IncrementalTreeData emptyTree;

    // Mapping of used nullifiers
    mapping(uint256 => bool) public usedNullifiers;

    constructor(
        Config memory _config,
        IVerifier _signupVerifier,
        IVerifier _aggregateEpochKeysVerifier,
        IVerifier _userStateTransitionVerifier,
        IVerifier _reputationVerifier,
        IVerifier _epochKeyVerifier,
        IVerifier _epochKeyLiteVerifier,
        IVerifier _buildOrderedTreeVerifier
    ) {
        config = _config;

        // Set the verifier contracts
        signupVerifier = _signupVerifier;
        aggregateEpochKeysVerifier = _aggregateEpochKeysVerifier;
        userStateTransitionVerifier = _userStateTransitionVerifier;
        reputationVerifier = _reputationVerifier;
        epochKeyVerifier = _epochKeyVerifier;
        epochKeyLiteVerifier = _epochKeyLiteVerifier;
        buildOrderedTreeVerifier = _buildOrderedTreeVerifier;

        maxEpochKey = uint256(config.epochTreeArity)**config.epochTreeDepth - 1;

        // for initializing other trees without using poseidon function
        IncrementalBinaryTree.init(emptyTree, config.stateTreeDepth, 0);
    }

    /**
     * @dev User signs up by provding a zk proof outputting identity commitment and new gst leaf.
     * msg.sender must be attester
     */
    function userSignUp(uint256[] memory publicSignals, uint256[8] memory proof)
        public
    {
        uint256 attesterId = publicSignals[2];
        // only allow attester to sign up users
        if (uint256(uint160(msg.sender)) != attesterId)
            revert AttesterIdNotMatch(uint160(msg.sender));
        // Verify the proof
        if (!signupVerifier.verifyProof(publicSignals, proof))
            revert InvalidProof();

        uint256 identityCommitment = publicSignals[0];
        _updateEpochIfNeeded(attesterId);
        AttesterData storage attester = attesters[uint160(attesterId)];
        if (attester.startTimestamp == 0)
            revert AttesterNotSignUp(uint160(attesterId));

        if (attester.identityCommitments[identityCommitment])
            revert UserAlreadySignedUp(identityCommitment);
        attester.identityCommitments[identityCommitment] = true;

        if (attester.currentEpoch != publicSignals[3]) revert EpochNotMatch();

        emit UserSignedUp(
            attester.currentEpoch,
            identityCommitment,
            uint160(attesterId),
            attester.stateTrees[attester.currentEpoch].numberOfLeaves
        );
        emit StateTreeLeaf(
            attester.currentEpoch,
            uint160(attesterId),
            attester.stateTrees[attester.currentEpoch].numberOfLeaves,
            publicSignals[1]
        );
        IncrementalBinaryTree.insert(
            attester.stateTrees[attester.currentEpoch],
            publicSignals[1]
        );
        attester.stateTreeRoots[attester.currentEpoch][
            attester.stateTrees[attester.currentEpoch].root
        ] = true;
        IncrementalBinaryTree.insert(
            attester.semaphoreGroup,
            identityCommitment
        );
    }

    /**
     * @dev Allow an attester to signup and specify their epoch length
     */
    function _attesterSignUp(address attesterId, uint256 epochLength) private {
        AttesterData storage attester = attesters[uint160(attesterId)];
        if (attester.startTimestamp != 0)
            revert AttesterAlreadySignUp(uint160(attesterId));
        attester.startTimestamp = block.timestamp;

        // initialize the first state tree
        for (uint8 i; i < config.stateTreeDepth; i++) {
            attester.stateTrees[0].zeroes[i] = emptyTree.zeroes[i];
        }
        attester.stateTrees[0].root = emptyTree.root;
        attester.stateTrees[0].depth = config.stateTreeDepth;
        attester.stateTreeRoots[0][emptyTree.root] = true;

        // initialize the semaphore group tree
        for (uint8 i; i < config.stateTreeDepth; i++) {
            attester.semaphoreGroup.zeroes[i] = emptyTree.zeroes[i];
        }
        attester.semaphoreGroup.root = emptyTree.root;
        attester.semaphoreGroup.depth = config.stateTreeDepth;

        // set the first epoch tree root
        attester.epochTreeRoots[0] = config.emptyEpochTreeRoot;

        // set the epoch length
        attester.epochLength = epochLength;

        emit AttesterSignedUp(uint160(attesterId), epochLength);
    }

    /**
     * @dev Sign up an attester using the address who sends the transaction
     */
    function attesterSignUp(uint256 epochLength) public {
        _attesterSignUp(msg.sender, epochLength);
    }

    /**
     * @dev Sign up an attester using the claimed address and the signature
     * @param attester The address of the attester who wants to sign up
     * @param signature The signature of the attester
     */
    function attesterSignUpViaRelayer(
        address attester,
        uint256 epochLength,
        bytes calldata signature
    ) public {
        // TODO: verify epoch length in signature
        if (!isValidSignature(attester, signature)) revert InvalidSignature();
        _attesterSignUp(attester, epochLength);
    }

    /**
     * @dev An attester may submit an attestation using a zk proof. The proof should prove an updated epoch tree root
     * and output any new leaves. The attester will be msg.sender
     * @param targetEpoch The epoch in which the attestation was intended. Revert if this is not the current epoch
     */
    function submitAttestation(
        uint256 targetEpoch,
        uint256 epochKey,
        uint256 posRep,
        uint256 negRep,
        uint256 graffiti
    ) public {
        updateEpochIfNeeded(uint160(msg.sender));

        AttesterData storage attester = attesters[uint160(msg.sender)];
        if (attester.currentEpoch != targetEpoch) revert EpochNotMatch();

        if (epochKey >= maxEpochKey) revert InvalidEpochKey();

        uint256 timestamp = block.timestamp;

        emit AttestationSubmitted(
            attester.currentEpoch,
            epochKey,
            uint160(msg.sender),
            posRep,
            negRep,
            graffiti,
            graffiti != 0 ? timestamp : 0
        );
        // emit EpochTreeLeaf(targetEpoch, uint160(msg.sender), epochKey, newLeaf);
        EpochKeyState storage epkState = attester.epochKeyState[targetEpoch];
        Reputation storage balance = epkState.balances[epochKey];
        balance.posRep += posRep;
        balance.negRep += negRep;
        if (graffiti != 0) {
            balance.graffiti = graffiti;
            balance.timestamp = timestamp;
        }
        uint256 newLeaf = Poseidon5.poseidon(
            [
                epochKey,
                balance.posRep,
                balance.negRep,
                balance.graffiti,
                balance.timestamp
            ]
        );

        if (epkState.epochKeyLeaves[epochKey] == 0) {
            // this epoch key has received no attestations
            uint256 degree = Polyhash.add(epkState.polyhash, newLeaf);
            epkState.epochKeyDegree[epochKey] = degree;
            epkState.epochKeyLeaves[epochKey] = newLeaf;
        } else {
            // we need to update the value in the polyhash
            uint256 degree = epkState.epochKeyDegree[epochKey];
            Polyhash.update(
                epkState.polyhash,
                epkState.epochKeyLeaves[epochKey],
                newLeaf,
                degree
            );
            epkState.epochKeyLeaves[epochKey] = newLeaf;
        }
    }

    function sealEpoch(
        uint256 epoch,
        uint160 attesterId,
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) public {
        if (!buildOrderedTreeVerifier.verifyProof(publicSignals, proof))
            revert InvalidProof();
        AttesterData storage attester = attesters[attesterId];
        updateEpochIfNeeded(attesterId);
        if (attester.currentEpoch <= epoch) revert EpochNotMatch();
        // build the epoch tree root
        uint256 root = publicSignals[0];
        uint256 polyhash = publicSignals[1];
        // otherwise the root was already set
        require(attester.epochTreeRoots[epoch] == 0);
        EpochKeyState storage epkState = attester.epochKeyState[epoch];
        // otherwise it's bad data in the proof
        require(polyhash == epkState.polyhash.hash);
        attester.epochTreeRoots[epoch] = root;
        // emit an event sealing the epoch
        emit EpochSealed(epoch, attesterId);
    }

    /**
     * @dev Allow a user to epoch transition for an attester. Accepts a zk proof outputting the new gst leaf
     **/
    function userStateTransition(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) public {
        // Verify the proof
        if (!userStateTransitionVerifier.verifyProof(publicSignals, proof))
            revert InvalidProof();
        if (publicSignals[5] >= type(uint160).max) revert AttesterInvalid();
        uint160 attesterId = uint160(publicSignals[5]);
        updateEpochIfNeeded(attesterId);
        AttesterData storage attester = attesters[attesterId];
        // verify that the transition nullifier hasn't been used
        if (usedNullifiers[publicSignals[2]])
            revert NullifierAlreadyUsed(publicSignals[2]);
        usedNullifiers[publicSignals[2]] = true;

        // verify that we're transition to the current epoch
        if (attester.currentEpoch != publicSignals[4]) revert EpochNotMatch();

        uint256 fromEpoch = publicSignals[3];
        // check for attestation processing
        if (!attesterEpochSealed(attesterId, fromEpoch))
            revert HashchainNotProcessed();
        // make sure from epoch tree root is valid
        if (attester.epochTreeRoots[fromEpoch] != publicSignals[6])
            revert InvalidEpochTreeRoot(publicSignals[6]);

        // make sure from state tree root is valid
        if (!attester.stateTreeRoots[fromEpoch][publicSignals[0]])
            revert InvalidStateTreeRoot(publicSignals[0]);

        // update the current state tree
        emit StateTreeLeaf(
            attester.currentEpoch,
            attesterId,
            attester.stateTrees[attester.currentEpoch].numberOfLeaves,
            publicSignals[1]
        );
        emit UserStateTransitioned(
            attester.currentEpoch,
            attesterId,
            attester.stateTrees[attester.currentEpoch].numberOfLeaves,
            publicSignals[1],
            publicSignals[2]
        );
        IncrementalBinaryTree.insert(
            attester.stateTrees[attester.currentEpoch],
            publicSignals[1]
        );
        attester.stateTreeRoots[attester.currentEpoch][
            attester.stateTrees[attester.currentEpoch].root
        ] = true;
    }

    /**
     * @dev Update the currentEpoch for an attester, if needed
     * https://github.com/ethereum/solidity/issues/13813
     */
    function _updateEpochIfNeeded(uint256 attesterId) public {
        require(attesterId < type(uint160).max);
        updateEpochIfNeeded(uint160(attesterId));
    }

    function updateEpochIfNeeded(uint160 attesterId) public {
        AttesterData storage attester = attesters[attesterId];
        if (attester.startTimestamp == 0) revert AttesterNotSignUp(attesterId);
        uint256 newEpoch = attesterCurrentEpoch(attesterId);
        if (newEpoch == attester.currentEpoch) return;

        // otherwise initialize the new epoch structures

        for (uint8 i; i < config.stateTreeDepth; i++) {
            attester.stateTrees[newEpoch].zeroes[i] = emptyTree.zeroes[i];
        }
        attester.stateTrees[newEpoch].root = emptyTree.root;
        attester.stateTrees[newEpoch].depth = config.stateTreeDepth;
        attester.stateTreeRoots[newEpoch][emptyTree.root] = true;

        attester.epochTreeRoots[newEpoch] = config.emptyEpochTreeRoot;

        emit EpochEnded(newEpoch - 1, attesterId);

        attester.currentEpoch = newEpoch;
    }

    function decodeEpochKeySignals(uint256[] memory publicSignals)
        public
        pure
        returns (EpochKeySignals memory)
    {
        EpochKeySignals memory signals;
        signals.epochKey = publicSignals[0];
        signals.stateTreeRoot = publicSignals[1];
        signals.data = publicSignals[3];
        // now decode the control values
        signals.revealNonce = (publicSignals[2] >> 232) & 1;
        signals.attesterId = (publicSignals[2] >> 72) & ((1 << 160) - 1);
        signals.epoch = (publicSignals[2] >> 8) & ((1 << 64) - 1);
        signals.nonce = publicSignals[2] & ((1 << 8) - 1);
        return signals;
    }

    function verifyEpochKeyProof(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) public {
        EpochKeySignals memory signals = decodeEpochKeySignals(publicSignals);
        bool valid = epochKeyVerifier.verifyProof(publicSignals, proof);
        // short circuit if the proof is invalid
        if (!valid) revert InvalidProof();
        if (signals.epochKey >= maxEpochKey) revert InvalidEpochKey();
        _updateEpochIfNeeded(signals.attesterId);
        AttesterData storage attester = attesters[uint160(signals.attesterId)];
        // epoch check
        if (signals.epoch > attester.currentEpoch)
            revert InvalidEpoch(signals.epoch);
        // state tree root check
        if (!attester.stateTreeRoots[signals.epoch][signals.stateTreeRoot])
            revert InvalidStateTreeRoot(signals.stateTreeRoot);
    }

    function decodeEpochKeyLiteSignals(uint256[] memory publicSignals)
        public
        pure
        returns (EpochKeySignals memory)
    {
        EpochKeySignals memory signals;
        signals.epochKey = publicSignals[1];
        signals.data = publicSignals[2];
        // now decode the control values
        signals.revealNonce = (publicSignals[0] >> 232) & 1;
        signals.attesterId = (publicSignals[0] >> 72) & ((1 << 160) - 1);
        signals.epoch = (publicSignals[0] >> 8) & ((1 << 64) - 1);
        signals.nonce = publicSignals[0] & ((1 << 8) - 1);
        return signals;
    }

    function verifyEpochKeyLiteProof(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) public {
        EpochKeySignals memory signals = decodeEpochKeyLiteSignals(
            publicSignals
        );
        bool valid = epochKeyLiteVerifier.verifyProof(publicSignals, proof);
        // short circuit if the proof is invalid
        if (!valid) revert InvalidProof();
        if (signals.epochKey >= maxEpochKey) revert InvalidEpochKey();
        _updateEpochIfNeeded(signals.attesterId);
        AttesterData storage attester = attesters[uint160(signals.attesterId)];
        // epoch check
        if (signals.epoch > attester.currentEpoch)
            revert InvalidEpoch(signals.epoch);
    }

    function decodeReputationSignals(uint256[] memory publicSignals)
        public
        pure
        returns (ReputationSignals memory)
    {
        ReputationSignals memory signals;
        signals.epochKey = publicSignals[0];
        signals.stateTreeRoot = publicSignals[1];
        signals.graffitiPreImage = publicSignals[4];
        // now decode the control values
        signals.revealNonce = (publicSignals[2] >> 233) & 1;
        signals.proveGraffiti = (publicSignals[2] >> 232) & 1;
        signals.attesterId = (publicSignals[2] >> 72) & ((1 << 160) - 1);
        signals.epoch = (publicSignals[2] >> 8) & ((1 << 64) - 1);
        signals.nonce = publicSignals[2] & ((1 << 8) - 1);
        signals.proveZeroRep = (publicSignals[3] >> 130) & 1;
        signals.proveMaxRep = (publicSignals[3] >> 129) & 1;
        signals.proveMinRep = (publicSignals[3] >> 128) & 1;
        signals.maxRep = (publicSignals[3] >> 64) & ((1 << 64) - 1);
        signals.minRep = publicSignals[3] & ((1 << 64) - 1);
        return signals;
    }

    function verifyReputationProof(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) public {
        bool valid = reputationVerifier.verifyProof(publicSignals, proof);
        if (!valid) revert InvalidProof();
        ReputationSignals memory signals = decodeReputationSignals(
            publicSignals
        );
        if (signals.epochKey >= maxEpochKey) revert InvalidEpochKey();
        if (signals.attesterId >= type(uint160).max) revert AttesterInvalid();
        _updateEpochIfNeeded(signals.attesterId);
        AttesterData storage attester = attesters[uint160(signals.attesterId)];
        // epoch check
        if (signals.epoch > attester.currentEpoch)
            revert InvalidEpoch(signals.epoch);
        // state tree root check
        if (!attester.stateTreeRoots[signals.epoch][signals.stateTreeRoot])
            revert InvalidStateTreeRoot(signals.stateTreeRoot);
    }

    function attesterStartTimestamp(uint160 attesterId)
        public
        view
        returns (uint256)
    {
        AttesterData storage attester = attesters[attesterId];
        require(attester.startTimestamp != 0); // indicates the attester is signed up
        return attester.startTimestamp;
    }

    function attesterCurrentEpoch(uint160 attesterId)
        public
        view
        returns (uint256)
    {
        AttesterData storage attester = attesters[attesterId];
        require(attester.startTimestamp != 0); // indicates the attester is signed up
        return
            (block.timestamp - attester.startTimestamp) / attester.epochLength;
    }

    function attesterEpochRemainingTime(uint160 attesterId)
        public
        view
        returns (uint256)
    {
        AttesterData storage attester = attesters[attesterId];
        require(attester.startTimestamp != 0); // indicates the attester is signed up
        uint256 _currentEpoch = (block.timestamp - attester.startTimestamp) /
            attester.epochLength;
        return
            (attester.startTimestamp +
                (_currentEpoch + 1) *
                attester.epochLength) - block.timestamp;
    }

    function attesterEpochLength(uint160 attesterId)
        public
        view
        returns (uint256)
    {
        AttesterData storage attester = attesters[attesterId];
        return attester.epochLength;
    }

    function attesterEpochSealed(uint160 attesterId, uint256 epoch)
        public
        view
        returns (bool)
    {
        uint256 currentEpoch = attesterCurrentEpoch(attesterId);
        AttesterData storage attester = attesters[attesterId];
        if (currentEpoch <= epoch) return false;
        // either the attestations were processed, or no
        // attestations were received
        return
            (attester.epochTreeRoots[epoch] != config.emptyEpochTreeRoot &&
                attester.epochTreeRoots[epoch] != 0) ||
            attester.epochKeyState[epoch].polyhash.hash == 0;
    }

    function attesterStateTreeRootExists(
        uint160 attesterId,
        uint256 epoch,
        uint256 root
    ) public view returns (bool) {
        AttesterData storage attester = attesters[attesterId];
        return attester.stateTreeRoots[epoch][root];
    }

    function attesterStateTreeRoot(uint160 attesterId, uint256 epoch)
        public
        view
        returns (uint256)
    {
        AttesterData storage attester = attesters[attesterId];
        return attester.stateTrees[epoch].root;
    }

    function attesterStateTreeLeafCount(uint160 attesterId, uint256 epoch)
        public
        view
        returns (uint256)
    {
        AttesterData storage attester = attesters[attesterId];
        return attester.stateTrees[epoch].numberOfLeaves;
    }

    function attesterSemaphoreGroupRoot(uint160 attesterId)
        public
        view
        returns (uint256)
    {
        AttesterData storage attester = attesters[attesterId];
        return attester.semaphoreGroup.root;
    }

    function attesterMemberCount(uint160 attesterId)
        public
        view
        returns (uint256)
    {
        AttesterData storage attester = attesters[attesterId];
        return attester.semaphoreGroup.numberOfLeaves;
    }

    function attesterEpochRoot(uint160 attesterId, uint256 epoch)
        public
        view
        returns (uint256)
    {
        AttesterData storage attester = attesters[attesterId];
        return attester.epochTreeRoots[epoch];
    }

    function stateTreeDepth() public view returns (uint8) {
        return config.stateTreeDepth;
    }

    function epochTreeDepth() public view returns (uint8) {
        return config.epochTreeDepth;
    }

    function epochTreeArity() public view returns (uint8) {
        return config.epochTreeArity;
    }

    function numEpochKeyNoncePerEpoch() public view returns (uint256) {
        return config.numEpochKeyNoncePerEpoch;
    }
}
