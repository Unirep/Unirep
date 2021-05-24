pragma abicoder v2;
pragma solidity 0.7.6;

import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import { DomainObjs } from './DomainObjs.sol';
import { SnarkConstants } from './SnarkConstants.sol';
import { ComputeRoot } from './ComputeRoot.sol';
import { UnirepParameters } from './UnirepParameters.sol';
import { EpochKeyValidityVerifier } from './EpochKeyValidityVerifier.sol';
import { UserStateTransitionVerifier } from './UserStateTransitionVerifier.sol';
import { ReputationVerifier } from './ReputationVerifier.sol';
import { ReputationFromAttesterVerifier } from './ReputationFromAttesterVerifier.sol';

contract Unirep is DomainObjs, ComputeRoot, UnirepParameters {
    using SafeMath for uint256;

    // A nothing-up-my-sleeve zero value
    // Should be equal to 16916383162496104613127564537688207714240750091683495371401923915264313510848
    uint256 ZERO_VALUE = uint256(keccak256(abi.encodePacked('Unirep'))) % SNARK_SCALAR_FIELD;

    // Verifier Contracts
    EpochKeyValidityVerifier internal epkValidityVerifier;
    UserStateTransitionVerifier internal userStateTransitionVerifier;
    ReputationVerifier internal reputationVerifier;
    ReputationFromAttesterVerifier internal reputationFromAttesterVerifier;

    uint256 public currentEpoch = 1;

    uint256 immutable public epochLength;

    uint256 public latestEpochTransitionTime;

    // To store the Merkle root of a tree with 2 **
    // treeDepths.userStateTreeDepth leaves of value 0
    uint256 public emptyUserStateRoot;

    uint256 immutable public emptyGlobalStateTreeRoot;

    // Maximum number of epoch keys allowed for an user to generate in one epoch
    uint8 immutable public numEpochKeyNoncePerEpoch;

    uint8 immutable public numAttestationsPerEpochKey;

    uint8 immutable public numAttestationsPerEpoch;

    // The maximum number of signups allowed
    uint256 immutable public maxUsers;

    enum actionChoices { UpVote, DownVote, Post, Comment }

    // The default given karma when users sign up
    uint256 immutable public defaultKarma = 20;

    // The amount of karma required to publish a post
    uint256 immutable public postKarma = 10;

    // The amount of karma required to submit a comment 
    uint256 immutable public commentKarma = 5;

    // The amount of karma airdropped to user after user state transition
    uint256 immutable public airdroppedKarma = 20;

    uint256 public numUserSignUps = 0;

    uint256 public nextGSTLeafIndex = 0;

    mapping(uint256 => bool) public hasUserSignedUp;

    // Fee required for submitting an attestation
    uint256 immutable public attestingFee;
    // Attesting fee collected so far
    uint256 public collectedAttestingFee;
    // Mapping of voluteers that execute epoch transition to compensation they earned
    mapping(address => uint256) public epochTransitionCompensation;

    // A mapping between each attesters’ Ethereum address and their attester ID.
    // Attester IDs are incremental and start from 1.
    // No attesters with and ID of 0 should exist.
    mapping(address => uint256) public attesters;

    uint256 public nextAttesterId = 1;

    // Keep track of whether an attester has attested to an epoch key
    mapping(uint256 => mapping(address => bool)) public attestationsMade;

    // Indicate if hash chain of an epoch key is sealed
    mapping(uint256 => bool) public isEpochKeyHashChainSealed;

    // Mapping between epoch key and hashchain of attestations which attest to the epoch key
    mapping(uint256 => uint256) public epochKeyHashchain;
    // Mapping of epoch key and the number of attestations to the epoch key
    // This is used to limit number of attestations per epoch key
    mapping(uint256 => uint8) public numAttestationsToEpochKey;

    // Indicate if the karma nullifiers is submitted
    mapping(uint256 => bool) public isKarmaNullifierSubmitted;

    struct EpochKeyList {
        uint256 numKeys;
        mapping(uint256 => uint256) keys;
        uint256 numSealedKeys;
    }
    // Mpapping of epoch to epoch key list
    mapping(uint256 => EpochKeyList) internal epochKeys;

    TreeDepths public treeDepths;


    // Events
    event Sequencer(
        string _event
    );

    event NewGSTLeafInserted(
        uint256 indexed _epoch,
        uint256 _leafIndex,
        uint256 _hashedLeaf
    );

    event PostSubmitted(
        uint256 indexed _epoch,
        uint256 indexed _postId,
        uint256 indexed _epochKey,
        string _hahsedContent,
        ProofsRelated proof
    );

    event CommentSubmitted(
        uint256 indexed _epoch,
        uint256 indexed _commentId,
        uint256 indexed _epochKey,
        uint256 _postId,
        string _hahsedContent,
        ProofsRelated proof
    );

    event ReputationNullifierSubmitted(
        uint256 indexed _epoch,
        actionChoices actionChoice,
        uint256[] karmaNullifiers
    );

    event AttestationSubmitted(
        uint256 indexed _epoch,
        uint256 indexed _epochKey,
        address indexed _attester,
        Attestation attestation
    );

    event EpochEnded(uint256 indexed _epoch);

    event UserStateTransitioned(
        uint256 indexed _toEpoch,
        uint256 _leafIndex,
        UserTransitionedRelated userTransitionedData
    );


    function getNumEpochKey(uint256 epoch) public view returns (uint256) {
        return epochKeys[epoch].numKeys;
    }

    function getNumSealedEpochKey(uint256 epoch) public view returns (uint256) {
        return epochKeys[epoch].numSealedKeys;
    }

    function getEpochKey(uint256 epoch, uint256 index) public view returns (uint256) {
        require(index < epochKeys[epoch].numKeys, "Unirep: epoch key list access out of bound");
        return epochKeys[epoch].keys[index];
    }


    constructor(
        TreeDepths memory _treeDepths,
        MaxValues memory _maxValues,
        EpochKeyValidityVerifier _epkValidityVerifier,
        UserStateTransitionVerifier _userStateTransitionVerifier,
        ReputationVerifier _reputationVerifier,
        ReputationFromAttesterVerifier _reputationFromAttesterVerifier,
        uint8 _numEpochKeyNoncePerEpoch,
        uint8 _numAttestationsPerEpochKey,
        uint256 _epochLength,
        uint256 _attestingFee
    ) public {

        treeDepths = _treeDepths;

        // Set the verifier contracts
        epkValidityVerifier = _epkValidityVerifier;
        userStateTransitionVerifier = _userStateTransitionVerifier;
        reputationVerifier = _reputationVerifier;
        reputationFromAttesterVerifier = _reputationFromAttesterVerifier;

        numEpochKeyNoncePerEpoch = _numEpochKeyNoncePerEpoch;
        numAttestationsPerEpochKey = _numAttestationsPerEpochKey;
        numAttestationsPerEpoch = _numEpochKeyNoncePerEpoch * _numAttestationsPerEpochKey;
        epochLength = _epochLength;
        latestEpochTransitionTime = block.timestamp;

        // Check and store the maximum number of signups
        // It is the user's responsibility to ensure that the state tree depth
        // is just large enough and not more, or they will waste gas.
        uint256 stateTreeMaxLeafIndex = uint256(2) ** _treeDepths.globalStateTreeDepth - 1;
        require(_maxValues.maxUsers <= stateTreeMaxLeafIndex, "Unirep: invalid maxUsers value");
        maxUsers = _maxValues.maxUsers;

        // Calculate and store the empty user state tree root. This value must
        // be set before we compute empty global state tree root later
        emptyUserStateRoot = calcEmptyUserStateTreeRoot(_treeDepths.userStateTreeDepth);

        emptyGlobalStateTreeRoot = calcEmptyGlobalStateTreeRoot(_treeDepths.globalStateTreeDepth);

        attestingFee = _attestingFee;
    }

    /*
     * User signs up by providing an identity commitment. It also inserts a fresh state
     * leaf into the state tree.
     * @param _identityCommitment Commitment of the user's identity which is a semaphore identity.
     */
    function userSignUp(uint256 _identityCommitment) external {
        require(hasUserSignedUp[_identityCommitment] == false, "Unirep: the user has already signed up");
        require(numUserSignUps < maxUsers, "Unirep: maximum number of signups reached");
        
        // Compute hashed leaf
        StateLeaf memory stateLeaf;
        stateLeaf.identityCommitment = _identityCommitment;
        stateLeaf.userStateRoot = emptyUserStateRoot;
        stateLeaf.positiveKarma = defaultKarma;
        stateLeaf.negativeKarma = 0;
        uint256 hashedLeaf = hashStateLeaf(stateLeaf);

        hasUserSignedUp[_identityCommitment] = true;
        numUserSignUps ++;

        emit Sequencer("UserSignUp");
        emit NewGSTLeafInserted(currentEpoch, nextGSTLeafIndex ,hashedLeaf);

        nextGSTLeafIndex ++;
    }

    function attesterSignUp() external {
        require(attesters[msg.sender] == 0, "Unirep: attester has already signed up");

        attesters[msg.sender] = nextAttesterId;
        nextAttesterId ++;
    }

    function attesterSignUpViaRelayer(address attester, bytes calldata signature) external {
        require(attesters[attester] == 0, "Unirep: attester has already signed up");

        // Attester signs over it's own address concatenated with this contract address
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(
                    abi.encodePacked(attester, this)
                )
            )
        );
        require(
            ECDSA.recover(messageHash, signature) == attester,
            "Unirep: invalid attester sign up signature"
        );

        attesters[attester] = nextAttesterId;
        nextAttesterId ++;
    }

    function spendReputation(
        uint256 epochKey,
        ProofsRelated memory proof,
        uint256[] memory karmaNullifiers,
        uint256 spendReputationAmount,
        actionChoices actionChoice
    ) internal {
        // Determine if karma nullifiers are submitted before
        for (uint i = 0; i < spendReputationAmount; i++) {
            require(isKarmaNullifierSubmitted[karmaNullifiers[i]] == false, "Unirep: the nullifier has been submitted");
            isKarmaNullifierSubmitted[karmaNullifiers[i]] = true;
        }

        // Verify the proof
        proof.isValid = reputationVerifier.verifyProof(proof.a, proof.b, proof.c, proof.publicSignals);
        require(proof.isValid, "Unirep: the proof is not valid");

        // Verify epoch key and its proof
        // Then submit negative attestation to this epoch key
        Attestation memory attestation;
        attestation.attesterId = attesters[msg.sender];
        attestation.posRep = 0;
        attestation.negRep = spendReputationAmount;
        attestation.graffiti = 0;
        attestation.overwriteGraffiti = false;
        submitAttestation(attestation, epochKey);

        emit Sequencer("ReputationNullifierSubmitted");
        emit ReputationNullifierSubmitted(
            currentEpoch,
            actionChoice,
            karmaNullifiers
        );
    }

    function publishPost(
        uint256 postId, 
        uint256 epochKey, 
        string calldata hashedContent, 
        uint256[] calldata _publicSignals, 
        uint256[8] calldata _proof,
        uint256[] calldata karmaNullifiers) external payable {

        ProofsRelated memory proof;
        // Unpack the snark proof
        (   
            proof.publicSignals,
            proof.a,
            proof.b,
            proof.c
        ) = unpackProof(_publicSignals, _proof);

        spendReputation(epochKey, proof, karmaNullifiers, postKarma, actionChoices.Post);
        
        emit Sequencer("PostSubmitted");
        emit PostSubmitted(
            currentEpoch,
            postId,
            epochKey,
            hashedContent,
            proof
        );
    }

    function leaveComment(
        uint256 postId, 
        uint256 commentId,
        uint256 epochKey, 
        string calldata hashedContent, 
        uint256[] calldata _publicSignals, 
        uint256[8] calldata _proof,
        uint256[] calldata karmaNullifiers) external payable {

        ProofsRelated memory proof;
        // Unpack the snark proof
        (   
            proof.publicSignals,
            proof.a,
            proof.b,
            proof.c
        ) = unpackProof(_publicSignals, _proof);

        spendReputation(epochKey, proof, karmaNullifiers, commentKarma, actionChoices.Comment);
    
        emit Sequencer("CommentSubmitted");
        emit CommentSubmitted(
            currentEpoch,
            commentId,
            epochKey,
            postId,
            hashedContent,
            proof
        );
    }

    function vote(
        Attestation calldata attestation,
        uint256 toEpochKey,
        uint256 fromEpochKey,
        uint256[] calldata _publicSignals, 
        uint256[8] calldata _proof,
        uint256[] calldata karmaNullifiers) external payable {
        require((attestation.posRep + attestation.negRep) > 0, "Unirep: should submit a positive vote value");
        require(attestation.posRep * attestation.negRep == 0, "Unirep: should only choose to upvote or to downvote");

        ProofsRelated memory proof;
        // Unpack the snark proof
        (   
            proof.publicSignals,
            proof.a,
            proof.b,
            proof.c
        ) = unpackProof(_publicSignals, _proof);

        actionChoices action;
        if(attestation.posRep > 0){
            action = actionChoices.UpVote;
        } else{
            action = actionChoices.DownVote;
        }

        // Spend attester's reputation
        spendReputation(fromEpochKey, proof, karmaNullifiers, attestation.posRep + attestation.negRep, action);

        // Send Reputation to others
        submitAttestation(attestation, toEpochKey);
    }

    function submitAttestation(
        Attestation memory attestation,
        uint256 epochKey ) public payable {
        require(attesters[msg.sender] > 0, "Unirep: attester has not signed up yet");
        require(attesters[msg.sender] == attestation.attesterId, "Unirep: mismatched attesterId");
        require(isEpochKeyHashChainSealed[epochKey] == false, "Unirep: hash chain of this epoch key has been sealed");
        require(attestationsMade[epochKey][msg.sender] == false, "Unirep: attester has already attested to this epoch key");
        require(numAttestationsToEpochKey[epochKey] < numAttestationsPerEpochKey, "Unirep: no more attestations to the epoch key is allowed");
        require(msg.value == attestingFee, "Unirep: no attesting fee or incorrect amount");

        // Before attesting to a given epoch key, an attester must
        // verify validity of the epoch key using `verifyEpochKeyValidity` function.

        // Add to the cumulated attesting fee
        collectedAttestingFee = collectedAttestingFee.add(msg.value);

        // Add the epoch key to epoch key list of current epoch
        // if it is been attested to the first time.
        uint256 index;
        if(epochKeyHashchain[epochKey] == 0) {
            index = epochKeys[currentEpoch].numKeys;
            epochKeys[currentEpoch].keys[index] = epochKey;
            epochKeys[currentEpoch].numKeys ++;
        }

        // Validate attestation data
        require(attestation.posRep < SNARK_SCALAR_FIELD, "Unirep: invalid attestation posRep");
        require(attestation.negRep < SNARK_SCALAR_FIELD, "Unirep: invalid attestation negRep");
        require(attestation.graffiti < SNARK_SCALAR_FIELD, "Unirep: invalid attestation graffiti");
        
        epochKeyHashchain[epochKey] = hashLeftRight(
            hashAttestation(attestation),
            epochKeyHashchain[epochKey]
        );
        numAttestationsToEpochKey[epochKey] += 1;

        attestationsMade[epochKey][msg.sender] = true;

        emit Sequencer("AttestationSubmitted");
        emit AttestationSubmitted(
            currentEpoch,
            epochKey,
            msg.sender,
            attestation
        );
    }

    function beginEpochTransition(uint256 numEpochKeysToSeal) external {
        uint256 initGas = gasleft();

        require(block.timestamp - latestEpochTransitionTime >= epochLength, "Unirep: epoch not yet ended");

        uint256 epochKey;
        uint256 startKeyIndex = epochKeys[currentEpoch].numSealedKeys;
        uint256 endKeyIndex = min(epochKeys[currentEpoch].numKeys, startKeyIndex.add(numEpochKeysToSeal));
        for (uint i = startKeyIndex; i < endKeyIndex; i++) {
            // Seal the hash chain of this epoch key
            epochKey = epochKeys[currentEpoch].keys[i];
            epochKeyHashchain[epochKey] = hashLeftRight(
                1,
                epochKeyHashchain[epochKey]
            );
            isEpochKeyHashChainSealed[epochKey] = true;
        }
        epochKeys[currentEpoch].numSealedKeys = endKeyIndex;

        // Mark epoch transitioned as complete if hash chain of all epoch keys are sealed
        if(endKeyIndex == epochKeys[currentEpoch].numKeys) {
            emit Sequencer("EpochEnded");
            emit EpochEnded(currentEpoch);

            latestEpochTransitionTime = block.timestamp;
            currentEpoch ++;
            nextGSTLeafIndex = 0;
        }

        uint256 gasUsed = initGas.sub(gasleft());
        epochTransitionCompensation[msg.sender] = epochTransitionCompensation[msg.sender].add(gasUsed.mul(tx.gasprice));
    }

    function updateUserStateRoot(
        uint256 _newGlobalStateTreeLeaf,
        uint256[] calldata _attestationNullifiers,
        uint256[] calldata _epkNullifiers,
        uint256 _transitionFromEpoch,
        uint256 _fromGlobalStateTree,
        uint256 _fromEpochTree,
        uint256 _fromNullifierTreeRoot,
        uint256[8] calldata _proof) external {
        // NOTE: this impl assumes all attestations are processed in a single snark.
        require(_transitionFromEpoch < currentEpoch, "Can not transition from epoch that's greater or equal to current epoch");
        require(_attestationNullifiers.length == numAttestationsPerEpoch, "Unirep: invalid number of nullifiers");
        require(_epkNullifiers.length == numEpochKeyNoncePerEpoch, "Unirep: invalid number of epk nullifiers");

        UserTransitionedRelated memory userTransitionedData;
        userTransitionedData.fromEpoch = _transitionFromEpoch;
        userTransitionedData.fromGlobalStateTree = _fromGlobalStateTree;
        userTransitionedData.fromEpochTree = _fromEpochTree;
        userTransitionedData.fromNullifierTreeRoot = _fromNullifierTreeRoot;
        userTransitionedData.newGlobalStateTreeLeaf = _newGlobalStateTreeLeaf;
        userTransitionedData.proof = _proof;
        userTransitionedData.attestationNullifiers = _attestationNullifiers;
        userTransitionedData.epkNullifiers = _epkNullifiers;

        emit Sequencer("UserStateTransitioned");
        emit UserStateTransitioned(
            currentEpoch,
            nextGSTLeafIndex,
            userTransitionedData
        );

        nextGSTLeafIndex ++;
        // emit NewGSTLeafInserted(currentEpoch, _newGlobalStateTreeLeaf);

    }

    function verifyEpochKeyValidity(
        // uint256 _globalStateTree,
        // uint256 _epoch,
        // uint256 _epochKey,
        uint256[] memory _publicSignals,
        uint256[8] memory _proof) public view returns (bool) {
        // Before attesting to a given epoch key, an attester must verify validity of the epoch key:
        // 1. user has signed up
        // 2. nonce is no greater than numEpochKeyNoncePerEpoch
        // 3. user has transitioned to the epoch(by proving membership in the globalStateTree of that epoch)
        // 4. epoch key is correctly computed

        // uint256[] memory _publicSignals = new uint256[](3);
        // _publicSignals[0] = _globalStateTree;
        // _publicSignals[1] = _epoch;
        // _publicSignals[2] = _epochKey;

        // Ensure that each public input is within range of the snark scalar
        // field.
        // TODO: consider having more granular revert reasons
        for (uint8 i = 0; i < _publicSignals.length; i++) {
            require(
                _publicSignals[i] < SNARK_SCALAR_FIELD,
                "Unirep: each public signal must be lt the snark scalar field"
            );
        }

        ProofsRelated memory proof;
        // Unpack the snark proof
        (   
            proof.publicSignals,
            proof.a,
            proof.b,
            proof.c
        ) = unpackProof(_publicSignals, _proof);

        // Verify the proof
        proof.isValid = epkValidityVerifier.verifyProof(proof.a, proof.b, proof.c, proof.publicSignals);
        return proof.isValid;
    }

    function verifyUserStateTransition(
        uint256 _newGlobalStateTreeLeaf,
        uint256[] calldata _attestationNullifiers,
        uint256[] calldata _epkNullifiers,
        uint256 _transitionFromEpoch,
        uint256 _fromGlobalStateTree,
        uint256 _fromEpochTree,
        uint256[8] calldata _proof) external view returns (bool) {
        // Verify validity of new user state:
        // 1. User's identity and state exist in the provided global state tree
        // 2. Global state tree is updated correctly
        // 3. Attestations to each epoch key are processed and processed correctly
        // 4. Nullifiers of all processed attestations match
        // 5. Nullifiers of all processed attestations have not been seen before
        require(_attestationNullifiers.length == numAttestationsPerEpoch, "Unirep: invalid number of nullifiers");
        require(_epkNullifiers.length == numEpochKeyNoncePerEpoch, "Unirep: invalid number of epk nullifiers");

        uint256[] memory _publicSignals = new uint256[](5 + numAttestationsPerEpoch + numEpochKeyNoncePerEpoch);
        _publicSignals[0] = _newGlobalStateTreeLeaf;
        for (uint8 i = 0; i < numAttestationsPerEpoch; i++) {
            _publicSignals[i + 1] = _attestationNullifiers[i];
        }
        for (uint8 i = 0; i < numEpochKeyNoncePerEpoch; i++) {
            _publicSignals[i + 1 + numAttestationsPerEpoch] = _epkNullifiers[i];
        }
        _publicSignals[2 + numAttestationsPerEpoch + numEpochKeyNoncePerEpoch - 1] = _transitionFromEpoch;
        _publicSignals[3 + numAttestationsPerEpoch + numEpochKeyNoncePerEpoch - 1] = _fromGlobalStateTree;
        _publicSignals[4 + numAttestationsPerEpoch + numEpochKeyNoncePerEpoch - 1] = airdroppedKarma;
        _publicSignals[5 + numAttestationsPerEpoch + numEpochKeyNoncePerEpoch - 1] = _fromEpochTree;

        // Ensure that each public input is within range of the snark scalar
        // field.
        // TODO: consider having more granular revert reasons
        for (uint8 i = 0; i < _publicSignals.length; i++) {
            require(
                _publicSignals[i] < SNARK_SCALAR_FIELD,
                "Unirep: each public signal must be lt the snark scalar field"
            );
        }

        ProofsRelated memory proof;
        // Unpack the snark proof
        (
            proof.publicSignals,
            proof.a,
            proof.b,
            proof.c
        ) = unpackProof(_publicSignals, _proof);

        // Verify the proof
        proof.isValid = userStateTransitionVerifier.verifyProof(proof.a, proof.b, proof.c, proof.publicSignals);
        return proof.isValid;
    }

    function verifyReputation(
        uint256[] calldata _publicSignals,
        uint256[8] calldata _proof) external view returns (bool) {
        // User prove his reputation by an attester:
        // 1. User exists in GST
        // 2. It is the latest state user transition to
        // 3. positive reputation is greater than `_min_pos_rep`
        // 4. negative reputation is less than `_max_neg_rep`
        // 5. hash of graffiti pre-image matches

        // Ensure that each public input is within range of the snark scalar
        // field.
        // TODO: consider having more granular revert reasons
        for (uint8 i = 0; i < _publicSignals.length; i++) {
            require(
                _publicSignals[i] < SNARK_SCALAR_FIELD,
                "Unirep: each public signal must be lt the snark scalar field"
            );
        }

        ProofsRelated memory proof;
        // Unpack the snark proof
        (
            proof.publicSignals,
            proof.a,
            proof.b,
            proof.c
        ) = unpackProof(_publicSignals, _proof);

        // Verify the proof
        proof.isValid = reputationVerifier.verifyProof(proof.a, proof.b, proof.c, proof.publicSignals);
        return proof.isValid;
    }

    function verifyReputationFromAttester(
        uint256[] calldata _publicSignals,
        uint256[8] calldata _proof) external view returns (bool) {
        // User prove his reputation by an attester:
        // 1. User exists in GST
        // 2. It is the latest state user transition to
        // 3. positive reputation is greater than `_min_pos_rep`
        // 4. negative reputation is less than `_max_neg_rep`
        // 5. hash of graffiti pre-image matches

        // Ensure that each public input is within range of the snark scalar
        // field.
        // TODO: consider having more granular revert reasons
        for (uint8 i = 0; i < _publicSignals.length; i++) {
            require(
                _publicSignals[i] < SNARK_SCALAR_FIELD,
                "Unirep: each public signal must be lt the snark scalar field"
            );
        }

        ProofsRelated memory proof;
        // Unpack the snark proof
        (
            proof.publicSignals,
            proof.a,
            proof.b,
            proof.c
        ) = unpackProof(_publicSignals, _proof);

        // Verify the proof
        proof.isValid = reputationFromAttesterVerifier.verifyProof(proof.a, proof.b, proof.c, proof.publicSignals);
        return proof.isValid;
    }

    function min(uint a, uint b) internal pure returns (uint) {
        if (a > b) {
            return b;
        } else {
            return a;
        }
    }

    /*
     * A helper function to convert an array of 8 uint256 values into the a, b,
     * and c array values that the zk-SNARK verifier's verifyProof accepts.
     */
    function unpackProof(
        uint256[] memory _publicSignals,
        uint256[8] memory _proof
    ) public pure returns (
        uint256[] memory,
        uint256[2] memory,
        uint256[2][2] memory,
        uint256[2] memory
    ) {

        return (
            _publicSignals,
            [_proof[0], _proof[1]],
            [
                [_proof[2], _proof[3]],
                [_proof[4], _proof[5]]
            ],
            [_proof[6], _proof[7]]
        );
    }

    function hashedBlankStateLeaf() public view returns (uint256) {
        StateLeaf memory stateLeaf = StateLeaf({
            identityCommitment: 0,
            userStateRoot: emptyUserStateRoot,
            // DefaultKarma
            positiveKarma: 20,
            negativeKarma: 0
        });

        return hashStateLeaf(stateLeaf);
    }

    function calcEmptyUserStateTreeRoot(uint8 _levels) internal pure returns (uint256) {
        uint256[5] memory defaultStateLeafValues;
        for (uint8 i = 0; i < 5; i++) {
            defaultStateLeafValues[i] = 0;
        }
        uint256 defaultUserStateLeaf = hash5(defaultStateLeafValues);
        return computeEmptyRoot(_levels, defaultUserStateLeaf);
    }

    function calcEmptyGlobalStateTreeRoot(uint8 _levels) internal view returns (uint256) {
        // Compute the hash of a blank state leaf
        uint256 h = hashedBlankStateLeaf();

        return computeEmptyRoot(_levels, h);
    }

    function getEpochTreeLeaves(uint256 epoch) external view returns (uint256[] memory epochKeyList, uint256[] memory epochKeyHashChainList) {
        uint256 epochKey;
        epochKeyList = new uint256[](epochKeys[epoch].numKeys);
        epochKeyHashChainList = new uint256[](epochKeys[epoch].numKeys);
        for (uint i = 0; i < epochKeys[epoch].numKeys; i++) {
            // Seal the hash chain of this epoch key
            epochKey = epochKeys[epoch].keys[i];
            epochKeyList[i] = epochKey;
            epochKeyHashChainList[i] = epochKeyHashchain[epochKey];
        }
    }

    /*
     * Functions to burn fee and collect compenstation.
     */
    function burnAttestingFee() external {
        uint256 amount = collectedAttestingFee;
        collectedAttestingFee = 0;
        Address.sendValue(address(0), amount);
    }

    function collectEpochTransitionCompensation() external {
        // NOTE: currently there are no revenue to pay for epoch transition compensation
        uint256 amount = epochTransitionCompensation[msg.sender];
        epochTransitionCompensation[msg.sender] = 0;
        Address.sendValue(msg.sender, amount);
    }
}