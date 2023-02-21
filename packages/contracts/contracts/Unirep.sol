// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/utils/Address.sol';

import {VerifySignature} from './libraries/VerifySignature.sol';

import {IUnirep} from './interfaces/IUnirep.sol';
import {IVerifier} from './interfaces/IVerifier.sol';

import {IncrementalBinaryTree, IncrementalTreeData} from '@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol';
import {Polysum, PolysumData} from './libraries/Polysum.sol';

import 'poseidon-solidity/PoseidonT2.sol';

/**
 * @title Unirep
 * @dev Unirep is a reputation which uses ZKP to preserve users' privacy.
 * Attester can give attestations to users, and users can optionally prove that how much reputation they have.
 */
contract Unirep is IUnirep, VerifySignature {
    using SafeMath for uint256;

    // All verifier contracts
    IVerifier public immutable signupVerifier;
    IVerifier public immutable userStateTransitionVerifier;
    IVerifier public immutable reputationVerifier;
    IVerifier public immutable epochKeyVerifier;
    IVerifier public immutable epochKeyLiteVerifier;
    IVerifier public immutable buildOrderedTreeVerifier;

    uint256 public constant SNARK_SCALAR_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 public immutable PoseidonT2_zero = PoseidonT2.hash([uint(0)]);

    uint256 public constant OMT_R =
        19840472963655813647419884432877523255831900116552197704230384899846353674447;
    uint256 public constant EPK_R =
        11105707062209303735980536775061420040143715723438319441848723820903914190159;

    // Attester id == address
    mapping(uint160 => AttesterData) attesters;

    // for cheap initialization
    IncrementalTreeData emptyTree;

    // Mapping of used nullifiers
    mapping(uint256 => bool) public usedNullifiers;

    uint8 public immutable stateTreeDepth;
    uint8 public immutable epochTreeDepth;
    uint8 public immutable epochTreeArity;
    uint8 public immutable fieldCount;
    uint8 public immutable sumFieldCount;
    uint8 public immutable numEpochKeyNoncePerEpoch;

    constructor(
        Config memory _config,
        IVerifier _signupVerifier,
        IVerifier _userStateTransitionVerifier,
        IVerifier _reputationVerifier,
        IVerifier _epochKeyVerifier,
        IVerifier _epochKeyLiteVerifier,
        IVerifier _buildOrderedTreeVerifier
    ) {
        stateTreeDepth = _config.stateTreeDepth;
        epochTreeDepth = _config.epochTreeDepth;
        epochTreeArity = _config.epochTreeArity;
        fieldCount = _config.fieldCount;
        sumFieldCount = _config.sumFieldCount;
        numEpochKeyNoncePerEpoch = _config.numEpochKeyNoncePerEpoch;

        // Set the verifier contracts
        signupVerifier = _signupVerifier;
        userStateTransitionVerifier = _userStateTransitionVerifier;
        reputationVerifier = _reputationVerifier;
        epochKeyVerifier = _epochKeyVerifier;
        epochKeyLiteVerifier = _epochKeyLiteVerifier;
        buildOrderedTreeVerifier = _buildOrderedTreeVerifier;

        // for initializing other trees without using poseidon function
        IncrementalBinaryTree.init(emptyTree, _config.stateTreeDepth, 0);
        emit AttesterSignedUp(0, type(uint64).max, block.timestamp);
        attesters[uint160(0)].epochLength = type(uint64).max;
        attesters[uint160(0)].startTimestamp = block.timestamp;
    }

    function config() public view returns (Config memory) {
        return
            Config({
                stateTreeDepth: stateTreeDepth,
                epochTreeDepth: epochTreeDepth,
                epochTreeArity: epochTreeArity,
                fieldCount: fieldCount,
                sumFieldCount: sumFieldCount,
                numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch
            });
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
        for (uint8 i; i < stateTreeDepth; i++) {
            attester.stateTrees[0].zeroes[i] = emptyTree.zeroes[i];
        }
        attester.stateTrees[0].root = emptyTree.root;
        attester.stateTrees[0].depth = stateTreeDepth;
        attester.stateTreeRoots[0][emptyTree.root] = true;

        // initialize the semaphore group tree
        for (uint8 i; i < stateTreeDepth; i++) {
            attester.semaphoreGroup.zeroes[i] = emptyTree.zeroes[i];
        }
        attester.semaphoreGroup.root = emptyTree.root;
        attester.semaphoreGroup.depth = stateTreeDepth;

        // set the epoch length
        attester.epochLength = epochLength;

        emit AttesterSignedUp(
            uint160(attesterId),
            epochLength,
            attester.startTimestamp
        );
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
     * @dev Attest to a change in data for a user that controls `epochKey`
     */
    function attest(uint256 epochKey, uint epoch, uint fieldIndex, uint change)
        public
    {
        {
            uint currentEpoch = updateEpochIfNeeded(uint160(msg.sender));
            if (epoch != currentEpoch) revert EpochNotMatch();
        }
        if (epochKey >= SNARK_SCALAR_FIELD) revert InvalidEpochKey();

        if (fieldIndex >= fieldCount) revert InvalidField();

        AttesterState storage state = attesters[uint160(msg.sender)].state[
            epoch
        ];
        PolysumData storage epkPolysum = state.epkPolysum[epochKey];

        bool newKey;
        {
            uint[30] storage data = state.data[epochKey];
            uint[30] storage dataHashes = state.dataHashes[epochKey];

            // First handle updating the epoch tree leaf polysum
            // lazily initialize the epk polysum state
            newKey = epkPolysum.hash == 0;
            if (newKey) {
                uint[] memory vals = new uint[](fieldCount + 1);
                vals[0] = PoseidonT2.hash([epochKey]);
                for (uint8 x = 0; x < fieldCount; x++) {
                    vals[x + 1] = PoseidonT2_zero;
                }
                Polysum.add(epkPolysum, vals, EPK_R);
            }
            if (fieldIndex < sumFieldCount) {
                // do a sum field change
                uint oldVal = data[fieldIndex];
                uint newVal = addmod(oldVal, change, SNARK_SCALAR_FIELD);
                uint oldHash = oldVal == 0
                    ? PoseidonT2_zero
                    : dataHashes[fieldIndex];
                uint newHash = PoseidonT2.hash([newVal]);
                Polysum.update(
                    epkPolysum,
                    fieldIndex + 1,
                    oldHash,
                    newHash,
                    EPK_R
                );
                data[fieldIndex] = newVal;
                dataHashes[fieldIndex] = newHash;
            } else {
                if (fieldIndex % 2 != sumFieldCount % 2) {
                    // cannot attest to a timestamp
                    revert InvalidField();
                }
                if (change >= SNARK_SCALAR_FIELD) revert OutOfRange();
                {
                    uint oldVal = data[fieldIndex];

                    uint newValHash = PoseidonT2.hash([change]);
                    uint oldValHash = oldVal == 0
                        ? PoseidonT2_zero
                        : dataHashes[fieldIndex];
                    data[fieldIndex] = change;
                    dataHashes[fieldIndex] = newValHash;
                    // update data
                    Polysum.update(
                        epkPolysum,
                        fieldIndex + 1,
                        oldValHash,
                        newValHash,
                        EPK_R
                    );
                }
                {
                    // update timestamp
                    uint oldTimestamp = data[fieldIndex + 1];
                    uint oldTimestampHash = oldTimestamp == 0
                        ? PoseidonT2_zero
                        : dataHashes[fieldIndex + 1];
                    uint newTimestampHash = PoseidonT2.hash([block.timestamp]);
                    data[fieldIndex + 1] = block.timestamp;
                    dataHashes[fieldIndex + 1] = newTimestampHash;
                    Polysum.update(
                        epkPolysum,
                        fieldIndex + 2,
                        oldTimestampHash,
                        newTimestampHash,
                        EPK_R
                    );
                }
            }
        }

        // now handle the epoch tree polysum

        uint256 newLeaf = epkPolysum.hash;

        uint index;
        if (newKey) {
            // check that we're not at max capacity
            if (
                state.polysum.index ==
                uint(epochTreeArity)**uint(epochTreeDepth) - 2 + 1
            ) {
                revert MaxAttestations();
            }
            if (state.polysum.index == 0) {
                state.polysum.index = 1;
            }
            // this epoch key has received no attestations
            index = Polysum.add(state.polysum, newLeaf, OMT_R);
            state.epochKeyIndex[epochKey] = index;
            state.epochKeyLeaves[epochKey] = newLeaf;
        } else {
            index = state.epochKeyIndex[epochKey];
            // we need to update the value in the polysussssssss
            Polysum.update(
                state.polysum,
                index,
                state.epochKeyLeaves[epochKey],
                newLeaf,
                OMT_R
            );
            state.epochKeyLeaves[epochKey] = newLeaf;
        }
        emit EpochTreeLeaf(epoch, uint160(msg.sender), index, newLeaf);
        emit Attestation(
            epoch,
            epochKey,
            uint160(msg.sender),
            fieldIndex,
            change,
            block.timestamp
        );
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
        AttesterState storage state = attester.state[epoch];
        updateEpochIfNeeded(attesterId);
        if (attester.currentEpoch <= epoch) revert EpochNotMatch();
        // build the epoch tree root
        uint256 root = publicSignals[0];
        uint256 polysum = publicSignals[1];
        //~~ if the hash is 0, don't allow the epoch to be manually sealed
        //~~ no attestations happened
        if (state.polysum.hash == 0) {
            revert NoAttestations();
        }
        //~~ we seal the polysum by adding the largest value possible to
        //~~ tree
        Polysum.add(state.polysum, SNARK_SCALAR_FIELD - 1, OMT_R);
        // otherwise the root was already set
        if (attester.epochTreeRoots[epoch] != 0) {
            revert DoubleSeal();
        }
        // otherwise it's bad data in the proof
        if (polysum != state.polysum.hash) {
            revert IncorrectHash();
        }
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
        if (publicSignals[6] >= type(uint160).max) revert AttesterInvalid();
        uint160 attesterId = uint160(publicSignals[6]);
        updateEpochIfNeeded(attesterId);
        AttesterData storage attester = attesters[attesterId];
        // verify that the transition nullifier hasn't been used
        if (usedNullifiers[publicSignals[2]])
            revert NullifierAlreadyUsed(publicSignals[2]);
        usedNullifiers[publicSignals[2]] = true;

        // verify that we're transition to the current epoch
        if (attester.currentEpoch != publicSignals[5]) revert EpochNotMatch();

        uint256 fromEpoch = publicSignals[4];
        // check for attestation processing
        if (!attesterEpochSealed(attesterId, fromEpoch))
            revert EpochNotSealed();

        // make sure from state tree root is valid
        if (!attester.stateTreeRoots[fromEpoch][publicSignals[0]])
            revert InvalidStateTreeRoot(publicSignals[0]);

        // make sure from epoch tree root is valid
        if (attester.epochTreeRoots[fromEpoch] != publicSignals[3])
            revert InvalidEpochTreeRoot(publicSignals[3]);

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
    function _updateEpochIfNeeded(uint256 attesterId)
        public
        returns (uint epoch)
    {
        require(attesterId < type(uint160).max);
        return updateEpochIfNeeded(uint160(attesterId));
    }

    function updateEpochIfNeeded(uint160 attesterId)
        public
        returns (uint epoch)
    {
        AttesterData storage attester = attesters[attesterId];
        epoch = attesterCurrentEpoch(attesterId);
        if (epoch == attester.currentEpoch) return epoch;

        // otherwise initialize the new epoch structures

        for (uint8 i; i < stateTreeDepth; i++) {
            attester.stateTrees[epoch].zeroes[i] = emptyTree.zeroes[i];
        }
        attester.stateTrees[epoch].root = emptyTree.root;
        attester.stateTrees[epoch].depth = stateTreeDepth;
        attester.stateTreeRoots[epoch][emptyTree.root] = true;

        emit EpochEnded(epoch - 1, attesterId);

        attester.currentEpoch = epoch;
    }

    function decodeEpochKeyControl(uint256 control)
        public
        pure
        returns (
            uint256 revealNonce,
            uint256 attesterId,
            uint256 epoch,
            uint256 nonce
        )
    {
        revealNonce = (control >> 232) & 1;
        attesterId = (control >> 72) & ((1 << 160) - 1);
        epoch = (control >> 8) & ((1 << 64) - 1);
        nonce = control & ((1 << 8) - 1);
        return (revealNonce, attesterId, epoch, nonce);
    }

    function decodeReputationControl(uint256 control)
        public
        pure
        returns (
            uint256 minRep,
            uint256 maxRep,
            uint256 proveMinRep,
            uint256 proveMaxRep,
            uint256 proveZeroRep,
            uint256 proveGraffiti
        )
    {
        minRep = control & ((1 << 64) - 1);
        maxRep = (control >> 64) & ((1 << 64) - 1);
        proveMinRep = (control >> 128) & 1;
        proveMaxRep = (control >> 129) & 1;
        proveZeroRep = (control >> 130) & 1;
        proveGraffiti = (control >> 131) & 1;
        return (
            minRep,
            maxRep,
            proveMinRep,
            proveMaxRep,
            proveZeroRep,
            proveGraffiti
        );
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
        (
            signals.revealNonce,
            signals.attesterId,
            signals.epoch,
            signals.nonce
        ) = decodeEpochKeyControl(publicSignals[2]);
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
        if (signals.epochKey >= SNARK_SCALAR_FIELD) revert InvalidEpochKey();
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
        (
            signals.revealNonce,
            signals.attesterId,
            signals.epoch,
            signals.nonce
        ) = decodeEpochKeyControl(publicSignals[0]);
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
        if (signals.epochKey >= SNARK_SCALAR_FIELD) revert InvalidEpochKey();
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
        (
            signals.revealNonce,
            signals.attesterId,
            signals.epoch,
            signals.nonce
        ) = decodeEpochKeyControl(publicSignals[2]);

        (
            signals.minRep,
            signals.maxRep,
            signals.proveMinRep,
            signals.proveMaxRep,
            signals.proveZeroRep,
            signals.proveGraffiti
        ) = decodeReputationControl(publicSignals[3]);
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
        if (signals.epochKey >= SNARK_SCALAR_FIELD) revert InvalidEpochKey();
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
        uint256 timestamp = attesters[attesterId].startTimestamp;
        uint256 epochLength = attesters[attesterId].epochLength;
        if (timestamp == 0) revert AttesterNotSignUp(attesterId);
        return (block.timestamp - timestamp) / epochLength;
    }

    function attesterEpochRemainingTime(uint160 attesterId)
        public
        view
        returns (uint256)
    {
        uint256 timestamp = attesters[attesterId].startTimestamp;
        uint256 epochLength = attesters[attesterId].epochLength;
        if (timestamp == 0) revert AttesterNotSignUp(attesterId);
        uint256 _currentEpoch = (block.timestamp - timestamp) / epochLength;
        return
            (timestamp + (_currentEpoch + 1) * epochLength) - block.timestamp;
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
            attester.epochTreeRoots[epoch] != 0 ||
            attester.state[epoch].polysum.hash == 0;
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
}
