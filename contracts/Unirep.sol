// SPDX-License-Identifier: UNLICENSED
pragma abicoder v2;
pragma solidity 0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import { DomainObjs } from './DomainObjs.sol';
import { SnarkConstants } from './SnarkConstants.sol';
import { ComputeRoot } from './ComputeRoot.sol';
import { UnirepParameters } from './UnirepParameters.sol';
import { EpochKeyValidityVerifier } from './EpochKeyValidityVerifier.sol';
import { StartTransitionVerifier } from './StartTransitionVerifier.sol';
import { ProcessAttestationsVerifier } from './ProcessAttestationsVerifier.sol';
import { UserStateTransitionVerifier } from './UserStateTransitionVerifier.sol';
import { ReputationVerifier } from './ReputationVerifier.sol';

contract Unirep is DomainObjs, ComputeRoot, UnirepParameters {
    using SafeMath for uint256;

    // A nothing-up-my-sleeve zero value
    // Should be equal to 16916383162496104613127564537688207714240750091683495371401923915264313510848
    uint256 ZERO_VALUE = uint256(keccak256(abi.encodePacked('Unirep'))) % SNARK_SCALAR_FIELD;

    // Verifier Contracts
    EpochKeyValidityVerifier internal epkValidityVerifier;
    StartTransitionVerifier internal startTransitionVerifier;
    ProcessAttestationsVerifier internal processAttestationsVerifier;
    UserStateTransitionVerifier internal userStateTransitionVerifier;
    ReputationVerifier internal reputationVerifier;

    uint256 public currentEpoch = 1;

    uint256 immutable public epochLength;

    uint256 public latestEpochTransitionTime;

    // To store the Merkle root of a tree with 2 **
    // treeDepths.userStateTreeDepth leaves of value 0
    uint256 public emptyUserStateRoot;

    uint256 immutable public emptyGlobalStateTreeRoot;

    // Maximum number of epoch keys allowed for an user to generate in one epoch
    uint8 immutable public numEpochKeyNoncePerEpoch;

    // The maximum number of signups allowed
    uint256 immutable public maxUsers;

    uint256 public numUserSignUps = 0;

    uint256 internal nextGSTLeafIndex = 0;

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

    // Indicate if hash chain of an epoch key is sealed
    mapping(uint256 => bool) public isEpochKeyHashChainSealed;

    // Mapping between epoch key and hashchain of attestations which attest to the epoch key
    mapping(uint256 => uint256) public epochKeyHashchain;
    // Mapping of epoch key and the number of attestations to the epoch key
    // This is used to limit number of attestations per epoch key
    mapping(uint256 => uint8) public numAttestationsToEpochKey;

    struct EpochKeyList {
        uint256 numKeys;
        mapping(uint256 => uint256) keys;
        uint256 numSealedKeys;
    }
    // Mpapping of epoch to epoch key list
    mapping(uint256 => EpochKeyList) internal epochKeys;

    // Mpapping of submitted blinded user state
    mapping(uint256 => bool) internal blindedUserStates;

    // Mpapping of submitted blinded hash chain
    mapping(uint256 => bool) internal blindedHashChains;

    // Mapping of the airdrop amount of an attester
    mapping(address => uint256) public airdropAmount;

    TreeDepths public treeDepths;


    // Events
    event Sequencer(
        string _event
    );

    event NewGSTLeafInserted(
        uint256 indexed _epoch,
        uint256 _leafIndex,
        uint256 _hashedLeaf,
        uint256 _attesterId,
        uint256 _airdropAmount
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
        StartTransitionVerifier _startTransitionVerifier,
        ProcessAttestationsVerifier _processAttestationsVerifier,
        UserStateTransitionVerifier _userStateTransitionVerifier,
        ReputationVerifier _reputationVerifier,
        uint8 _numEpochKeyNoncePerEpoch,
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

        numEpochKeyNoncePerEpoch = _numEpochKeyNoncePerEpoch;
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
        
        uint256 defaultUserStateRoot = emptyUserStateRoot;
        uint256 attesterId = attesters[msg.sender];
        uint256 airdropPosRep = airdropAmount[msg.sender];
        if(attesterId > 0 && airdropPosRep > 0) {
            uint256 airdropLeaf = hashAirdroppedLeaf(airdropPosRep);
            defaultUserStateRoot = calcAirdropUSTRoot(attesterId, airdropLeaf);
        }
        // Create, hash, and insert a fresh state leaf
        StateLeaf memory stateLeaf = StateLeaf({
            identityCommitment: _identityCommitment,
            userStateRoot: defaultUserStateRoot
        });

        uint256 hashedLeaf = hashStateLeaf(stateLeaf);

        hasUserSignedUp[_identityCommitment] = true;
        numUserSignUps ++;

        emit Sequencer("UserSignUp");
        emit NewGSTLeafInserted(currentEpoch, nextGSTLeafIndex ,hashedLeaf, attesterId, airdropPosRep);

        nextGSTLeafIndex ++;
    }

    /*
     * Verify if the attester has a valid signature as claimed
     * @param attester The address of user who wants to perform an action
     * @param siganture The signature signed by the attester
     */
    function verifySignature(address attester, bytes memory signature) internal view {
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
    }

    /*
     * Sign up an attester using the address who sends the transaction
     */
    function attesterSignUp() external {
        require(attesters[msg.sender] == 0, "Unirep: attester has already signed up");

        attesters[msg.sender] = nextAttesterId;
        nextAttesterId ++;
    }

    /*
     * Sign up an attester using the claimed address and the signature
     * @param attester The address of the attester who wants to sign up
     * @param signature The signature of the attester
     */
    function attesterSignUpViaRelayer(address attester, bytes calldata signature) external {
        require(attesters[attester] == 0, "Unirep: attester has already signed up");
        verifySignature(attester, signature);

        attesters[attester] = nextAttesterId;
        nextAttesterId ++;
    }

    /*
     * An attester can set the initial airdrop amount when user signs up through this attester
     * Then the contract inserts an airdropped leaf into the user's user state tree
     * @param _airdropAmount how much pos rep add to user's leaf
     */
    function setAirdropAmount(uint256 _airdropAmount) external {
        require(attesters[msg.sender] > 0, "Unirep: attester has not signed up yet");
        airdropAmount[msg.sender] = _airdropAmount;
    }

    /*
     * An attester submit the attestation with a reputation proof
     * @param attestation The attestation that the attester wants to send to the epoch key
     * @param epochKey The attester wants to send attestation to
     */
    function submitAttestation(Attestation calldata attestation, uint256 epochKey) external payable {
        require(attesters[msg.sender] > 0, "Unirep: attester has not signed up yet");
        require(attesters[msg.sender] == attestation.attesterId, "Unirep: mismatched attesterId");
        require(isEpochKeyHashChainSealed[epochKey] == false, "Unirep: hash chain of this epoch key has been sealed");
        require(msg.value == attestingFee, "Unirep: no attesting fee or incorrect amount");

        // Before attesting to a given epoch key, an attester must
        // verify validity of the epoch key using `verifyEpochKeyValidity` function.

        // Add to the cumulated attesting fee
        collectedAttestingFee = collectedAttestingFee.add(msg.value);

        // Process attestation
        sealHashChain(msg.sender, attestation, epochKey);
    }

    /*
     * An attester submit the attestation with a reputation proof via a relayer
     * @param attester The address of the attester
     * @param signature The signature of the attester
     * @param attestation The attestation including positive reputaiton, negative reputaiton or graffiti
     * @param epochKey The attester wants to send attestation to
     */
    function submitAttestationViaRelayer(
        address attester,
        bytes calldata signature,
        Attestation calldata attestation,
        uint256 epochKey
    ) external payable {
        verifySignature(attester, signature);
        require(attesters[attester] > 0, "Unirep: attester has not signed up yet");
        require(attesters[attester] == attestation.attesterId, "Unirep: mismatched attesterId");
        require(isEpochKeyHashChainSealed[epochKey] == false, "Unirep: hash chain of this epoch key has been sealed");
        require(msg.value == attestingFee, "Unirep: no attesting fee or incorrect amount");

        // Before attesting to a given epoch key, an attester must
        // verify validity of the epoch key using `verifyEpochKeyValidity` function.

        // Add to the cumulated attesting fee
        collectedAttestingFee = collectedAttestingFee.add(msg.value);

        // Process attestation
        sealHashChain(attester, attestation, epochKey);
    }

    function sealHashChain(address attester, Attestation calldata attestation, uint256 epochKey) internal {
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

        emit Sequencer("AttestationSubmitted");
        emit AttestationSubmitted(
            currentEpoch,
            epochKey,
            attester,
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

    function startUserStateTransition(
        uint256 _blindedUserState,
        uint256 _blindedHashChain,
        uint256 _GSTRoot,
        uint256[8] calldata _proof
    ) external {
        require(blindedUserStates[_blindedUserState] == false, "Unirep: blinded user state has been submitted before");
        bool proofIsValid = verifyStartTransitionProof(_blindedUserState, _blindedHashChain, _GSTRoot, _proof);
        require(proofIsValid, "Unirep: the proof is not valid");

        // Set the blinded variables true
        blindedUserStates[_blindedUserState] = true;
        blindedHashChains[_blindedHashChain] = true;
    }

    function processAttestations(
        uint256 _outputBlindedUserState,
        uint256 _outputBlindedHashChain,
        uint256 _inputBlindedUserState,
        uint256[8] calldata _proof
    ) external {
        require(blindedUserStates[_inputBlindedUserState] == true, "Unirep: processing attestations with an invalid blinded user state");
        bool proofIsValid = verifyProcessAttestationProof(_outputBlindedUserState, _outputBlindedHashChain, _inputBlindedUserState, _proof);
        require(proofIsValid, "Unirep: the proof is not valid");

        // Set the blinded variables true
        blindedUserStates[_outputBlindedUserState] = true;
        blindedHashChains[_outputBlindedHashChain] = true;
    }

    function updateUserStateRoot(
        uint256 _newGlobalStateTreeLeaf,
        uint256[] calldata _epkNullifiers,
        uint256[] calldata _blindedUserStates,
        uint256[] calldata _blindedHashChains,
        uint256 _transitionFromEpoch,
        uint256 _fromGlobalStateTree,
        uint256 _fromEpochTree,
        uint256[8] calldata _proof) external {
        // NOTE: this impl assumes all attestations are processed in a single snark.
        require(_transitionFromEpoch < currentEpoch, "Can not transition from epoch that's greater or equal to current epoch");
        require(_epkNullifiers.length == numEpochKeyNoncePerEpoch, "Unirep: invalid number of epk nullifiers");
        for (uint i = 0; i < numEpochKeyNoncePerEpoch; i++) {
            require(blindedUserStates[_blindedUserStates[i]] == true, "Unirep: unprocessed user state");
            require(blindedHashChains[_blindedHashChains[i]] == true, "Unirep: unprocessed hash chain");
        }
        
        UserTransitionedRelated memory userTransitionedData;
        userTransitionedData.fromEpoch = _transitionFromEpoch;
        userTransitionedData.fromGlobalStateTree = _fromGlobalStateTree;
        userTransitionedData.fromEpochTree = _fromEpochTree;
        userTransitionedData.newGlobalStateTreeLeaf = _newGlobalStateTreeLeaf;
        userTransitionedData.proof = _proof;
        userTransitionedData.blindedUserStates = _blindedUserStates;
        userTransitionedData.blindedHashChains = _blindedHashChains;
        userTransitionedData.epkNullifiers = _epkNullifiers;

        emit Sequencer("UserStateTransitioned");
        emit UserStateTransitioned(
            currentEpoch,
            nextGSTLeafIndex,
            userTransitionedData
        );

        nextGSTLeafIndex ++;
    }

    function verifyEpochKeyValidity(
        uint256 _globalStateTree,
        uint256 _epoch,
        uint256 _epochKey,
        uint256[8] memory _proof) public view returns (bool) {
        // Before attesting to a given epoch key, an attester must verify validity of the epoch key:
        // 1. user has signed up
        // 2. nonce is no greater than numEpochKeyNoncePerEpoch
        // 3. user has transitioned to the epoch(by proving membership in the globalStateTree of that epoch)
        // 4. epoch key is correctly computed

        uint256[] memory _publicSignals = new uint256[](3);
        _publicSignals[0] = _globalStateTree;
        _publicSignals[1] = _epoch;
        _publicSignals[2] = _epochKey;

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
            proof.a,
            proof.b,
            proof.c
        ) = unpackProof(_proof);

        // Verify the proof
        proof.isValid = epkValidityVerifier.verifyProof(proof.a, proof.b, proof.c, _publicSignals);
        return proof.isValid;
    }

    function verifyStartTransitionProof(
        uint256 _blindedUserState,
        uint256 _blindedHashChain,
        uint256 _GSTRoot,
        uint256[8] memory _proof) public view returns (bool) {

        uint256[] memory _publicSignals = new uint256[](4);
        _publicSignals[0] = _blindedUserState;
        _publicSignals[1] = _blindedHashChain;
        _publicSignals[2] = _GSTRoot;

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
            proof.a,
            proof.b,
            proof.c
        ) = unpackProof(_proof);

        // Verify the proof
        proof.isValid = startTransitionVerifier.verifyProof(proof.a, proof.b, proof.c, _publicSignals);
        return proof.isValid;
    }

    function verifyProcessAttestationProof(
        uint256 _outputBlindedUserState,
        uint256 _outputBlindedHashChain,
        uint256 _inputBlindedUserState,
        uint256[8] memory _proof) public view returns (bool) {

        uint256[] memory _publicSignals = new uint256[](4);
        _publicSignals[0] = _outputBlindedUserState;
        _publicSignals[1] = _outputBlindedHashChain;
        _publicSignals[2] = _inputBlindedUserState;

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
            proof.a,
            proof.b,
            proof.c
        ) = unpackProof(_proof);

        // Verify the proof
        proof.isValid = processAttestationsVerifier.verifyProof(proof.a, proof.b, proof.c, _publicSignals);
        return proof.isValid;
    }

    function verifyUserStateTransition(
        uint256 _newGlobalStateTreeLeaf,
        uint256[] calldata _epkNullifiers,
        uint256 _transitionFromEpoch,
        uint256[] calldata _blindedUserStates,
        uint256 _fromGlobalStateTree,
        uint256[] calldata _blindedHashChains,
        uint256 _fromEpochTree,
        uint256[8] calldata _proof) external view returns (bool) {
        // Verify validity of new user state:
        // 1. User's identity and state exist in the provided global state tree
        // 2. Global state tree is updated correctly
        // 3. Attestations to each epoch key are processed and processed correctly
        // require(_epkNullifiers.length == numEpochKeyNoncePerEpoch, "Unirep: invalid number of epk nullifiers");

        uint256[] memory _publicSignals = new uint256[](4 + numEpochKeyNoncePerEpoch * 3);
        _publicSignals[0] = _newGlobalStateTreeLeaf;
        for (uint8 i = 0; i < numEpochKeyNoncePerEpoch; i++) {
            _publicSignals[i + 1] = _epkNullifiers[i];
        }
        _publicSignals[1 + numEpochKeyNoncePerEpoch] = _transitionFromEpoch;
        for (uint8 i = 0; i < numEpochKeyNoncePerEpoch; i++) {
            _publicSignals[2 + numEpochKeyNoncePerEpoch + i] = _blindedUserStates[i];
        }
        _publicSignals[2 + numEpochKeyNoncePerEpoch * 2] = _fromGlobalStateTree;
        for (uint8 i = 0; i < numEpochKeyNoncePerEpoch; i++) {
            _publicSignals[3 + numEpochKeyNoncePerEpoch * 2 + i] = _blindedHashChains[i];
        }
        _publicSignals[3 + numEpochKeyNoncePerEpoch * 3] = _fromEpochTree;

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
            proof.a,
            proof.b,
            proof.c
        ) = unpackProof(_proof);

        // Verify the proof
        proof.isValid = userStateTransitionVerifier.verifyProof(proof.a, proof.b, proof.c, _publicSignals);
        return proof.isValid;
    }

    function verifyReputation(
        uint256 _epoch,
        uint256 _globalStateTree,
        uint256 _nullifierTree,
        uint256 _attesterId,
        ReputationProofSignals memory _proofSignals,
        uint256[8] memory _proof) external view returns (bool) {
        // User prove his reputation by an attester:
        // 1. User exists in GST
        // 2. It is the latest state user transition to
        // 3. (optional) positive reputation is greater than `_min_pos_rep`
        // 4. (optional) negative reputation is less than `_max_neg_rep`
        // 5. (optional) hash of graffiti pre-image matches
        uint256[] memory _publicSignals = new uint256[](12);
        _publicSignals[0] = _epoch;
        _publicSignals[1] = _globalStateTree;
        _publicSignals[2] = _nullifierTree;
        _publicSignals[3] = _attesterId;
        _publicSignals[4] = _proofSignals.provePosRep;
        _publicSignals[5] = _proofSignals.proveNegRep;
        _publicSignals[6] = _proofSignals.proveRepDiff;
        _publicSignals[7] = _proofSignals.proveGraffiti;
        _publicSignals[8] = _proofSignals.minRepDiff;
        _publicSignals[9] = _proofSignals.minPosRep;
        _publicSignals[10] = _proofSignals.maxNegRep;
        _publicSignals[11] = _proofSignals.graffitiPreImage;

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
            proof.a,
            proof.b,
            proof.c
        ) = unpackProof(_proof);

        // Verify the proof
        proof.isValid = reputationVerifier.verifyProof(proof.a, proof.b, proof.c, _publicSignals);
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

    function calcAirdropUSTRoot(uint256 _leafIndex, uint256 _leafValue) public view returns (uint256) {
        uint256[5] memory defaultStateLeafValues;
        for (uint8 i = 0; i < 5; i++) {
            defaultStateLeafValues[i] = 0;
        }
        uint256 defaultUserStateLeaf = hash5(defaultStateLeafValues);
        return computeOneNonZeroLeafRoot(treeDepths.userStateTreeDepth, _leafIndex, _leafValue, defaultUserStateLeaf);
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
        StateLeaf memory stateLeaf = StateLeaf({
            identityCommitment: 0,
            userStateRoot: emptyUserStateRoot
        });

        uint256 h = hashStateLeaf(stateLeaf);

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
        Address.sendValue(payable(address(0)), amount);
    }

    function collectEpochTransitionCompensation() external {
        // NOTE: currently there are no revenue to pay for epoch transition compensation
        uint256 amount = epochTransitionCompensation[msg.sender];
        epochTransitionCompensation[msg.sender] = 0;
        Address.sendValue(payable(msg.sender), amount);
    }
}