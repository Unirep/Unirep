// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@openzeppelin/contracts/utils/Address.sol';

import {VerifySignature} from './libraries/VerifySignature.sol';

import {IUnirep} from './interfaces/IUnirep.sol';
import {IVerifier} from './interfaces/IVerifier.sol';

import {IncrementalBinaryTree, IncrementalTreeData} from '@zk-kit/incremental-merkle-tree.sol/IncrementalBinaryTree.sol';
import {Poseidon6, Poseidon4, Poseidon3} from './Hash.sol';

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

    // Bind the hashchain head to an attesterId, epoch number, and hashchain index
    mapping(uint256 => uint256[3]) public hashchainMapping;

    constructor(
        Config memory _config,
        IVerifier _signupVerifier,
        IVerifier _aggregateEpochKeysVerifier,
        IVerifier _userStateTransitionVerifier,
        IVerifier _reputationVerifier,
        IVerifier _epochKeyVerifier,
        IVerifier _epochKeyLiteVerifier
    ) {
        config = _config;

        // Set the verifier contracts
        signupVerifier = _signupVerifier;
        aggregateEpochKeysVerifier = _aggregateEpochKeysVerifier;
        userStateTransitionVerifier = _userStateTransitionVerifier;
        reputationVerifier = _reputationVerifier;
        epochKeyVerifier = _epochKeyVerifier;
        epochKeyLiteVerifier = _epochKeyLiteVerifier;

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
        Reputation storage balance = attester
            .epochKeyState[targetEpoch]
            .balances[epochKey];
        if (!attester.epochKeyState[targetEpoch].isKeyOwed[epochKey]) {
            attester.epochKeyState[targetEpoch].owedKeys.push(epochKey);
            attester.epochKeyState[targetEpoch].isKeyOwed[epochKey] = true;
        }
        balance.posRep += posRep;
        balance.negRep += negRep;
        if (graffiti != 0) {
            balance.graffiti = graffiti;
            balance.timestamp = timestamp;
        }
    }

    // build a hashchain of epoch key balances that we'll put in the epoch tree
    function buildHashchain(uint160 attesterId, uint256 epoch) public {
        AttesterData storage attester = attesters[attesterId];
        require(attester.epochKeyState[epoch].owedKeys.length > 0);
        // target some specific length: config.aggregateKeyCount
        uint256 index = attester.epochKeyState[epoch].totalHashchains;
        EpochKeyHashchain storage hashchain = attester
            .epochKeyState[epoch]
            .hashchain[index];
        // attester id, epoch, hashchain index
        hashchain.head = Poseidon3.poseidon([attesterId, epoch, index]);
        hashchain.index = index;
        attester.epochKeyState[epoch].totalHashchains++;
        for (uint8 x = 0; x < config.aggregateKeyCount; x++) {
            uint256[] storage owedKeys = attester.epochKeyState[epoch].owedKeys;
            if (owedKeys.length == 0) break;
            uint256 epochKey = owedKeys[owedKeys.length - 1];
            owedKeys.pop();
            attester.epochKeyState[epoch].isKeyOwed[epochKey] = false;
            Reputation storage balance = attester.epochKeyState[epoch].balances[
                epochKey
            ];
            hashchain.head = Poseidon6.poseidon(
                [
                    hashchain.head,
                    epochKey,
                    balance.posRep,
                    balance.negRep,
                    balance.graffiti,
                    balance.timestamp
                ]
            );
            hashchain.epochKeys.push(epochKey);
            hashchain.epochKeyBalances.push(balance);
        }
        hashchainMapping[hashchain.head] = [attesterId, epoch, index];
        emit HashchainBuilt(epoch, attesterId, index);
    }

    function processHashchain(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) public {
        if (!aggregateEpochKeysVerifier.verifyProof(publicSignals, proof))
            revert InvalidProof();
        uint256 hashchainHead = publicSignals[1];
        uint256 attesterId = hashchainMapping[hashchainHead][0];
        uint256 epoch = hashchainMapping[hashchainHead][1];
        uint256 hashchainIndex = hashchainMapping[hashchainHead][2];
        require(attesterId != 0, 'value is 0');
        AttesterData storage attester = attesters[uint160(attesterId)];
        EpochKeyHashchain storage hashchain = attester
            .epochKeyState[epoch]
            .hashchain[hashchainIndex];
        if (hashchain.head == 0 || hashchain.processed)
            revert HashchainInvalid();
        if (hashchainHead != hashchain.head) revert HashchainInvalid();
        if (attester.epochTreeRoots[epoch] != publicSignals[2])
            revert InvalidEpochTreeRoot(publicSignals[2]);
        // Verify the zk proof
        for (uint8 x = 0; x < hashchain.epochKeys.length; x++) {
            // emit the new leaves from the hashchain
            uint256 epochKey = hashchain.epochKeys[x];
            Reputation storage balance = hashchain.epochKeyBalances[x];
            emit EpochTreeLeaf(
                epoch,
                uint160(attesterId),
                epochKey,
                Poseidon4.poseidon(
                    [
                        balance.posRep,
                        balance.negRep,
                        balance.graffiti,
                        balance.timestamp
                    ]
                )
            );
        }
        hashchain.processed = true;
        attester.epochKeyState[epoch].processedHashchains++;
        attester.epochTreeRoots[epoch] = publicSignals[0];
        hashchainMapping[hashchainHead] = [0, 0, 0];
        emit HashchainProcessed(
            epoch,
            uint160(attesterId),
            attesterEpochSealed(uint160(attesterId), epoch)
        );
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
        if (
            attester.epochKeyState[fromEpoch].owedKeys.length != 0 ||
            attester.epochKeyState[fromEpoch].totalHashchains !=
            attester.epochKeyState[fromEpoch].processedHashchains
        ) revert HashchainNotProcessed();
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
     */
    function updateEpochIfNeeded(uint256 attesterId) public {
        require(attesterId < type(uint160).max);
        AttesterData storage attester = attesters[uint160(attesterId)];
        if (attester.startTimestamp == 0)
            revert AttesterNotSignUp(uint160(attesterId));
        uint256 newEpoch = attesterCurrentEpoch(uint160(attesterId));
        if (newEpoch == attester.currentEpoch) return;

        // otherwise initialize the new epoch structures

        for (uint8 i; i < config.stateTreeDepth; i++) {
            attester.stateTrees[newEpoch].zeroes[i] = emptyTree.zeroes[i];
        }
        attester.stateTrees[newEpoch].root = emptyTree.root;
        attester.stateTrees[newEpoch].depth = config.stateTreeDepth;
        attester.stateTreeRoots[newEpoch][emptyTree.root] = true;

        attester.epochTreeRoots[newEpoch] = config.emptyEpochTreeRoot;

        emit EpochEnded(newEpoch - 1, uint160(attesterId));

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
        signals.attesterId = (publicSignals[2] >> 72) & ((2 << 160) - 1);
        signals.epoch = (publicSignals[2] >> 8) & ((2 << 64) - 1);
        signals.nonce = publicSignals[2] & ((2 << 8) - 1);
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
        if (signals.attesterId >= type(uint160).max) revert AttesterInvalid();
        updateEpochIfNeeded(uint160(signals.attesterId));
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
        signals.attesterId = (publicSignals[0] >> 72) & ((2 << 160) - 1);
        signals.epoch = (publicSignals[0] >> 8) & ((2 << 64) - 1);
        signals.nonce = publicSignals[0] & ((2 << 8) - 1);
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
        if (signals.attesterId >= type(uint160).max) revert AttesterInvalid();
        updateEpochIfNeeded(uint160(signals.attesterId));
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
        signals.attesterId = (publicSignals[2] >> 72) & ((2 << 160) - 1);
        signals.epoch = (publicSignals[2] >> 8) & ((2 << 64) - 1);
        signals.nonce = publicSignals[2] & ((2 << 8) - 1);
        signals.proveZeroRep = (publicSignals[3] >> 130) & 1;
        signals.proveMaxRep = (publicSignals[3] >> 129) & 1;
        signals.proveMinRep = (publicSignals[3] >> 128) & 1;
        signals.maxRep = (publicSignals[3] >> 64) & ((2 << 64) - 1);
        signals.minRep = publicSignals[3] & ((2 << 64) - 1);
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
        updateEpochIfNeeded(uint160(signals.attesterId));
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

    function attesterOwedEpochKeys(uint160 attesterId, uint256 epoch)
        public
        view
        returns (uint256)
    {
        return attesters[attesterId].epochKeyState[epoch].owedKeys.length;
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

    function attesterEpochSealed(uint160 attesterId, uint256 epoch)
        public
        view
        returns (bool)
    {
        EpochKeyState storage state = attesters[attesterId].epochKeyState[
            epoch
        ];
        uint256 currentEpoch = attesterCurrentEpoch(attesterId);
        return
            currentEpoch > epoch &&
            state.owedKeys.length == 0 &&
            state.totalHashchains == state.processedHashchains;
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
