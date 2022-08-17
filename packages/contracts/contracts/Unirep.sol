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
 *
 * In this contract, it stores all events in the Unirep protocol.
 * They consists of 3 main events:
 *   1. User sign up events
 *   2. Attestation events
 *   3. User state transition events
 * After events are successfully emitted, everyone can verify the proofs and generate a valid Unirep state
 * Then users can generate another proofs to interact with Unirep protocol.
 */
contract Unirep is IUnirep, zkSNARKHelper, VerifySignature {
    using SafeMath for uint256;

    // All verifier contracts
    IVerifier internal epkValidityVerifier;
    IVerifier internal startTransitionVerifier;
    IVerifier internal processAttestationsVerifier;
    IVerifier internal userStateTransitionVerifier;
    IVerifier internal reputationVerifier;
    IVerifier internal userSignUpVerifier;

    // Circuits configurations and contracts configurations
    Config public config;

    // The max epoch key can be computed by 2** config.epochTreeDepth
    uint256 public immutable maxEpochKey;
    uint256 public currentEpoch = 1;
    uint256 public latestEpochTransitionTime;
    uint256 public numUserSignUps = 0;

    // The index of all proofs, 0 is reserved for index not found in getProofIndex
    uint256 internal proofIndex = 1;

    // Mapping of proof nullifiers and the proof index
    mapping(bytes32 => uint256) public getProofIndex;
    mapping(uint256 => bool) public hasUserSignedUp;
    mapping(uint256 => mapping(uint256 => uint256))
        public attestationHashchains;

    mapping(uint256 => SparseTreeData) public epochTrees;
    mapping(uint256 => IncrementalTreeData) public globalStateTree;
    // epoch => root => bool
    mapping(uint256 => mapping(uint256 => bool)) public globalStateTreeRoots;
    SparseTreeData internal initUST;

    // Attesting fee collected so far
    uint256 public collectedAttestingFee;

    // Mapping of voluteers that execute epoch transition to compensation they earned
    mapping(address => uint256) public epochTransitionCompensation;

    //  A mapping between each attesters’ address and their attester ID.
    // Attester IDs are incremental and start from 1.
    // No attesters with and ID of 0 should exist.
    mapping(address => uint256) public attesters;
    uint256 public nextAttesterId = 1;
    // Mapping of the airdrop amount of an attester
    mapping(address => uint256) public airdropAmount;
    // Mapping of existing nullifiers to the epoch of emitted
    mapping(uint256 => uint256) public usedNullifiers;
    // Mapping of existing blinded user states
    mapping(uint256 => bool) public submittedBlindedUserStates;
    // Mapping of existing blinded hash chains
    mapping(uint256 => bool) public submittedBlindedHashChains;

    constructor(
        Config memory _config,
        IVerifier _epkValidityVerifier,
        IVerifier _startTransitionVerifier,
        IVerifier _processAttestationsVerifier,
        IVerifier _userStateTransitionVerifier,
        IVerifier _reputationVerifier,
        IVerifier _userSignUpVerifier
    ) {
        config = _config;

        // Set the verifier contracts
        epkValidityVerifier = _epkValidityVerifier;
        startTransitionVerifier = _startTransitionVerifier;
        processAttestationsVerifier = _processAttestationsVerifier;
        userStateTransitionVerifier = _userStateTransitionVerifier;
        reputationVerifier = _reputationVerifier;
        userSignUpVerifier = _userSignUpVerifier;

        latestEpochTransitionTime = block.timestamp;

        // Check and store the maximum number of signups
        // It is the user's responsibility to ensure that the state tree depth
        // is just large enough and not more, or they will waste gas.
        uint256 GSTMaxLeafIndex = uint256(2)**config.globalStateTreeDepth - 1;
        require(
            config.maxUsers <= GSTMaxLeafIndex,
            'Unirep: invalid maxUsers value'
        );

        uint256 USTMaxLeafIndex = uint256(2)**config.userStateTreeDepth - 1;
        require(
            config.maxAttesters <= USTMaxLeafIndex,
            'Unirep: invalid maxAttesters value'
        );

        maxEpochKey = uint256(2)**config.epochTreeDepth - 1;
        uint256 zero = 0;
        uint256 one = 1;
        uint256 defaultUSTLeaf = Poseidon5.poseidon(
            [zero, zero, zero, zero, zero]
        );
        uint256 defaultEpochTreeLeaf = Poseidon2.poseidon([one, zero]);
        SparseMerkleTree.init(
            initUST,
            config.userStateTreeDepth,
            defaultUSTLeaf
        );
        SparseMerkleTree.init(
            epochTrees[currentEpoch],
            config.epochTreeDepth,
            defaultEpochTreeLeaf
        );
        IncrementalBinaryTree.init(
            globalStateTree[currentEpoch],
            config.globalStateTreeDepth,
            0
        );
        globalStateTreeRoots[currentEpoch][
            globalStateTree[currentEpoch].root
        ] = true;
    }

    // Verify input data - Should found better way to handle it.
    function verifyAttesterSignUp(address attester) private view {
        if (attesters[attester] == 0) revert AttesterNotSignUp(attester);
    }

    function verifyProofNullifier(bytes32 proofNullifier) private view {
        if (getProofIndex[proofNullifier] != 0)
            revert ProofAlreadyUsed(proofNullifier);
    }

    function verifyNullifier(uint256 nullifier) private {
        require(nullifier != 0);
        if (usedNullifiers[nullifier] > 0)
            revert NullifierAlreadyUsed(nullifier);
        // Mark the nullifier as used
        usedNullifiers[nullifier] = currentEpoch;
    }

    /**
     * @dev User signs up by providing an identity commitment. It also inserts a fresh state leaf into the state tree.
     * An attester may specify an `initBalance` of reputation the user can use in the current epoch
     * @param identityCommitment Commitment of the user's identity which is a semaphore identity.
     * @param initBalance the starting reputation balance
     */
    function userSignUp(uint256 identityCommitment, uint256 initBalance)
        public
    {
        if (hasUserSignedUp[identityCommitment] == true)
            revert UserAlreadySignedUp(identityCommitment);
        if (numUserSignUps >= config.maxUsers)
            revert ReachedMaximumNumberUserSignedUp();

        uint256 attesterId = attesters[msg.sender];
        if (attesterId == 0 && initBalance != 0)
            revert AirdropWithoutAttester();

        hasUserSignedUp[identityCommitment] = true;
        numUserSignUps++;

        uint256 initUSTLeaf = Poseidon5.poseidon(
            [
                initBalance, // posRep
                0, // negRep
                0, // graffiti
                1, // signup
                0
            ]
        );
        // calculate the initial smt root by inserting at attesterId index
        SparseMerkleTree.update(initUST, attesterId, initUSTLeaf);

        uint256 newGSTLeaf = Poseidon2.poseidon(
            [identityCommitment, initUST.root]
        );
        // now manually reset the tree so it can be used for future signups
        // we'll ignore the root, it will be updated on next update call
        uint256 index = attesterId;
        for (uint8 i = 0; i < initUST.depth; i++) {
            initUST.leaves[i][index] = initUST.zeroes[i];
            index /= 2;
        }
        IncrementalBinaryTree.insert(globalStateTree[currentEpoch], newGSTLeaf);
        globalStateTreeRoots[currentEpoch][
            globalStateTree[currentEpoch].root
        ] = true;

        emit UserSignedUp(
            currentEpoch,
            identityCommitment,
            attesterId,
            initBalance
        );
    }

    /**
     * overload, see above
     */
    function userSignUp(uint256 identityCommitment) public {
        userSignUp(identityCommitment, 0);
    }

    /**
     * @dev Check if attester can successfully sign up in Unirep.
     */
    function _attesterSignUp(address attester) private {
        if (attesters[attester] != 0) revert AttesterAlreadySignUp(attester);

        if (nextAttesterId >= config.maxAttesters)
            revert ReachedMaximumNumberUserSignedUp();

        attesters[attester] = nextAttesterId;
        nextAttesterId++;
    }

    /**
     * @dev Sign up an attester using the address who sends the transaction
     */
    function attesterSignUp() external override {
        _attesterSignUp(msg.sender);
    }

    /**
     * @dev Sign up an attester using the claimed address and the signature
     * @param attester The address of the attester who wants to sign up
     * @param signature The signature of the attester
     */
    function attesterSignUpViaRelayer(
        address attester,
        bytes calldata signature
    ) external override {
        if (!isValidSignature(attester, signature)) revert InvalidSignature();
        _attesterSignUp(attester);
    }

    /**
     * @dev Check the validity of the attestation and the attester, emit the attestation event.
     * @param attester The address of the attester
     * @param attestation The attestation including positive reputation, negative reputation or graffiti
     * @param epochKey The epoch key which receives attestation
     */
    function assertValidAttestation(
        address attester,
        Attestation memory attestation,
        uint256 epochKey
    ) internal view {
        verifyAttesterSignUp(attester);
        if (msg.value < config.attestingFee) revert AttestingFeeInvalid();
        if (attesters[attester] != attestation.attesterId)
            revert AttesterIdNotMatch(attestation.attesterId);

        if (attestation.signUp != 0 && attestation.signUp != 1)
            revert InvalidSignUpFlag();

        if (epochKey > maxEpochKey) revert InvalidEpochKey();

        // Validate attestation data
        if (!isSNARKField(attestation.posRep))
            revert InvalidSNARKField(AttestationFieldError.POS_REP);

        if (!isSNARKField(attestation.negRep))
            revert InvalidSNARKField(AttestationFieldError.NEG_REP);

        if (!isSNARKField(attestation.graffiti))
            revert InvalidSNARKField(AttestationFieldError.GRAFFITI);
    }

    // increment the hashchain and leave the chain unsealed.
    // Also store a sealed copy of the hashchain in the epoch tree
    function storeAttestation(
        Attestation calldata attestation,
        uint256 epochKey
    ) internal {
        uint256 attestationHash = Poseidon5.poseidon(
            [
                attestation.attesterId,
                attestation.posRep,
                attestation.negRep,
                attestation.graffiti,
                attestation.signUp
            ]
        );
        uint256 currentHashchain = attestationHashchains[currentEpoch][
            epochKey
        ];
        uint256 newHashchain = Poseidon2.poseidon(
            [attestationHash, currentHashchain]
        );
        // store the latest unsealed hashchain so we can add to it later
        attestationHashchains[currentEpoch][epochKey] = newHashchain;
        // then store the sealed hashchain
        uint256 sealedHashchain = Poseidon2.poseidon([1, newHashchain]);
        SparseMerkleTree.update(
            epochTrees[currentEpoch],
            epochKey,
            sealedHashchain
        );
    }

    function submitGSTAttestation(
        Attestation calldata attestation,
        uint256 epochKey,
        uint256 gstRoot
    ) external payable {
        assertValidAttestation(msg.sender, attestation, epochKey);

        if (epochKey > maxEpochKey) revert InvalidEpochKey();

        collectedAttestingFee = collectedAttestingFee.add(msg.value);

        emit GSTAttestationSubmitted(
            currentEpoch,
            epochKey,
            msg.sender,
            attestation,
            gstRoot
        );
    }

    function submitRawAttestation(
        Attestation calldata attestation,
        uint256 epochKey
    ) external payable {
        assertValidAttestation(msg.sender, attestation, epochKey);

        if (epochKey > maxEpochKey) revert InvalidEpochKey();

        collectedAttestingFee = collectedAttestingFee.add(msg.value);

        emit AttestationSubmitted(
            currentEpoch,
            epochKey,
            msg.sender,
            attestation,
            0,
            0
        );

        storeAttestation(attestation, epochKey);
    }

    /**
     * @dev An attester submit the attestation with a proof index that the attestation will be sent to
     * and(or) a proof index that the attestation is from
     * If the fromProofIndex is non-zero, it should be valid then the toProofIndex can receive the attestation
     * @param attestation The attestation that the attester wants to send to the epoch key
     * @param epochKey The epoch key which receives attestation
     * @param toProofIndex The proof index of the receiver's epoch key, which might be epochKeyProof,
     * signedUpProof, reputationProof
     * @param fromProofIndex The proof index of the sender's epoch key, which can only be reputationProof,
     * if the attest is not from reputationProof, then fromProofIdx = 0
     */
    function submitAttestation(
        Attestation calldata attestation,
        uint256 epochKey,
        uint256 toProofIndex,
        uint256 fromProofIndex
    ) external payable {
        assertValidAttestation(msg.sender, attestation, epochKey);
        if (
            toProofIndex == 0 ||
            toProofIndex >= proofIndex ||
            fromProofIndex >= proofIndex
        ) revert InvalidProofIndex();

        collectedAttestingFee = collectedAttestingFee.add(msg.value);

        emit AttestationSubmitted(
            currentEpoch,
            epochKey,
            msg.sender,
            attestation,
            toProofIndex,
            fromProofIndex
        );
    }

    /**
     * @dev An attester submit the attestation with an epoch key proof via a relayer
     * @param attester The address of the attester
     * @param signature The signature of the attester
     * @param attestation The attestation including positive reputation, negative reputation or graffiti
     * @param epochKey The epoch key which receives attestation
     * @param toProofIndex The proof index of the receiver's epoch key, which might be epochKeyProof,
     * signedUpProof, reputationProof
     * @param fromProofIndex The proof index of the sender's epoch key, which can only be reputationProof,
     * if the attest is not from reputationProof, then fromProofIdx = 0
     */
    function submitAttestationViaRelayer(
        address attester,
        bytes calldata signature,
        Attestation calldata attestation,
        uint256 epochKey,
        uint256 toProofIndex,
        uint256 fromProofIndex
    ) external payable {
        if (!isValidSignature(attester, signature)) revert InvalidSignature();

        assertValidAttestation(msg.sender, attestation, epochKey);
        if (
            toProofIndex == 0 ||
            toProofIndex >= proofIndex ||
            fromProofIndex >= proofIndex
        ) revert InvalidProofIndex();

        collectedAttestingFee = collectedAttestingFee.add(msg.value);

        emit AttestationSubmitted(
            currentEpoch,
            epochKey,
            attester,
            attestation,
            toProofIndex,
            fromProofIndex
        );
    }

    /**
     * @dev A user should submit an epoch key proof and get a proof index
     * publicSignals[0] = [ epochKey ]
     * publicSignals[1] = [ globalStateTree ]
     * publicSignals[2] = [ epoch ]
     * @param publicSignals The public signals of the epoch key proof
     * @param proof The The proof of the epoch key proof
     */
    function submitEpochKeyProof(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) external {
        // check if proof is submitted before
        bytes32 proofNullifier = keccak256(
            abi.encodePacked(publicSignals, proof)
        );
        verifyProofNullifier(proofNullifier);
        if (publicSignals[2] != currentEpoch) revert EpochNotMatch();
        if (publicSignals[0] > maxEpochKey) revert InvalidEpochKey();

        // verify proof
        bool isValid = verifyEpochKeyValidity(publicSignals, proof);
        if (isValid == false) revert InvalidProof();

        // emit proof event
        uint256 _proofIndex = proofIndex;
        emit IndexedEpochKeyProof(
            _proofIndex,
            currentEpoch,
            publicSignals[0],
            publicSignals,
            proof
        );
        getProofIndex[proofNullifier] = _proofIndex;
        proofIndex++;
    }

    /**
     * @dev A user spend reputation via an attester, the non-zero nullifiers will be processed as a negative attestation
     * publicSignals[0] = [ epochKey ]
     * publicSignals[1] = [ globalStateTree ]
     * publicSignals[2: maxReputationBudget + 2] = [ reputationNullifiers ]
     * publicSignals[maxReputationBudget + 2] = [ epoch ]
     * publicSignals[maxReputationBudget + 3] = [ attesterId ]
     * publicSignals[maxReputationBudget + 4] = [ proveReputationAmount ]
     * publicSignals[maxReputationBudget + 5] = [ minRep ]
     * publicSignals[maxReputationBudget + 6] = [ minRep ]
     * publicSignals[maxReputationBudget + 7] = [ proveGraffiti ]
     * publicSignals[maxReputationBudget + 8] = [ graffitiPreImage ]
     * @param publicSignals The public signals of the reputation proof
     * @param proof The The proof of the reputation proof
     */
    function spendReputation(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) external payable {
        // check if proof is submitted before
        bytes32 proofNullifier = keccak256(
            abi.encodePacked(publicSignals, proof)
        );
        uint256 _maxReputationBudget = config.maxReputationBudget;
        verifyProofNullifier(proofNullifier);

        if (publicSignals[_maxReputationBudget + 2] != currentEpoch)
            revert EpochNotMatch();

        for (uint256 index = 2; index < 2 + _maxReputationBudget; index++) {
            if (publicSignals[index] > 0) verifyNullifier(publicSignals[index]);
        }

        // verify proof
        bool isValid = verifyReputation(publicSignals, proof);
        if (isValid == false) revert InvalidProof();

        // attestation of spending reputation
        Attestation memory attestation;
        attestation.attesterId = publicSignals[_maxReputationBudget + 3];
        attestation.negRep = publicSignals[_maxReputationBudget + 4];

        assertValidAttestation(msg.sender, attestation, publicSignals[0]);
        // Add to the cumulated attesting fee
        collectedAttestingFee = collectedAttestingFee.add(msg.value);

        uint256 _proofIndex = proofIndex;
        // emit proof event
        emit IndexedReputationProof(
            _proofIndex,
            currentEpoch,
            publicSignals[0],
            publicSignals,
            proof
        );

        emit AttestationSubmitted(
            currentEpoch,
            publicSignals[0],
            msg.sender,
            attestation,
            _proofIndex,
            0
        );
        getProofIndex[proofNullifier] = _proofIndex;
        proofIndex++;
    }

    /**
     * @dev Perform an epoch transition, current epoch increases by 1
     */
    function beginEpochTransition() external {
        uint256 initGas = gasleft();

        if (block.timestamp - latestEpochTransitionTime < config.epochLength)
            revert EpochNotEndYet();

        // Mark epoch transitioned as complete and increase currentEpoch
        emit EpochEnded(currentEpoch);

        latestEpochTransitionTime = block.timestamp;
        currentEpoch++;

        // avoid calling init by manually copying zero values and root
        for (uint8 i; i < config.epochTreeDepth; i++) {
            epochTrees[currentEpoch].zeroes[i] = epochTrees[currentEpoch - 1]
                .zeroes[i];
        }
        epochTrees[currentEpoch].root = Poseidon2.poseidon(
            [
                epochTrees[currentEpoch].zeroes[config.epochTreeDepth - 1],
                epochTrees[currentEpoch].zeroes[config.epochTreeDepth - 1]
            ]
        );
        epochTrees[currentEpoch].depth = config.epochTreeDepth;
        for (uint8 i; i < config.globalStateTreeDepth; i++) {
            globalStateTree[currentEpoch].zeroes[i] = globalStateTree[
                currentEpoch - 1
            ].zeroes[i];
        }
        globalStateTree[currentEpoch].root = Poseidon2.poseidon(
            [
                globalStateTree[currentEpoch].zeroes[
                    config.globalStateTreeDepth - 1
                ],
                globalStateTree[currentEpoch].zeroes[
                    config.globalStateTreeDepth - 1
                ]
            ]
        );
        globalStateTree[currentEpoch].depth = config.globalStateTreeDepth;
        globalStateTreeRoots[currentEpoch][
            globalStateTree[currentEpoch].root
        ] = true;

        uint256 gasUsed = initGas.sub(gasleft());
        epochTransitionCompensation[msg.sender] = epochTransitionCompensation[
            msg.sender
        ].add(gasUsed.mul(tx.gasprice));
    }

    /**
     * @dev User submit a start user state transition proof
     * publicSignals[0] = [ globalStateTree ]
     * publicSignals[1] = [ blindedUserState ]
     * publicSignals[2] = [ blindedHashChain ]
     * @param publicSignals The public signals of the start user state transition proof
     * @param proof The The proof of the start user state transition proof
     */
    function startUserStateTransition(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) external {
        // check if proof is submitted before
        bytes32 proofNullifier = keccak256(
            abi.encodePacked(publicSignals, proof)
        );
        verifyProofNullifier(proofNullifier);

        // verify proof
        bool isValid = verifyStartTransitionProof(publicSignals, proof);
        if (isValid == false) revert InvalidProof();

        submittedBlindedUserStates[publicSignals[1]] = true;
        submittedBlindedHashChains[publicSignals[2]] = true;

        uint256 _proofIndex = proofIndex;
        emit IndexedStartedTransitionProof(
            _proofIndex,
            publicSignals[1], // indexed blinded user state
            publicSignals[0], // indexed global state tree
            publicSignals,
            proof
        );
        getProofIndex[proofNullifier] = _proofIndex;
        proofIndex++;
    }

    /**
     * @dev User submit a process attestations proof
     * publicSignals[0] = [ outputBlindedUserState ]
     * publicSignals[1] = [ outputBlindedHashChain ]
     * publicSignals[2] = [ inputBlindedUserState ]
     * @param publicSignals The public signals of the process attestations proof
     * @param proof The process attestations proof
     */
    function processAttestations(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) external {
        // check if proof is submitted before
        bytes32 proofNullifier = keccak256(
            abi.encodePacked(publicSignals, proof)
        );
        verifyProofNullifier(proofNullifier);

        uint256 _inputBlindedUserState = publicSignals[2];
        if (submittedBlindedUserStates[_inputBlindedUserState] == false)
            revert InvalidBlindedUserState(_inputBlindedUserState);

        submittedBlindedUserStates[publicSignals[0]] = true;
        submittedBlindedHashChains[publicSignals[1]] = true;

        // verify proof
        bool isValid = verifyProcessAttestationProof(publicSignals, proof);
        if (isValid == false) revert InvalidProof();

        uint256 _proofIndex = proofIndex;
        emit IndexedProcessedAttestationsProof(
            _proofIndex,
            _inputBlindedUserState, // input blinded user state
            publicSignals,
            proof
        );
        getProofIndex[proofNullifier] = _proofIndex;
        proofIndex++;
    }

    /**
     * @dev User submit the latest user state transition proof
     * publicSignals[0] = [ fromGlobalStateTree ]
     * publicSignals[1] = [ newGlobalStateTreeLeaf ]
     * publicSignals[2: 2 + numEpochKeyNoncePerEpoch] = [ epkNullifiers ]
     * publicSignals[2 + numEpochKeyNoncePerEpoch] = [ transitionFromEpoch ]
     * publicSignals[3 + numEpochKeyNoncePerEpoch:
                     5+  numEpochKeyNoncePerEpoch] = [ blindedUserStates ]
     * publicSignals[5+  numEpochKeyNoncePerEpoch:
                     5+2*numEpochKeyNoncePerEpoch] = [ blindedHashChains ]
     * publicSignals[5+2*numEpochKeyNoncePerEpoch] = [ fromEpochTree ]
     * @param publicSignals The the public signals of the user state transition proof
     * @param proof The proof of the user state transition proof
     * @param proofIndexRecords The proof indexes of the previous start transition proof and process attestations proofs
     */
    function updateUserStateRoot(
        uint256[] memory publicSignals,
        uint256[8] memory proof,
        uint256[] memory proofIndexRecords
    ) external {
        // check if proof is submitted before
        bytes32 proofNullifier = keccak256(
            abi.encodePacked(publicSignals, proof)
        );
        verifyProofNullifier(proofNullifier);
        uint256 _numEpochKeyNoncePerEpoch = config.numEpochKeyNoncePerEpoch;
        // NOTE: this impl assumes all attestations are processed in a single snark.
        if (publicSignals[2 + _numEpochKeyNoncePerEpoch] >= currentEpoch)
            revert InvalidTransitionEpoch();

        for (uint256 i = 0; i < proofIndexRecords.length; i++) {
            if (
                !(proofIndexRecords[i] != 0 &&
                    (proofIndexRecords[i] < proofIndex))
            ) revert InvalidProofIndex();
        }

        for (uint256 index = 2; index < 2 + _numEpochKeyNoncePerEpoch; index++)
            verifyNullifier(publicSignals[index]);

        // verify blindned user states
        for (
            uint256 index = 3 + _numEpochKeyNoncePerEpoch;
            index < 5 + _numEpochKeyNoncePerEpoch;
            index++
        ) {
            if (submittedBlindedUserStates[publicSignals[index]] == false)
                revert InvalidBlindedUserState(publicSignals[index]);
        }

        // verify blinded hash chains
        for (
            uint256 index = 5 + _numEpochKeyNoncePerEpoch;
            index < 5 + 2 * _numEpochKeyNoncePerEpoch;
            index++
        ) {
            if (submittedBlindedHashChains[publicSignals[index]] == false)
                revert InvalidBlindedHashChain(publicSignals[index]);
        }

        // verify proof
        bool isValid = verifyUserStateTransition(publicSignals, proof);
        if (isValid == false) revert InvalidProof();

        // update global state tree
        IncrementalBinaryTree.insert(
            globalStateTree[currentEpoch],
            publicSignals[1]
        );
        globalStateTreeRoots[currentEpoch][
            globalStateTree[currentEpoch].root
        ] = true;

        uint256 _proofIndex = proofIndex;
        emit IndexedUserStateTransitionProof(
            _proofIndex,
            publicSignals,
            proof,
            proofIndexRecords
        );
        emit UserStateTransitioned(currentEpoch, publicSignals[1], _proofIndex);

        getProofIndex[proofNullifier] = _proofIndex;
        proofIndex++;
    }

    /**
     * @dev Verify epoch transition proof
     * publicSignals[0] = [ globalStateTree ]
     * publicSignals[1] = [ epoch ]
     * publicSignals[2] = [ epochKey ]
     * @param publicSignals The public signals of the epoch key proof
     * @param proof The The proof of the epoch key proof
     */
    function verifyEpochKeyValidity(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) public view returns (bool) {
        // Before attesting to a given epoch key, an attester must verify validity of the epoch key:
        // 1. user has signed up
        // 2. nonce is no greater than numEpochKeyNoncePerEpoch
        // 3. user has transitioned to the epoch(by proving membership in the globalStateTree of that epoch)
        // 4. epoch key is correctly computed

        // Ensure that each public input is within range of the snark scalar
        // field.
        // TODO: consider having more granular revert reasons
        if (!isValidSignals(publicSignals)) revert InvalidSignals();

        // Verify the proof
        return epkValidityVerifier.verifyProof(proof, publicSignals);
    }

    /**
     * @dev Verify start user state transition proof
     * publicSignals[0] = [ blindedUserState ]
     * publicSignals[1] = [ blindedHashChain ]
     * publicSignals[2] = [ globalStateTree ]
     * @param publicSignals The public signals of the start user state transition proof
     * @param proof The The proof of the start user state transition proof
     */
    function verifyStartTransitionProof(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) public view returns (bool) {
        // The start transition proof checks that
        // 1. user has signed up
        // 2. blinded user state is computed by: hash(identity, UST_root, epoch, epoch_key_nonce)
        // 3. blinded hash chain is computed by: hash(identity, hash_chain = 0, epoch, epoch_key_nonce)
        // 4. user has transitioned to some epoch(by proving membership in the globalStateTree of that epoch)

        // Ensure that each public input is within range of the snark scalar
        // field.
        // TODO: consider having more granular revert reasons
        if (!isValidSignals(publicSignals)) revert InvalidSignals();

        // Verify the proof
        return startTransitionVerifier.verifyProof(proof, publicSignals);
    }

    /**
     * @dev Verify process attestations proof
     * publicSignals[0] = [ outputBlindedUserState ]
     * publicSignals[1] = [ outputBlindedHashChain ]
     * publicSignals[2] = [ inputBlindedUserState ]
     * @param publicSignals The public signals of the process attestations proof
     * @param proof The process attestations proof
     */
    function verifyProcessAttestationProof(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) public view returns (bool) {
        // The process attestations proof checks that
        // 1. user processes attestations correctly and update the hash chain and user state tree
        // 2. input blinded state is computed by: hash(identity, user_state_tree_root, epoch, from_epk_nonce)
        // 3. output blinded state is computed by: hash(identity, user_state_tree_root, epoch, to_epk_nonce)
        // 4. output hash chain is computed by:  hash(identity, hash_chain, epoch, to_epk_nonce)

        // Ensure that each public input is within range of the snark scalar
        // field.
        if (!isValidSignals(publicSignals)) revert InvalidSignals();

        // Verify the proof
        return processAttestationsVerifier.verifyProof(proof, publicSignals);
    }

    /**
     * @dev Verify user state transition proof
     * publicSignals[0                                    ] = [ newGlobalStateTreeLeaf ]
     * publicSignals[1: this.numEpochKeyNoncePerEpoch + 1 ] = [ epkNullifiers          ]
     * publicSignals[this.numEpochKeyNoncePerEpoch + 1    ] = [ transitionFromEpoch    ]
     * publicSignals[this.numEpochKeyNoncePerEpoch + 2,
     *               this.numEpochKeyNoncePerEpoch + 4    ] = [ blindedUserStates      ]
     * publicSignals[4 + this.numEpochKeyNoncePerEpoch    ] = [ fromGlobalStateTree    ]
     * publicSignals[5 + this.numEpochKeyNoncePerEpoch,
     *               5 + 2 * this.numEpochKeyNoncePerEpoch] = [ blindedHashChains      ]
     * publicSignals[5 + 2 * this.numEpochKeyNoncePerEpoch] = [ fromEpochTree          ]
     * @param publicSignals The public signals of the sign up proof
     * @param proof The The proof of the sign up proof
     */
    function verifyUserStateTransition(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) public view returns (bool) {
        // Verify validity of new user state:
        // 1. User's identity and state exist in the provided global state tree
        // 2. All epoch key nonces are processed and blinded hash chains are computed
        // 3. All epoch key nonces are processed and user state trees are computed
        // 4. Compute new global state tree leaf: hash(id, user_state_tree_root)

        if (!isValidSignals(publicSignals)) revert InvalidSignals();

        // Verify the proof
        return userStateTransitionVerifier.verifyProof(proof, publicSignals);
    }

    /**
     * @dev Verify reputation proof
     * publicSignals[0: maxReputationBudget ] = [ reputationNullifiers ]
     * publicSignals[maxReputationBudget    ] = [ epoch ]
     * publicSignals[maxReputationBudget + 1] = [ epochKey ]
     * publicSignals[maxReputationBudget + 2] = [ globalStateTree ]
     * publicSignals[maxReputationBudget + 3] = [ attesterId ]
     * publicSignals[maxReputationBudget + 4] = [ proveReputationAmount ]
     * publicSignals[maxReputationBudget + 5] = [ minRep ]
     * publicSignals[maxReputationBudget + 6] = [ proveGraffiti ]
     * publicSignals[maxReputationBudget + 7] = [ graffitiPreImage ]
     * @param publicSignals The public signals of the reputation proof
     * @param proof The The proof of the reputation proof
     */
    function verifyReputation(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) public view returns (bool) {
        // User prove his reputation by an attester:
        // 1. User exists in GST
        // 2. It is the latest state user transition to
        // 3. (optional) different reputation nullifiers equals to prove reputation amount
        // 4. (optional) (positive reputation - negative reputation) is greater than `_minRep`
        // 5. (optional) hash of graffiti pre-image matches

        // Ensure that each public input is within range of the snark scalar
        // field.
        if (!isValidSignals(publicSignals)) revert InvalidSignals();

        // Verify the proof
        return reputationVerifier.verifyProof(proof, publicSignals);
    }

    /**
     * @dev Verify user sign up proof
     * publicSignals[0] = [ epoch ]
     * publicSignals[1] = [ epochKey ]
     * publicSignals[2] = [ globalStateTree ]
     * publicSignals[3] = [ attesterId ]
     * publicSignals[4] = [ userHasSignedUp ]
     * @param publicSignals The public signals of the sign up proof
     * @param proof The The proof of the sign up proof
     */
    function verifyUserSignUp(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) public view returns (bool) {
        // User prove his reputation by an attester:
        // 1. User exists in GST
        // 2. It is the latest state user transition to
        // 3. User has a signUp flag in the attester's leaf

        // Ensure that each public input is within range of the snark scalar
        // field.
        if (!isValidSignals(publicSignals)) revert InvalidSignals();

        // Verify the proof
        return userSignUpVerifier.verifyProof(proof, publicSignals);
    }

    /**
     * @dev Functions to burn fee and collect compenstation.
     * TODO: Should use attester fee, shouldn't burn like this.
     */
    function burnAttestingFee() external {
        uint256 amount = collectedAttestingFee;
        collectedAttestingFee = 0;
        Address.sendValue(payable(address(0)), amount);
    }

    /**
     * @dev Users who helps to perform epoch transition can get compensation
     */
    function collectEpochTransitionCompensation() external {
        // NOTE: currently there are no revenue to pay for epoch transition compensation
        uint256 amount = epochTransitionCompensation[msg.sender];
        epochTransitionCompensation[msg.sender] = 0;
        Address.sendValue(payable(msg.sender), amount);
    }

    function globalStateTreeDepth() public view returns (uint8) {
        return config.globalStateTreeDepth;
    }

    function userStateTreeDepth() public view returns (uint8) {
        return config.userStateTreeDepth;
    }

    function epochTreeDepth() public view returns (uint8) {
        return config.epochTreeDepth;
    }

    function numEpochKeyNoncePerEpoch() public view returns (uint256) {
        return config.numEpochKeyNoncePerEpoch;
    }

    function maxReputationBudget() public view returns (uint256) {
        return config.maxReputationBudget;
    }

    function numAttestationsPerProof() public view returns (uint256) {
        return config.numAttestationsPerProof;
    }

    function epochLength() public view returns (uint256) {
        return config.epochLength;
    }

    function attestingFee() public view returns (uint256) {
        return config.attestingFee;
    }

    function maxUsers() public view returns (uint256) {
        return config.maxUsers;
    }

    function maxAttesters() public view returns (uint256) {
        return config.maxAttesters;
    }
}
