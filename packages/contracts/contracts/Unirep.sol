// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/utils/Address.sol';

import {zkSNARKHelper} from './libraries/zkSNARKHelper.sol';
import {VerifySignature} from './libraries/VerifySignature.sol';

import {IUnirep} from './interfaces/IUnirep.sol';
import {IVerifier} from './interfaces/IVerifier.sol';
import {Poseidon5, Poseidon2} from './Hash.sol';
import {SparseMerkleTree, SparseTreeData} from './SparseMerkleTree.sol';

import {IncrementalBinaryTree, IncrementalTreeData} from '@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol';

/**
 * @title Unirep
 * @dev Unirep is a reputation which uses ZKP to preserve users' privacy.
 * Attester can give attestations to users, and users can optionally prove that how much reputation they have.
 */
contract Unirep is IUnirep, zkSNARKHelper, VerifySignature {
    using SafeMath for uint256;

    // All verifier contracts
    IVerifier internal signupVerifier;
    IVerifier internal attestationVerifier;
    IVerifier internal epochTransitionVerifier;
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
        IVerifier _attestationVerifier,
        IVerifier _epochTransitionVerifier,
        IVerifier _reputationVerifier
    ) {
        config = _config;

        // Set the verifier contracts
        signupVerifier = _signupVerifier;
        attestationVerifier = _attestationVerifier;
        epochTransitionVerifier = _epochTransitionVerifier;
        reputationVerifier = _reputationVerifier;

        maxEpochKey = uint256(2)**config.epochTreeDepth - 1;

        // for initializing other trees without using poseidon function
        IncrementalBinaryTree.init(emptyTree, config.globalStateTreeDepth, 0);
    }

    /**
     * @dev User signs up by providing an identity commitment. It also inserts a fresh state leaf into the state tree.
     * An attester may specify an `initBalance` of reputation the user can use in the current epoch
     */
    /**
     * TODO: accept a zk proof outputting the identity commitent + state tree leaf
     **/
    function userSignUp(uint256[] memory publicSignals, uint256[8] memory proof)
        public
    {
        if (!isValidSignals(publicSignals)) revert InvalidSignals();
        // Verify the proof
        require(signupVerifier.verifyProof(proof, publicSignals));

        uint256 identityCommitment = publicSignals[0];
        uint256 attesterId = publicSignals[2];
        updateEpochIfNeeded(attesterId);
        AttesterData storage attester = attesters[uint160(attesterId)];
        require(attester.startTimestamp != 0);

        if (attester.identityCommitments[identityCommitment])
            revert UserAlreadySignedUp(identityCommitment);

        // if (numUserSignUps >= config.maxUsers)
        //     revert ReachedMaximumNumberUserSignedUp();

        require(attester.currentEpoch == publicSignals[3]);

        emit UserSignedUp(
            attester.currentEpoch,
            identityCommitment,
            uint160(attesterId),
            attester.stateTrees[attester.currentEpoch].numberOfLeaves
        );
        emit NewGSTLeaf(
            attester.currentEpoch,
            uint160(attesterId),
            publicSignals[1],
            attester.stateTrees[attester.currentEpoch].numberOfLeaves
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
     * @dev Signup and initialize an attester
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
     * @dev An attester submit the attestation with a proof index that the attestation will be sent to
     * and(or) a proof index that the attestation is from
     * If the fromProofIndex is non-zero, it should be valid then the toProofIndex can receive the attestation
     * @param targetEpoch The epoch in which the attestation was intended
     */
    function submitAttestation(
        uint256 targetEpoch,
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) public {
        if (!isValidSignals(publicSignals)) revert InvalidSignals();
        // Verify the proof
        require(attestationVerifier.verifyProof(proof, publicSignals));

        uint256 toRoot = publicSignals[0];
        uint256 newLeaf = publicSignals[1];
        uint256 fromRoot = publicSignals[2];
        uint256 epochKey = publicSignals[3];
        uint256 posRep = publicSignals[4];
        uint256 negRep = publicSignals[5];

        updateEpochIfNeeded(uint160(msg.sender));

        AttesterData storage attester = attesters[uint160(msg.sender)];
        require(attester.currentEpoch == targetEpoch);
        require(attester.epochTreeRoots[targetEpoch] == fromRoot);
        attester.epochTreeRoots[targetEpoch] = toRoot;

        if (epochKey > maxEpochKey) revert InvalidEpochKey();

        // TODO: prove the pre-iamge of the hash?
        emit AttestationSubmitted(
            attester.currentEpoch,
            epochKey,
            uint160(msg.sender),
            posRep,
            negRep
        );
        emit EpochTreeLeaf(targetEpoch, uint160(msg.sender), newLeaf, epochKey);
    }

    /**
     * @dev An attester submit the attestation with an epoch key proof via a relayer
     * @param attester The address of the attester
     * @param signature The signature of the attester
     * @param attestation The attestation including positive reputation, negative reputation or graffiti
     * @param epochKey The epoch key which receives attestation
     */
    // function submitAttestationViaRelayer(
    //     address attester,
    //     bytes calldata signature,
    //     Attestation calldata attestation,
    //     uint256 epochKey
    // ) external payable {
    //     if (!isValidSignature(attester, signature)) revert InvalidSignature();
    //     assertValidAttestation(attester, attestation, epochKey);
    //     if (epochKey > maxEpochKey) revert InvalidEpochKey();

    //     collectedAttestingFee = collectedAttestingFee.add(msg.value);

    //     emit AttestationSubmitted(
    //         currentEpoch,
    //         epochKey,
    //         attester,
    //         attestation
    //     );

    //     storeAttestation(attestation, epochKey);
    // }

    /**
     * @dev A user should submit an epoch key proof and get a proof index
     * publicSignals[0] = [ epochKey ]
     * publicSignals[1] = [ globalStateTree ]
     * publicSignals[2] = [ epoch ]
     * @param publicSignals The public signals of the epoch key proof
     * @param proof The The proof of the epoch key proof
     */
    // function assertValidEpochKeyProof(
    //     uint256[] memory publicSignals,
    //     uint256[8] memory proof
    // ) external view {
    //     uint256 _epoch = publicSignals[2];
    //     uint256 _globalStateTreeRoot = publicSignals[1];

    //     // check if proof is submitted before
    //     if (_epoch != currentEpoch) revert EpochNotMatch();
    //     if (publicSignals[0] > maxEpochKey) revert InvalidEpochKey();

    //     // verify global state tree root
    //     if (globalStateTreeRoots[_epoch][_globalStateTreeRoot] == false)
    //         revert InvalidGlobalStateTreeRoot(_globalStateTreeRoot);

    //     // verify proof
    //     bool isValid = verifyEpochKeyValidity(publicSignals, proof);
    //     if (isValid == false) revert InvalidProof();
    // }

    /**
     * Take an epochTransition zk proof for a user
     **/
    function epochTransition(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) public {
        if (!isValidSignals(publicSignals)) revert InvalidSignals();
        // Verify the proof
        require(epochTransitionVerifier.verifyProof(proof, publicSignals));

        require(publicSignals[5] < type(uint160).max);
        uint160 attesterId = uint160(publicSignals[5]);
        updateEpochIfNeeded(attesterId);
        AttesterData storage attester = attesters[attesterId];
        // verify that we're transition to the current epoch
        require(attester.currentEpoch == publicSignals[4]);
        // verify that the transition nullifier hasn't been used
        require(!usedNullifiers[publicSignals[2]]);
        usedNullifiers[publicSignals[2]] = true;

        uint256 fromEpoch = publicSignals[3];
        // make sure from epoch tree root is valid
        require(attester.epochTreeRoots[fromEpoch] == publicSignals[6]);
        // make sure from state tree root is valid
        require(attester.stateTreeRoots[fromEpoch][publicSignals[0]]);
        // update the current state tree
        emit NewGSTLeaf(
            attester.currentEpoch,
            attesterId,
            publicSignals[1],
            attester.stateTrees[attester.currentEpoch].numberOfLeaves
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
     * @dev Perform an epoch transition for an attester, if needed.
     */
    function updateEpochIfNeeded(uint256 attesterId) public {
        require(attesterId < type(uint160).max);
        AttesterData storage attester = attesters[uint160(attesterId)];
        require(attester.startTimestamp != 0); // indicates the attester is signed up
        uint256 newEpoch = currentEpoch(uint160(attesterId));
        if (newEpoch == attester.currentEpoch) return;

        // otherwise initialize the new epoch structures

        for (uint8 i; i < config.globalStateTreeDepth; i++) {
            attester.stateTrees[newEpoch].zeroes[i] = emptyTree.zeroes[i];
        }
        attester.stateTrees[newEpoch].root = emptyTree.root;
        attester.stateTrees[newEpoch].depth = config.globalStateTreeDepth;
        attester.stateTreeRoots[newEpoch][emptyTree.root] = true;

        attester.epochTreeRoots[newEpoch] = config.emptyEpochTreeRoot;

        emit EpochEnded(attester.currentEpoch);

        attester.currentEpoch = newEpoch;
    }

    function currentEpoch(uint160 attesterId) public view returns (uint256) {
        AttesterData storage attester = attesters[attesterId];
        require(attester.startTimestamp != 0); // indicates the attester is signed up
        return
            (block.timestamp - attester.startTimestamp) / attester.epochLength;
    }

    function epochRemainingTime(uint160 attesterId)
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
