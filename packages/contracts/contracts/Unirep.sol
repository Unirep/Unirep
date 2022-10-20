// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/utils/Address.sol';

import {VerifySignature} from './libraries/VerifySignature.sol';

import {IUnirep} from './interfaces/IUnirep.sol';
import {IVerifier} from './interfaces/IVerifier.sol';

import {IncrementalBinaryTree, IncrementalTreeData} from '@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol';
import {Poseidon4, Poseidon2} from './Hash.sol';

/**
 * @title Unirep
 * @dev Unirep is a reputation which uses ZKP to preserve users' privacy.
 * Attester can give attestations to users, and users can optionally prove that how much reputation they have.
 */
contract Unirep is IUnirep, VerifySignature {
    using SafeMath for uint256;

    // All verifier contracts
    IVerifier internal signupVerifier;
    IVerifier internal aggregateEpochKeysVerifier;
    IVerifier internal userStateTransitionVerifier;
    IVerifier internal reputationVerifier;

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
        IVerifier _reputationVerifier
    ) {
        config = _config;

        // Set the verifier contracts
        signupVerifier = _signupVerifier;
        aggregateEpochKeysVerifier = _aggregateEpochKeysVerifier;
        userStateTransitionVerifier = _userStateTransitionVerifier;
        reputationVerifier = _reputationVerifier;

        maxEpochKey = uint256(2)**config.epochTreeDepth - 1;

        // for initializing other trees without using poseidon function
        IncrementalBinaryTree.init(emptyTree, config.globalStateTreeDepth, 0);
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
        if (!signupVerifier.verifyProof(proof, publicSignals))
            revert InvalidProof();

        uint256 identityCommitment = publicSignals[0];
        updateEpochIfNeeded(attesterId);
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
        emit NewGSTLeaf(
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
        for (uint8 i; i < config.globalStateTreeDepth; i++) {
            attester.stateTrees[0].zeroes[i] = emptyTree.zeroes[i];
        }
        attester.stateTrees[0].root = emptyTree.root;
        attester.stateTrees[0].depth = config.globalStateTreeDepth;
        attester.stateTreeRoots[0][emptyTree.root] = true;

        // initialize the semaphore group tree
        for (uint8 i; i < config.globalStateTreeDepth; i++) {
            attester.semaphoreGroup.zeroes[i] = emptyTree.zeroes[i];
        }
        attester.semaphoreGroup.root = emptyTree.root;
        attester.semaphoreGroup.depth = config.globalStateTreeDepth;

        // set the first epoch tree root
        attester.epochTreeRoots[0] = config.emptyEpochTreeRoot;

        // set the epoch length
        attester.epochLength = epochLength;
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
        uint256 negRep
    ) public {
        updateEpochIfNeeded(uint160(msg.sender));

        AttesterData storage attester = attesters[uint160(msg.sender)];
        if (attester.currentEpoch != targetEpoch) revert EpochNotMatch();

        if (epochKey >= maxEpochKey) revert InvalidEpochKey();

        emit AttestationSubmitted(
            attester.currentEpoch,
            epochKey,
            uint160(msg.sender),
            posRep,
            negRep
        );
        // emit EpochTreeLeaf(targetEpoch, uint160(msg.sender), epochKey, newLeaf);
        uint256[2] storage balance = attester
            .epochKeyState[targetEpoch]
            .balances[epochKey];
        if (!attester.epochKeyState[targetEpoch].isKeyOwed[epochKey]) {
            attester.epochKeyState[targetEpoch].owedKeys.push(epochKey);
        }
        balance[0] += posRep;
        balance[1] += negRep;
    }

    function buildHashchain(uint160 attesterId, uint256 epoch) public {
        AttesterData storage attester = attesters[attesterId];
        require(attester.epochKeyState[epoch].owedKeys.length > 0);
        // target some specific length
        uint256 index = attester.epochKeyState[epoch].totalHashchains;
        EpochKeyHashchain storage hashchain = attester
            .epochKeyState[epoch]
            .hashchain[index];
        hashchain.index = index;
        attester.epochKeyState[epoch].totalHashchains++;
        for (uint8 x = 0; x < config.aggregateKeyCount; x++) {
            uint256[] storage owedKeys = attester.epochKeyState[epoch].owedKeys;
            if (owedKeys.length == 0) break;
            uint256 epochKey = owedKeys[owedKeys.length - 1];
            owedKeys.pop();
            attester.epochKeyState[epoch].isKeyOwed[epochKey] = false;
            uint256[2] memory balance = attester.epochKeyState[epoch].balances[
                epochKey
            ];
            hashchain.head = Poseidon4.poseidon(
                [hashchain.head, epochKey, balance[0], balance[1]]
            );
            hashchain.epochKeys.push(epochKey);
            hashchain.epochKeyBalances.push(balance);
        }
    }

    function processHashchain(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) public {
        if (!aggregateEpochKeysVerifier.verifyProof(proof, publicSignals))
            revert InvalidProof();
        uint256 epoch = publicSignals[3];
        uint256 attesterId = publicSignals[4];
        AttesterData storage attester = attesters[uint160(attesterId)];
        uint256 hashchainHead = publicSignals[1];
        EpochKeyHashchain storage hashchain = attester
            .epochKeyState[epoch]
            .hashchain[publicSignals[5]];
        require(hashchain.head != 0 && !hashchain.processed);
        require(hashchainHead == hashchain.head);
        // Verify the zk proof
        for (uint8 x = 0; x < hashchain.epochKeys.length; x++) {
            // emit the new leaves from the hashchain
            uint256 epochKey = hashchain.epochKeys[x];
            emit EpochTreeLeaf(
                epoch,
                uint160(attesterId),
                epochKey,
                Poseidon2.poseidon(hashchain.epochKeyBalances[x])
            );
        }
        hashchain.processed = true;
        attester.epochKeyState[epoch].processedHashchains++;
        attester.epochTreeRoots[epoch] = publicSignals[0];
    }

    /**
     * @dev Allow a user to epoch transition for an attester. Accepts a zk proof outputting the new gst leaf
     **/
    function userStateTransition(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) public {
        // Verify the proof
        if (!userStateTransitionVerifier.verifyProof(proof, publicSignals))
            revert InvalidProof();

        require(publicSignals[5] < type(uint160).max);
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
        require(
            attester.epochKeyState[fromEpoch].owedKeys.length == 0 &&
                attester.epochKeyState[fromEpoch].totalHashchains ==
                attester.epochKeyState[fromEpoch].processedHashchains
        );
        // make sure from epoch tree root is valid
        if (attester.epochTreeRoots[fromEpoch] != publicSignals[6])
            revert InvalidEpochTreeRoot(publicSignals[6]);

        // make sure from state tree root is valid
        if (!attester.stateTreeRoots[fromEpoch][publicSignals[0]])
            revert InvalidStateTreeRoot(publicSignals[0]);

        // update the current state tree
        emit NewGSTLeaf(
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
     */
    function updateEpochIfNeeded(uint256 attesterId) public {
        require(attesterId < type(uint160).max);
        AttesterData storage attester = attesters[uint160(attesterId)];
        if (attester.startTimestamp == 0)
            revert AttesterNotSignUp(uint160(attesterId));
        uint256 newEpoch = attesterCurrentEpoch(uint160(attesterId));
        if (newEpoch == attester.currentEpoch) return;

        // otherwise initialize the new epoch structures

        for (uint8 i; i < config.globalStateTreeDepth; i++) {
            attester.stateTrees[newEpoch].zeroes[i] = emptyTree.zeroes[i];
        }
        attester.stateTrees[newEpoch].root = emptyTree.root;
        attester.stateTrees[newEpoch].depth = config.globalStateTreeDepth;
        attester.stateTreeRoots[newEpoch][emptyTree.root] = true;

        attester.epochTreeRoots[newEpoch] = config.emptyEpochTreeRoot;

        emit EpochEnded(attester.currentEpoch, uint160(attesterId));

        attester.currentEpoch = newEpoch;
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

    function attesterHashchainTotalCount(uint160 attesterId, uint256 epoch)
        public
        view
        returns (uint256)
    {
        return attesters[attesterId].epochKeyState[epoch].totalHashchains;
    }

    function attesterHashchainProcessedCount(uint160 attesterId, uint256 epoch)
        public
        view
        returns (uint256)
    {
        return attesters[attesterId].epochKeyState[epoch].processedHashchains;
    }

    function attesterHashchain(uint160 attesterId, uint256 epoch, uint256 index)
        public
        view
        returns (EpochKeyHashchain memory)
    {
        return attesters[attesterId].epochKeyState[epoch].hashchain[index];
    }

    function attesterEpochLength(uint160 attesterId)
        public
        view
        returns (uint256)
    {
        AttesterData storage attester = attesters[attesterId];
        return attester.epochLength;
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

    function attesterEpochRoot(uint160 attesterId, uint256 epoch)
        public
        view
        returns (uint256)
    {
        AttesterData storage attester = attesters[attesterId];
        return attester.epochTreeRoots[epoch];
    }

    function globalStateTreeDepth() public view returns (uint8) {
        return config.globalStateTreeDepth;
    }

    function epochTreeDepth() public view returns (uint8) {
        return config.epochTreeDepth;
    }

    function numEpochKeyNoncePerEpoch() public view returns (uint256) {
        return config.numEpochKeyNoncePerEpoch;
    }
}
