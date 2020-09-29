pragma experimental ABIEncoderV2;
pragma solidity ^0.6.0;

import "./SafeMath.sol";
import { DomainObjs } from './DomainObjs.sol';
import { IncrementalMerkleTree } from "./IncrementalMerkleTree.sol";
import { OneTimeSparseMerkleTree } from "./OneTimeSparseMerkleTree.sol";
import { SnarkConstants } from './SnarkConstants.sol';
import { ComputeRoot } from './ComputeRoot.sol';
import { UnirepParameters } from './UnirepParameters.sol';
import { EpochKeyValidityVerifier } from './EpochKeyValidityVerifier.sol';
import { UserStateTransitionVerifier } from './UserStateTransitionVerifier.sol';
import { ReputationVerifier } from './ReputationVerifier.sol';

contract Unirep is DomainObjs, ComputeRoot, UnirepParameters {
    using SafeMath for uint256;

    // A nothing-up-my-sleeve zero value
    // Should be equal to 16916383162496104613127564537688207714240750091683495371401923915264313510848
    uint256 ZERO_VALUE = uint256(keccak256(abi.encodePacked('Unirep'))) % SNARK_SCALAR_FIELD;

    uint256 constant MAX_EPOCH_KEY_NONCE = 2;

    uint256 constant NUM_ATTESTATIONS_PER_BATCH = 10;

     // Verifier Contracts
    EpochKeyValidityVerifier internal epkValidityVerifier;
    UserStateTransitionVerifier internal userStateTransitionVerifier;
    ReputationVerifier internal reputationVerifier;

    uint256 public currentEpoch = 1;

    uint256 public epochLength;

    uint256 public latestEpochTransitionTime;

    // To store the Merkle root of a tree with 2 **
    // treeDepths.userStateTreeDepth leaves of value 0
    uint256 public emptyUserStateRoot;

    uint256 public emptyGlobalStateTreeRoot;

    // Maximum number of epoch keys allowed for an user to generate in one epoch
    uint8 public maxEpochKeyNonce;

    // The maximum number of signups allowed
    uint256 public maxUsers;

    uint256 public numUserSignUps = 0;

    mapping(uint256 => bool) public hasUserSignedUp;

    // Fee required for submitting an attestation
    uint256 public attestingFee;
    // Attesting fee collected so far
    uint256 public collectedAttestingFee;
    // Mapping of voluteers that execute epoch transition to compensation they earned
    mapping(address => uint256) public epochTransitionCompenstation;

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

    struct EpochKeyList {
        uint256 numKeys;
        mapping(uint256 => uint256) keys;
    }
    // Mpapping of epoch to epoch key list
    mapping(uint256 => EpochKeyList) internal epochKeys;

    TreeDepths public treeDepths;

    // Events
    event NewGSTLeafInserted(
        uint256 indexed _epoch,
        uint256 _hashedLeaf
    );
    event UserSignUp(
        uint256 indexed _epoch,
        uint256 indexed _identityCommitment
    );

    event AttestationSubmitted(
        uint256 indexed _epoch,
        uint256 indexed _epochKey,
        address indexed _attester,
        Attestation attestation
    );

    event EpochEnded(uint256 indexed _epoch, address _epochTreeAddr);

    event UserStateTransitioned(
        uint256 indexed _toEpoch,
        uint256[NUM_ATTESTATIONS_PER_BATCH] _nullifiers,
        uint256 _noAttestationNullifier,
        uint256 _fromEpoch,
        uint256 _fromGlobalStateTree,
        uint256 _fromEpochTree,
        uint256 _fromNullifierTreeRoot,
        uint256[8] _proof
    );

    function getNumEpochKey(uint256 epoch) public view returns (uint256) {
        return epochKeys[epoch].numKeys;
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
        uint256 _epochLength,
        uint256 _attestingFee
    ) public {

        treeDepths = _treeDepths;

        // Set the verifier contracts
        epkValidityVerifier = _epkValidityVerifier;
        userStateTransitionVerifier = _userStateTransitionVerifier;
        reputationVerifier = _reputationVerifier;

        epochLength = _epochLength;
        latestEpochTransitionTime = block.timestamp;

        // Check and store the maximum number of signups
        // It is the user's responsibility to ensure that the state tree depth
        // is just large enough and not more, or they will waste gas.
        uint256 stateTreeMaxLeafIndex = uint256(2) ** _treeDepths.globalStateTreeDepth - 1;
        require(_maxValues.maxUsers <= stateTreeMaxLeafIndex, "Unirep: invalid maxUsers value");
        maxUsers = _maxValues.maxUsers;
        maxEpochKeyNonce = _maxValues.maxEpochKeyNonce;

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

        // Create, hash, and insert a fresh state leaf
        StateLeaf memory stateLeaf = StateLeaf({
            identityCommitment: _identityCommitment,
            userStateRoot: emptyUserStateRoot
        });

        uint256 hashedLeaf = hashStateLeaf(stateLeaf);

        hasUserSignedUp[_identityCommitment] = true;
        numUserSignUps ++;

        emit UserSignUp(currentEpoch, _identityCommitment);
        emit NewGSTLeafInserted(currentEpoch, hashedLeaf);
    }

    function attesterSignUp() external {
        require(attesters[msg.sender] == 0, "Unirep: attester has already signed up");

        attesters[msg.sender] = nextAttesterId;
        nextAttesterId ++;
    }

    function attesterSignUpViaRelayer(address attester, uint8 v, bytes32 r, bytes32 s) external {
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
            ecrecover(messageHash, v, r, s) == attester,
            "Unirep: invalid attester sign up signature"
        );

        attesters[attester] = nextAttesterId;
        nextAttesterId ++;
    }

    function submitAttestation(Attestation calldata attestation, uint256 epochKey) external payable {
        require(attesters[msg.sender] > 0, "Unirep: attester has not signed up yet");
        require(attesters[msg.sender] == attestation.attesterId, "Unirep: mismatched attesterId");
        require(isEpochKeyHashChainSealed[epochKey] == false, "Unirep: hash chain of this epoch key has been sealed");
        require(attestationsMade[epochKey][msg.sender] == false, "Unirep: attester has already attested to this epoch key");
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

        // Initialize the hash chain if it's nonexistent
        uint256 overwriteGraffiti = attestation.overwriteGraffiti ? 1 : 0;
        uint256[] memory attestationData = new uint256[](5);
        attestationData[0] = attestation.attesterId;
        attestationData[1] = attestation.posRep;
        attestationData[2] = attestation.negRep;
        attestationData[3] = attestation.graffiti;
        attestationData[4] = overwriteGraffiti;
        
        epochKeyHashchain[epochKey] = hashLeftRight(
            hash5(attestationData),
            epochKeyHashchain[epochKey]
        );

        attestationsMade[epochKey][msg.sender] = true;

        emit AttestationSubmitted(
            currentEpoch,
            epochKey,
            msg.sender,
            attestation
        );
    }

    function beginEpochTransition() external {
        require(block.timestamp - latestEpochTransitionTime >= epochLength, "Unirep: epoch not yet ended");

        uint256 initGas = gasleft();

        address epochTreeAddr;
        if(epochKeys[currentEpoch].numKeys > 0) {
            epochTreeAddr = finalizeAllAttestations();
        }

        emit EpochEnded(currentEpoch, epochTreeAddr);

        latestEpochTransitionTime = block.timestamp;
        currentEpoch ++;

        uint256 gasUsed = gasleft().sub(initGas);
        epochTransitionCompenstation[msg.sender] = epochTransitionCompenstation[msg.sender].add(gasUsed.mul(tx.gasprice));
    }

    function finalizeAllAttestations() internal returns (address) {
        OneTimeSparseMerkleTree epochTree;
        uint256 epochKey;
        uint256[] memory epochKeyList = new uint256[](epochKeys[currentEpoch].numKeys);
        uint256[] memory epochKeyHashChainList = new uint256[](epochKeys[currentEpoch].numKeys);
        for( uint i = 0; i < epochKeys[currentEpoch].numKeys; i++) {
            // Seal the hash chain of this epoch key
            epochKey = epochKeys[currentEpoch].keys[i];
            epochKeyHashchain[epochKey] = hashLeftRight(
                1,
                epochKeyHashchain[epochKey]
            );

            epochKeyList[i] = epochKey;
            epochKeyHashChainList[i] = epochKeyHashchain[epochKey];
            isEpochKeyHashChainSealed[epochKey] = true;
        }

        epochTree = new OneTimeSparseMerkleTree(treeDepths.epochTreeDepth, epochKeyList, epochKeyHashChainList);
        return address(epochTree);
    }

    function updateUserStateRoot(
        uint256 _newGlobalStateTreeLeaf,
        uint256[NUM_ATTESTATIONS_PER_BATCH] calldata _nullifiers,
        uint256 _noAttestationNullifier,
        uint256 _transitionFromEpoch,
        uint256 _fromGlobalStateTree,
        uint256 _fromEpochTree,
        uint256 _fromNullifierTreeRoot,
        uint256[8] calldata _proof) external {
        // NOTE: this impl assumes all attestations are processed in a single snark.

        emit UserStateTransitioned(
            currentEpoch,
            _nullifiers,
            _noAttestationNullifier,
            _transitionFromEpoch,
            _fromGlobalStateTree,
            _fromEpochTree,
            _fromNullifierTreeRoot,
            _proof
        );
        emit NewGSTLeafInserted(currentEpoch, _newGlobalStateTreeLeaf);

    }

    function verifyEpochKeyValidity(
        uint256 _globalStateTree,
        uint256 _epoch,
        uint256 _epochKey,
        uint256[8] calldata _proof) external view returns (bool) {
        // Before attesting to a given epoch key, an attester must verify validity of the epoch key:
        // 1. user has signed up
        // 2. nonce is no greater than maxEpochKeyNonce
        // 3. user has transitioned to the epoch(by proving membership in the globalStateTree of that epoch)
        // 4. epoch key is correctly computed

        uint256[] memory publicSignals = new uint256[](4);
        publicSignals[0] = _globalStateTree;
        publicSignals[1] = maxEpochKeyNonce;
        publicSignals[2] = _epoch;
        publicSignals[3] = _epochKey;

        // Ensure that each public input is within range of the snark scalar
        // field.
        // TODO: consider having more granular revert reasons
        for (uint8 i = 0; i < publicSignals.length; i++) {
            require(
                publicSignals[i] < SNARK_SCALAR_FIELD,
                "Unirep: each public signal must be lt the snark scalar field"
            );
        }

        ProofsRelated memory proof;
        // Unpack the snark proof
        (
            proof.a,
            proof.b,
            proof.c
        ) = unpackProof(_proof);

        // Verify the proof
        proof.isValid = epkValidityVerifier.verifyProof(proof.a, proof.b, proof.c, publicSignals);
        return proof.isValid;
    }

    function verifyUserStateTransition(
        uint256 _newGlobalStateTreeLeaf,
        uint256[NUM_ATTESTATIONS_PER_BATCH] calldata _nullifiers,
        uint256 _noAttestationNullifier,
        uint256 _transitionFromEpoch,
        uint256 _fromGlobalStateTree,
        uint256 _fromEpochTree,
        uint256 _fromNullifierTreeRoot,
        uint256[8] calldata _proof) external view returns (bool) {
        // Verify validity of new user state:
        // 1. User's identity and state exist in the provided global state tree
        // 2. Global state tree is updated correctly
        // 3. Attestations to each epoch key are processed and processed correctly
        // 4. Nullifiers of all processed attestations match
        // 5. Nullifiers of all processed attestations have not been seen before

        uint256[] memory publicSignals = new uint256[](7 + NUM_ATTESTATIONS_PER_BATCH);
        publicSignals[0] = _newGlobalStateTreeLeaf;
        for (uint8 i = 0; i < _nullifiers.length; i++) {
            publicSignals[i + 1] = _nullifiers[i];
        }
        publicSignals[2 + NUM_ATTESTATIONS_PER_BATCH - 1] = _noAttestationNullifier;
        publicSignals[3 + NUM_ATTESTATIONS_PER_BATCH - 1] = _transitionFromEpoch;
        publicSignals[4 + NUM_ATTESTATIONS_PER_BATCH - 1] = MAX_EPOCH_KEY_NONCE;
        publicSignals[5 + NUM_ATTESTATIONS_PER_BATCH - 1] = _fromGlobalStateTree;
        publicSignals[6 + NUM_ATTESTATIONS_PER_BATCH - 1] = _fromEpochTree;
        publicSignals[7 + NUM_ATTESTATIONS_PER_BATCH - 1] = _fromNullifierTreeRoot;

        // Ensure that each public input is within range of the snark scalar
        // field.
        // TODO: consider having more granular revert reasons
        for (uint8 i = 0; i < publicSignals.length; i++) {
            require(
                publicSignals[i] < SNARK_SCALAR_FIELD,
                "Unirep: each public signal must be lt the snark scalar field"
            );
        }

        ProofsRelated memory proof;
        // Unpack the snark proof
        (
            proof.a,
            proof.b,
            proof.c
        ) = unpackProof(_proof);

        // Verify the proof
        proof.isValid = userStateTransitionVerifier.verifyProof(proof.a, proof.b, proof.c, publicSignals);
        return proof.isValid;
    }

    function verifyReputation(
        uint256 _globalStateTree,
        uint256 _attesterId,
        uint256 _min_pos_rep,
        uint256 _max_neg_rep,
        uint256 _graffiti_pre_image,
        uint256[8] calldata _proof) external view returns (bool) {
        // User prove his reputation by an attester:
        // 1. positive reputation is greater than `_min_pos_rep`
        // 2. negative reputation is less than `_max_neg_rep`
        // 3. hash of graffiti pre-image matches

        uint256[] memory publicSignals = new uint256[](5);
        publicSignals[0] = _globalStateTree;
        publicSignals[1] = _attesterId;
        publicSignals[2] = _min_pos_rep;
        publicSignals[3] = _max_neg_rep;
        publicSignals[4] = _graffiti_pre_image;

        // Ensure that each public input is within range of the snark scalar
        // field.
        // TODO: consider having more granular revert reasons
        for (uint8 i = 0; i < publicSignals.length; i++) {
            require(
                publicSignals[i] < SNARK_SCALAR_FIELD,
                "Unirep: each public signal must be lt the snark scalar field"
            );
        }

        ProofsRelated memory proof;
        // Unpack the snark proof
        (
            proof.a,
            proof.b,
            proof.c
        ) = unpackProof(_proof);

        // Verify the proof
        proof.isValid = reputationVerifier.verifyProof(proof.a, proof.b, proof.c, publicSignals);
        return proof.isValid;
    }

    /*
     * A helper function to convert an array of 8 uint256 values into the a, b,
     * and c array values that the zk-SNARK verifier's verifyProof accepts.
     */
    function unpackProof(
        uint256[8] memory _proof
    ) public pure returns (
        uint256[2] memory,
        uint256[2][2] memory,
        uint256[2] memory
    ) {

        return (
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
            userStateRoot: emptyUserStateRoot
        });

        return hashStateLeaf(stateLeaf);
    }

    function calcEmptyUserStateTreeRoot(uint8 _levels) internal pure returns (uint256) {
        uint256[] memory defaultStateLeafValues = new uint256[](5);
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

    /*
     * Functions to burn fee and collect compenstation.
     */
    function burnAttestingFee() external {
        uint256 amount = collectedAttestingFee;
        collectedAttestingFee = 0;
        address(0).call{value: amount};
    }

    function collectEpochTransitionCompenstation() external {
        uint256 amount = epochTransitionCompenstation[msg.sender];
        epochTransitionCompenstation[msg.sender] = 0;
        msg.sender.call{value: amount};
    }
}