// SPDX-License-Identifier: UNLICENSED
pragma abicoder v2;
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import { Hasher } from './libraries/Hasher.sol';
import { zkSNARKHelper } from './libraries/zkSNARKHelper.sol';
import { VerifySignature } from './libraries/VerifySignature.sol';

import { IUnirep } from './interfaces/IUnirep.sol';
import { IVerifier } from './interfaces/IVerifier.sol';

contract Unirep is IUnirep, zkSNARKHelper , Hasher, VerifySignature {
    using SafeMath for uint256;

    // Verifier Contracts
    IVerifier internal epkValidityVerifier;
    IVerifier internal startTransitionVerifier;
    IVerifier internal processAttestationsVerifier;
    IVerifier internal userStateTransitionVerifier;
    IVerifier internal reputationVerifier;
    IVerifier internal userSignUpVerifier;

    uint256 public currentEpoch = 1;

    uint256 public immutable epochLength;

    uint256 public immutable maxEpochKey;

    uint256 public latestEpochTransitionTime;

    // Maximum number of epoch keys allowed for an user to generate in one epoch
    uint8 public immutable numEpochKeyNoncePerEpoch;

    // Maximum number of reputation nullifiers in a proof
    uint8 public immutable maxReputationBudget;

    // The maximum number of users allowed
    uint256 public immutable maxUsers;

    // The maximum number of attesters allowed
    uint256 public immutable maxAttesters;

    uint256 public numUserSignUps = 0;

    // The index of all proofs,
    // 0 is reserved for index not found in getProofIndex
    uint256 internal proofIndex = 1;

    // Mapping of proof nullifiers and the proof index
    mapping(bytes32 => uint256) public getProofIndex;

    mapping(uint256 => bool) public hasUserSignedUp;

    // Fee required for submitting an attestation
    uint256 public immutable attestingFee;
    // Attesting fee collected so far
    uint256 public collectedAttestingFee;
    // Mapping of voluteers that execute epoch transition to compensation they earned
    mapping(address => uint256) public epochTransitionCompensation;

    // A mapping between each attesters’ Ethereum address and their attester ID.
    // Attester IDs are incremental and start from 1.
    // No attesters with and ID of 0 should exist.
    mapping(address => uint256) public attesters;

    uint256 public nextAttesterId = 1;

    // Mapping of the airdrop amount of an attester
    mapping(address => uint256) public airdropAmount;

    TreeDepths public treeDepths;

    constructor(
        TreeDepths memory _treeDepths,
        MaxValues memory _maxValues,
        IVerifier _epkValidityVerifier,
        IVerifier _startTransitionVerifier,
        IVerifier _processAttestationsVerifier,
        IVerifier _userStateTransitionVerifier,
        IVerifier _reputationVerifier,
        IVerifier _userSignUpVerifier,
        uint8 _numEpochKeyNoncePerEpoch,
        uint8 _maxReputationBudget,
        uint256 _epochLength,
        uint256 _attestingFee
    ) {
        treeDepths = _treeDepths;

        // Set the verifier contracts
        epkValidityVerifier = _epkValidityVerifier;
        startTransitionVerifier = _startTransitionVerifier;
        processAttestationsVerifier = _processAttestationsVerifier;
        userStateTransitionVerifier = _userStateTransitionVerifier;
        reputationVerifier = _reputationVerifier;
        userSignUpVerifier = _userSignUpVerifier;

        numEpochKeyNoncePerEpoch = _numEpochKeyNoncePerEpoch;
        maxReputationBudget = _maxReputationBudget;
        epochLength = _epochLength;
        latestEpochTransitionTime = block.timestamp;

        // Check and store the maximum number of signups
        // It is the user's responsibility to ensure that the state tree depth
        // is just large enough and not more, or they will waste gas.
        uint256 GSTMaxLeafIndex = uint256(2) ** _treeDepths.globalStateTreeDepth - 1;
        require(
            _maxValues.maxUsers <= GSTMaxLeafIndex,
            "Unirep: invalid maxUsers value"
        );
        maxUsers = _maxValues.maxUsers;

        uint256 USTMaxLeafIndex = uint256(2) ** _treeDepths.userStateTreeDepth - 1;
        require(
            _maxValues.maxAttesters <= USTMaxLeafIndex,
            "Unirep: invalid maxAttesters value"
        );
        maxAttesters = _maxValues.maxAttesters;

        maxEpochKey = uint256(2) ** _treeDepths.epochTreeDepth - 1;

        attestingFee = _attestingFee;
    }

    
    // Verify input data - Should found better way to handle it.

    function verifyAstesterSignUp(address _attester) private view {
        require(attesters[_attester] > 0, "Unirep: attester has not signed up yet");
    }

    function verifyProofNullilier(bytes32 proofNullifier) private view {
        require(
            getProofIndex[proofNullifier] == 0,
            "Unirep: the proof has been submitted before"
        ); 
    }
    
    function verifyAttesterFee() private view {
        require(
            msg.value == attestingFee,
            "Unirep: no attesting fee or incorrect amount"
        );    
    }

    function verifyAttesterIndex(address attester, uint256 attesterId) private view {
        require(
            attesters[attester] == attesterId,
            "Unirep: mismatched attesterId"
        );

    }
    /*
     * User signs up by providing an identity commitment. It also inserts a fresh state
     * leaf into the state tree.
     * if user signs up through an atteser who sets airdrop, Unirep will give the user the airdrop reputation.
     * @param identityCommitment Commitment of the user's identity which is a semaphore identity.
     */
    function userSignUp(uint256 _identityCommitment) external {
        require(
            hasUserSignedUp[_identityCommitment] == false,
            "Unirep: the user has already signed up"
        );
        require(
            numUserSignUps < maxUsers,
            "Unirep: maximum number of user signups reached"
        );

        uint256 attesterId = attesters[msg.sender];
        uint256 airdropPosRep = airdropAmount[msg.sender];

        hasUserSignedUp[_identityCommitment] = true;
        numUserSignUps++;

        emit Sequencer(currentEpoch, Event.UserSignedUp);
        emit UserSignedUp(
            currentEpoch,
            _identityCommitment,
            attesterId,
            airdropPosRep
        );
    }


    function _attesterSignUp(address attester) private {
        require(
            attesters[attester] == 0,
            "Unirep: attester has already signed up"
        );
        require(
            nextAttesterId < maxAttesters,
            "Unirep: maximum number of attester signups reached"
        );

        attesters[attester] = nextAttesterId;
        nextAttesterId++;
    }

    /*
     * Sign up an attester using the address who sends the transaction
     */
    function attesterSignUp() external override {
        _attesterSignUp(msg.sender);
    }

    /*
     * Sign up an attester using the claimed address and the signature
     * @param attester The address of the attester who wants to sign up
     * @param signature The signature of the attester
     */
    function attesterSignUpViaRelayer(
        address attester,
        bytes calldata signature
    ) external override {
        require(verifySignature(attester, signature), "Unirep: invalid attester sign up signature");
        _attesterSignUp(attester);
    }

    /*
     * An attester can set the initial airdrop amount when user signs up through this attester
     * Then the contract inserts an airdropped leaf into the user's user state tree
     * @param _airdropAmount how much pos rep add to user's leaf
     */
    function setAirdropAmount(uint256 _airdropAmount) external {
        verifyAstesterSignUp(msg.sender);
        airdropAmount[msg.sender] = _airdropAmount;
    }

    /** 
     * @param attester The address of the attester
     * @param attestation The attestation including positive reputation, negative reputation or graffiti
     * @param epochKey The epoch key which receives attestation
     * @param toProofIndex The proof index of the receiver's epoch key, which might be epochKeyProof, signedUpProof, reputationProof
     * @param fromProofIndex The proof index of the sender's epoch key, which can only be reputationProof, if the attest is not from reputationProof, then fromProofIdx = 0
     */
    function _submitAttestation(
        address attester,
        Attestation calldata attestation,
        uint256 epochKey,
        uint256 toProofIndex,
        uint256 fromProofIndex
    ) private {
        verifyAstesterSignUp(attester);
        verifyAttesterIndex(attester, attestation.attesterId);
        verifyAttesterFee();

        require(
            toProofIndex != 0 &&
            toProofIndex < proofIndex &&
            fromProofIndex < proofIndex,
            "Unirep: invalid proof index"
        );
        require(
            attestation.signUp == 0 || attestation.signUp == 1,
            "Unirep: invalid sign up flag"
        );
        require(epochKey <= maxEpochKey, "Unirep: invalid epoch key range");

        // Add to the cumulated attesting fee
        collectedAttestingFee = collectedAttestingFee.add(msg.value);

        // Process attestation
        emitAttestationEvent(
            attester,
            attestation,
            epochKey,
            toProofIndex,
            fromProofIndex,
            AttestationEvent.SendAttestation
        );
    } 

    /*
     * An attester submit the attestation with a proof index
     * @param attestation The attestation that the attester wants to send to the epoch key
     * @param epochKey The epoch key which receives attestation
     * @param toProofIndex The proof index of the receiver's epoch key, which might be epochKeyProof, signedUpProof, reputationProof
     * @param fromProofIndex The proof index of the sender's epoch key, which can only be reputationProof, if the attest is not from reputationProof, then fromProofIdx = 0
     */
    function submitAttestation(
        Attestation calldata attestation,
        uint256 epochKey,
        uint256 toProofIndex,
        uint256 fromProofIndex
    ) external payable {
      _submitAttestation(msg.sender, attestation, epochKey, toProofIndex, fromProofIndex);
    }

    /*
     * An attester submit the attestation with an epoch key proof via a relayer
     * @param attester The address of the attester
     * @param signature The signature of the attester
     * @param attestation The attestation including positive reputation, negative reputation or graffiti
     * @param epochKey The epoch key which receives attestation
     * @param toProofIndex The proof index of the receiver's epoch key, which might be epochKeyProof, signedUpProof, reputationProof
     * @param fromProofIndex The proof index of the sender's epoch key, which can only be reputationProof, if the attest is not from reputationProof, then fromProofIdx = 0
     */
    function submitAttestationViaRelayer(
        address attester,
        bytes calldata signature,
        Attestation calldata attestation,
        uint256 epochKey,
        uint256 toProofIndex,
        uint256 fromProofIndex
    ) external payable {
        verifySignature(attester, signature);
        _submitAttestation(attester, attestation, epochKey, toProofIndex, fromProofIndex);
    }

    /*
     * A user should submit an epoch key proof and get a proof index
     * @param _input The epoch key proof and the public signals
     */
    function submitEpochKeyProof(EpochKeyProof memory _input) external {
        bytes32 proofNullifier = Hasher.hashEpochKeyProof(_input);
        verifyProofNullilier(proofNullifier);
        require(
            _input.epoch == currentEpoch,
            "Unirep: submit an epoch key proof with incorrect epoch"
        );
        require(
            _input.epochKey <= maxEpochKey,
            "Unirep: invalid epoch key range"
        );

        // emit proof event
        uint256 _proofIndex = proofIndex;
        emit IndexedEpochKeyProof(
            _proofIndex,
            currentEpoch,
            _input.epochKey,
            _input
        );
        getProofIndex[proofNullifier] = _proofIndex;
        proofIndex++;
    }

    /*
     * An attester submit the airdrop attestation to an epoch key with a sign up proof
     * @param attestation The attestation that the attester wants to send to the epoch key
     * @param _input The epoch key and its proof and the public signals
     */
    function airdropEpochKey(SignUpProof memory _input) external payable {
        bytes32 proofNullifier = Hasher.hashSignUpProof(_input);
        address sender = msg.sender;
        verifyProofNullilier(proofNullifier);
        verifyAstesterSignUp(sender);
        verifyAttesterIndex(sender, _input.attesterId);
        verifyAttesterFee();

        require(
            _input.epoch == currentEpoch,
            "Unirep: submit an airdrop proof with incorrect epoch"
        );
        require(
            _input.epochKey <= maxEpochKey,
            "Unirep: invalid epoch key range"
        );

        // Add to the cumulated attesting fee
        collectedAttestingFee = collectedAttestingFee.add(msg.value);

        // attestation of airdrop
        Attestation memory attestation;
        attestation.attesterId = attesters[msg.sender];
        attestation.posRep = airdropAmount[msg.sender];
        attestation.signUp = 1;

        uint256 _proofIndex = proofIndex;
        // emit proof event
        emit IndexedUserSignedUpProof(
            _proofIndex,
            currentEpoch,
            _input.epochKey,
            _input
        );
        // Process attestation
        emitAttestationEvent(
            msg.sender,
            attestation,
            _input.epochKey,
            _proofIndex,
            0,
            AttestationEvent.Airdrop
        );
        getProofIndex[proofNullifier] = _proofIndex;
        proofIndex++;
    }

    /*
     * A user spend reputation via an attester, the non-zero nullifiers will be processed as a negative attestation
     * @param _input The epoch key and its proof and the public signals
     */
    function spendReputation(ReputationProof memory _input) external payable {
        bytes32 proofNullifier = Hasher.hashReputationProof(_input);

        verifyProofNullilier(proofNullifier); 
        verifyAstesterSignUp(msg.sender);
        verifyAttesterIndex(msg.sender, _input.attesterId);
        verifyAttesterFee();

        require(
            _input.repNullifiers.length == maxReputationBudget,
            "Unirep: invalid number of reputation nullifiers"
        );
        require(
            _input.epoch == currentEpoch,
            "Unirep: submit a reputation proof with incorrect epoch"
        );
        require(
            attesters[msg.sender] == _input.attesterId,
            "Unirep: incorrect attester ID in the reputation proof"
        );
        require(
            _input.epochKey <= maxEpochKey,
            "Unirep: invalid epoch key range"
        );

        // Add to the cumulated attesting fee
        collectedAttestingFee = collectedAttestingFee.add(msg.value);

        // attestation of spending reputation
        Attestation memory attestation;
        attestation.attesterId = attesters[msg.sender];
        attestation.negRep = _input.proveReputationAmount;

        uint256 _proofIndex = proofIndex;
        // emit proof event
        emit IndexedReputationProof(
            _proofIndex,
            currentEpoch,
            _input.epochKey,
            _input
        );
        // Process attestation
        emitAttestationEvent(
            msg.sender,
            attestation,
            _input.epochKey,
            _proofIndex,
            0,
            AttestationEvent.SpendReputation
        );
        getProofIndex[proofNullifier] = _proofIndex;
        proofIndex++;
    }

    function emitAttestationEvent(
        address attester,
        Attestation memory attestation,
        uint256 epochKey,
        uint256 toProofIndex,
        uint256 fromProofIndex,
        AttestationEvent _event
    ) internal {
        // Validate attestation data
        require(
            isSNARKField(attestation.posRep),
            "Unirep: invalid attestation posRep"
        );
        require(
            isSNARKField(attestation.negRep),
            "Unirep: invalid attestation negRep"
        );
        require(
            isSNARKField(attestation.graffiti),
            "Unirep: invalid attestation graffiti"
        );

        // Emit epoch key proof with attestation submitted event
        // And user can verify if the epoch key is valid or not
        emit Sequencer(currentEpoch, Event.AttestationSubmitted);
        emit AttestationSubmitted(
            currentEpoch,
            epochKey,
            attester,
            _event,
            attestation,
            toProofIndex,
            fromProofIndex
        );
    }

    function beginEpochTransition() external {
        uint256 initGas = gasleft();

        require(
            block.timestamp - latestEpochTransitionTime >= epochLength,
            "Unirep: epoch not yet ended"
        );

        // Mark epoch transitioned as complete and increase currentEpoch
        emit Sequencer(currentEpoch, Event.EpochEnded);
        emit EpochEnded(currentEpoch);

        latestEpochTransitionTime = block.timestamp;
        currentEpoch++;

        uint256 gasUsed = initGas.sub(gasleft());
        epochTransitionCompensation[msg.sender] = epochTransitionCompensation[
            msg.sender
        ].add(gasUsed.mul(tx.gasprice));
    }

    function startUserStateTransition(
        uint256 _blindedUserState,
        uint256 _blindedHashChain,
        uint256 _globalStateTree,
        uint256[8] calldata _proof
    ) external {
        bytes32 proofNullifier = Hasher.hashStartTransitionProof(
            _blindedUserState,
            _blindedHashChain,
            _globalStateTree,
            _proof
        );

        verifyProofNullilier(proofNullifier); 

        uint256 _proofIndex = proofIndex;
        emit IndexedStartedTransitionProof(
            _proofIndex,
            _blindedUserState,
            _globalStateTree,
            _blindedHashChain,
            _proof
        );
        getProofIndex[proofNullifier] = _proofIndex;
        proofIndex++;
    }

    function processAttestations(
        uint256 _outputBlindedUserState,
        uint256 _outputBlindedHashChain,
        uint256 _inputBlindedUserState,
        uint256[8] calldata _proof
    ) external {
        bytes32 proofNullifier = Hasher.hashProcessAttestationsProof(
            _outputBlindedUserState,
            _outputBlindedHashChain,
            _inputBlindedUserState,
            _proof
        );

        verifyProofNullilier(proofNullifier);
        uint256 _proofIndex = proofIndex;
        emit IndexedProcessedAttestationsProof(
            _proofIndex,
            _inputBlindedUserState,
            _outputBlindedUserState,
            _outputBlindedHashChain,
            _proof
        );
        getProofIndex[proofNullifier] = _proofIndex;
        proofIndex++;
    }

    function updateUserStateRoot(
        UserTransitionProof memory _proof,
        uint256[] memory proofIndexRecords
    ) external {
        bytes32 proofNullifier = Hasher.hashUserStateTransitionProof(_proof);
        
        verifyProofNullilier(proofNullifier);
        // NOTE: this impl assumes all attestations are processed in a single snark.
        require(
            _proof.transitionFromEpoch < currentEpoch,
            "Can not transition from epoch that's greater or equal to current epoch"
        );
        require(
            _proof.epkNullifiers.length == numEpochKeyNoncePerEpoch,
            "Unirep: invalid number of epk nullifiers"
        );
        require(
            _proof.blindedUserStates.length == 2,
            "Unirep: invalid number of blinded user states"
        );
        require(
            _proof.blindedHashChains.length == numEpochKeyNoncePerEpoch,
            "Unirep: invalid number of blinded hash chains"
        );
        for (uint256 i = 0; i < proofIndexRecords.length; i++) {
            require(
                proofIndexRecords[i] != 0 &&
                    (proofIndexRecords[i] < proofIndex),
                "Unirep: invalid proof index"
            );
        }

        uint256 _proofIndex = proofIndex;
        emit Sequencer(currentEpoch, Event.UserStateTransitioned);
        emit IndexedUserStateTransitionProof(
            _proofIndex,
            _proof,
            proofIndexRecords
        );
        emit UserStateTransitioned(
            currentEpoch,
            _proof.newGlobalStateTreeLeaf,
            _proofIndex
        );

        getProofIndex[proofNullifier] = _proofIndex;
        proofIndex++;
    }

    function verifyEpochKeyValidity(EpochKeyProof memory _input)
        external
        view
        returns (bool)
    {
        // Before attesting to a given epoch key, an attester must verify validity of the epoch key:
        // 1. user has signed up
        // 2. nonce is no greater than numEpochKeyNoncePerEpoch
        // 3. user has transitioned to the epoch(by proving membership in the globalStateTree of that epoch)
        // 4. epoch key is correctly computed

        uint256[] memory _publicSignals = new uint256[](3);
        _publicSignals[0] = _input.globalStateTree;
        _publicSignals[1] = _input.epoch;
        _publicSignals[2] = _input.epochKey;

        // Ensure that each public input is within range of the snark scalar
        // field.
        // TODO: consider having more granular revert reasons
         require(
            isValidSignals(_publicSignals), 
            "Unirep: invalid public signals when verifyEpochKeyValidity"
        ); 

        ProofsRelated memory proof;
        // Unpack the snark proof
        (proof.a, proof.b, proof.c) = unpackProof(_input.proof);

        // Verify the proof
        proof.isValid = epkValidityVerifier.verifyProof(
            proof.a,
            proof.b,
            proof.c,
            _publicSignals
        );
        return proof.isValid;
    }

    function verifyStartTransitionProof(
        uint256 _blindedUserState,
        uint256 _blindedHashChain,
        uint256 _GSTRoot,
        uint256[8] calldata _proof
    ) external view returns (bool) {
        uint256[] memory _publicSignals = new uint256[](3);
        _publicSignals[0] = _blindedUserState;
        _publicSignals[1] = _blindedHashChain;
        _publicSignals[2] = _GSTRoot;

        // Ensure that each public input is within range of the snark scalar
        // field.
        // TODO: consider having more granular revert reasons
        require(
            isValidSignals(_publicSignals), 
            "Unirep: invalid public signals when verify StartTransition Proof"
        );

        ProofsRelated memory proof;
        // Unpack the snark proof
        (proof.a, proof.b, proof.c) = unpackProof(_proof);

        // Verify the proof
        proof.isValid = startTransitionVerifier.verifyProof(
            proof.a,
            proof.b,
            proof.c,
            _publicSignals
        );
        return proof.isValid;
    }

    function verifyProcessAttestationProof(
        uint256 _outputBlindedUserState,
        uint256 _outputBlindedHashChain,
        uint256 _inputBlindedUserState,
        uint256[8] calldata _proof
    ) external view returns (bool) {
        uint256[] memory _publicSignals = new uint256[](3);
        _publicSignals[0] = _outputBlindedUserState;
        _publicSignals[1] = _outputBlindedHashChain;
        _publicSignals[2] = _inputBlindedUserState;

        // Ensure that each public input is within range of the snark scalar
        // field.
       require(
            isValidSignals(_publicSignals), 
            "Unirep: invalid public signals when verify ProcessAttestation Proof"
        );

        ProofsRelated memory proof;
        // Unpack the snark proof
        (proof.a, proof.b, proof.c) = unpackProof(_proof);

        // Verify the proof
        proof.isValid = processAttestationsVerifier.verifyProof(
            proof.a,
            proof.b,
            proof.c,
            _publicSignals
        );
        return proof.isValid;
    }

    function verifyUserStateTransition(UserTransitionProof memory _input)
        external
        view
        returns (bool)
    {
        // Verify validity of new user state:
        // 1. User's identity and state exist in the provided global state tree
        // 2. Global state tree is updated correctly
        // 3. Attestations to each epoch key are processed and processed correctly
        // require(_epkNullifiers.length == numEpochKeyNoncePerEpoch, "Unirep: invalid number of epk nullifiers");

        uint256[] memory _publicSignals = new uint256[](6 + numEpochKeyNoncePerEpoch * 2);
        _publicSignals[0] = _input.newGlobalStateTreeLeaf;
        for (uint8 i = 0; i < numEpochKeyNoncePerEpoch; i++) {
            _publicSignals[i + 1] = _input.epkNullifiers[i];
        }
        _publicSignals[1 + numEpochKeyNoncePerEpoch] = _input.transitionFromEpoch;
        _publicSignals[2 + numEpochKeyNoncePerEpoch] = _input.blindedUserStates[0];
        _publicSignals[3 + numEpochKeyNoncePerEpoch] = _input.blindedUserStates[1];
        _publicSignals[4 + numEpochKeyNoncePerEpoch] = _input.fromGlobalStateTree;
        for (uint8 i = 0; i < numEpochKeyNoncePerEpoch; i++) {
            _publicSignals[5 + numEpochKeyNoncePerEpoch + i] = _input.blindedHashChains[i];
        }
        _publicSignals[5 + numEpochKeyNoncePerEpoch * 2] = _input.fromEpochTree;

        // Ensure that each public input is within range of the snark scalar
        // field.
     
        require(
            isValidSignals(_publicSignals), 
            "Unirep: invalid public signals when verify UserStateTransition"
        );
        
        ProofsRelated memory proof;
        // Unpack the snark proof
        (proof.a, proof.b, proof.c) = unpackProof(_input.proof);

        // Verify the proof
        proof.isValid = userStateTransitionVerifier.verifyProof(
            proof.a,
            proof.b,
            proof.c,
            _publicSignals
        );
        return proof.isValid;
    }

    function verifyReputation(ReputationProof memory _input)
        external
        view
        returns (bool)
    {
        // User prove his reputation by an attester:
        // 1. User exists in GST
        // 2. It is the latest state user transition to
        // 3. (optional) different reputation nullifiers equals to prove reputation amount
        // 4. (optional) (positive reputation - negative reputation) is greater than `_minRep`
        // 5. (optional) hash of graffiti pre-image matches
        uint256[] memory _publicSignals = new uint256[](18);
        for (uint8 i = 0; i < maxReputationBudget; i++) {
            _publicSignals[i] = _input.repNullifiers[i];
        }
        _publicSignals[maxReputationBudget] = _input.epoch;
        _publicSignals[maxReputationBudget + 1] = _input.epochKey;
        _publicSignals[maxReputationBudget + 2] = _input.globalStateTree;
        _publicSignals[maxReputationBudget + 3] = _input.attesterId;
        _publicSignals[maxReputationBudget + 4] = _input.proveReputationAmount;
        _publicSignals[maxReputationBudget + 5] = _input.minRep;
        _publicSignals[maxReputationBudget + 6] = _input.proveGraffiti;
        _publicSignals[maxReputationBudget + 7] = _input.graffitiPreImage;

        // Ensure that each public input is within range of the snark scalar
        // field.

        require(
            isValidSignals(_publicSignals), 
            "Unirep: invalid public signals when verify Reputation"
        );
        
        ProofsRelated memory proof;
        // Unpack the snark proof
        (proof.a, proof.b, proof.c) = unpackProof(_input.proof);

        // Verify the proof
        proof.isValid = reputationVerifier.verifyProof(
            proof.a,
            proof.b,
            proof.c,
            _publicSignals
        );
        return proof.isValid;
    }

    function verifyUserSignUp(SignUpProof memory _input)
        external
        view
        returns (bool)
    {
        // User prove his reputation by an attester:
        // 1. User exists in GST
        // 2. It is the latest state user transition to
        // 3. User has a signUp flag in the attester's leaf
        uint256[] memory _publicSignals = new uint256[](5);
        _publicSignals[0] = _input.epoch;
        _publicSignals[1] = _input.epochKey;
        _publicSignals[2] = _input.globalStateTree;
        _publicSignals[3] = _input.attesterId;
        _publicSignals[4] = _input.userHasSignedUp;

        // Ensure that each public input is within range of the snark scalar
        // field.
        require(
            isValidSignals(_publicSignals), 
            "Unirep: invalid public signals when verify UserSignUp"
        );

        ProofsRelated memory proof;
        // Unpack the snark proof
        (proof.a, proof.b, proof.c) = unpackProof(_input.proof);

        // Verify the proof
        proof.isValid = userSignUpVerifier.verifyProof(
            proof.a,
            proof.b,
            proof.c,
            _publicSignals
        );
        return proof.isValid;
    }
 
    /*
     * A helper function to convert an array of 8 uint256 values into the a, b,
     * and c array values that the zk-SNARK verifier's verifyProof accepts.
     */
    function unpackProof(uint256[8] memory _proof)
        public
        pure
        returns (
            uint256[2] memory,
            uint256[2][2] memory,
            uint256[2] memory
        )
    {
        return (
            [_proof[0], _proof[1]],
            [[_proof[2], _proof[3]], [_proof[4], _proof[5]]],
            [_proof[6], _proof[7]]
        );
    }

    /*
     * Functions to burn fee and collect compenstation.
     * TODO: Should use attester fee, shouldn't burn like this.
     */
    function burnAttestingFee() external {
        uint256 amount = collectedAttestingFee;
        collectedAttestingFee = 0;
        Address.sendValue(payable(address(0)), amount);
    }

    function collectEpochTransitionCompensation() external {
        // NOTE: currently there are no revenue to pay for epoch transition compensation
        uint256 amount = epochTransitionCompensation[msg.sender];
        epochTransitionCompensation[msg.sender] = 0;
        Address.sendValue(payable(msg.sender), amount);
    }
}
