pragma experimental ABIEncoderV2;
pragma solidity ^0.5.0;

import { DomainObjs } from './DomainObjs.sol';
import { IncrementalMerkleTree } from "./IncrementalMerkleTree.sol";
import { SnarkConstants } from './SnarkConstants.sol';
import { ComputeRoot } from './ComputeRoot.sol';
import { UnirepParameters } from './UnirepParameters.sol';
import { EpochKeyValidityVerifier } from './EpochKeyValidityVerifier.sol';
import { Ownable } from "@openzeppelin/contracts/ownership/Ownable.sol";

contract Unirep is Ownable, DomainObjs, ComputeRoot, UnirepParameters {

    // A nothing-up-my-sleeve zero value
    // Should be equal to 16916383162496104613127564537688207714240750091683495371401923915264313510848
    uint256 ZERO_VALUE = uint256(keccak256(abi.encodePacked('Unirep'))) % SNARK_SCALAR_FIELD;

     // Verifier Contracts
    EpochKeyValidityVerifier internal epkValidityVerifier;

    uint256 public currentEpoch = 1;

    uint256 public epochLength;

    uint256 public latestEpochTransitionTime;

    // The mapping of epoch to global state tree
    mapping(uint256 => IncrementalMerkleTree) public globalStateTrees;

    // To store the Merkle root of a tree with 2 **
    // treeDepths.userStateTreeDepth leaves of value 0
    uint256 public emptyUserStateRoot;

    // The maximum number of signups allowed
    uint256 public maxUsers;

    uint256 public numUserSignUps = 0;

    mapping(uint256 => bool) public hasUserSignedUp;

    // Fee required for submitting an attestation
    uint256 public attestingFee;

    // Maximum number of epoch keys allowed for an user to generate in one epoch
    uint8 public maxEpochKeyNonce;

    // A mapping between each attesters’ Ethereum address and their attester ID.
    // Attester IDs are incremental and start from 1.
    // No attesters with and ID of 0 should exist.
    mapping(address => uint256) public attesters;

    uint256 public nextAttesterId = 1;

    // Keep track of whether an attester has attested to an epoch key
    mapping(bytes32 => mapping(address => bool)) public attestationsMade;

    // Mapping between epoch key and hashchain of attestations which attest to the epoch key
    mapping(bytes32 => bytes32) public epochKeyHashchain;

    TreeDepths public treeDepths;

    // Events
    event UserSignUp(
        uint256 indexed _epoch,
        uint256 indexed _identityCommitment,
        uint256 _hashedLeaf
    );

    event AttestationSubmitted(
        bytes32 indexed _epochKey,
        address indexed _attester,
        uint256 _attesterId,
        uint256 _posRep,
        uint256 _negRep,
        uint256 _graffiti,
        bool _overwriteGraffiti
    );

    constructor(
        TreeDepths memory _treeDepths,
        MaxValues memory _maxValues,
        EpochKeyValidityVerifier _epkValidityVerifier,
        uint256 _epochLength,
        uint256 _attestingFee
    ) public Ownable() {

        treeDepths = _treeDepths;

        // Set the verifier contracts
        epkValidityVerifier = _epkValidityVerifier;

        epochLength = _epochLength;
        latestEpochTransitionTime = now;

        // Check and store the maximum number of signups
        // It is the user's responsibility to ensure that the state tree depth
        // is just large enough and not more, or they will waste gas.
        uint256 stateTreeMaxLeafIndex = uint256(2) ** _treeDepths.globalStateTreeDepth - 1;
        require(_maxValues.maxUsers <= stateTreeMaxLeafIndex, "Unirep: invalid maxUsers value");
        maxUsers = _maxValues.maxUsers;
        maxEpochKeyNonce = _maxValues.maxEpochKeyNonce;

        // Calculate and store the empty user state tree root. This value must
        // be set before we call hashedBlankStateLeaf() later
        emptyUserStateRoot = calcEmptyUserStateTreeRoot(_treeDepths.userStateTreeDepth);

        // Compute the hash of a blank state leaf
        uint256 h = hashedBlankStateLeaf();

        // Create a global state tree for first epoch
        globalStateTrees[currentEpoch] = new IncrementalMerkleTree(_treeDepths.globalStateTreeDepth, h);

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

        globalStateTrees[currentEpoch].insertLeaf(hashedLeaf);

        hasUserSignedUp[_identityCommitment] = true;
        numUserSignUps ++;

        emit UserSignUp(currentEpoch, _identityCommitment, hashedLeaf);
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

    function submitAttestation(Attestation calldata attestation, bytes32 epochKey, uint256[8] calldata _proof) external payable {
        require(attesters[msg.sender] > 0, "Unirep: attester has not signed up yet");
        require(attesters[msg.sender] == attestation.attesterId, "Unirep: mismatched attesterId");
        require(attestationsMade[epochKey][msg.sender] == false, "Unirep: attester has already attested to this epoch key");
        require(msg.value == attestingFee, "Unirep: no attesting fee or incorrect amount");

        // Verify validity of the epoch key:
        // 1. epoch matches current epoch
        // 2. nonce is no greater than maxEpochKeyNonce
        // 3. user has signed up
        // 4. user has transitioned to current epoch(by proving membership in current globalStateTrees)
        uint256[2] memory publicSignals = [
            currentEpoch,
            maxEpochKeyNonce
        ];

        // Unpack the snark proof
        (
            uint256[2] memory a,
            uint256[2][2] memory b,
            uint256[2] memory c
        ) = unpackProof(_proof);

        // Verify the proof
        bool isValid = epkValidityVerifier.verifyProof(a, b, c, publicSignals);
        require(isValid == true, "Unirep: invalid epoch key validity proof");

        // Burn the fee
        address(0).transfer(msg.value);

        // Initialize the hash chain if it's nonexistent
        bytes memory packedAttestation = abi.encodePacked(
            attestation.attesterId,
            attestation.posRep,
            attestation.negRep,
            attestation.graffiti,
            attestation.overwriteGraffiti
        );
        epochKeyHashchain[epochKey] = keccak256(
            abi.encodePacked(
                packedAttestation,
                epochKeyHashchain[epochKey]
            )
        );

        attestationsMade[epochKey][msg.sender] = true;

        emit AttestationSubmitted(
            epochKey,
            msg.sender,
            attestation.attesterId,
            attestation.posRep,
            attestation.negRep,
            attestation.graffiti,
            attestation.overwriteGraffiti
        );
    }

    function beginEpochTransition() external {
        require(now - latestEpochTransitionTime >= epochLength, "Unirep: epoch not yet ended");

        latestEpochTransitionTime = now;
        currentEpoch += 1;

        // Create a new global state tree
        uint256 h = hashedBlankStateLeaf();
        globalStateTrees[currentEpoch] = new IncrementalMerkleTree(treeDepths.globalStateTreeDepth, h);

        // Pay the caller
        // msg.sender.transfer();
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

    function calcEmptyUserStateTreeRoot(uint8 _levels) public pure returns (uint256) {
        return computeEmptyRoot(_levels, 0);
    }

    function getStateTreeRoot() public view returns (uint256) {
        return globalStateTrees[currentEpoch].root();
    }
}