"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.genUserStateFromParams = exports.genUserStateFromContract = exports.genUnirepStateFromParams = exports.genUnirepStateFromContract = exports.genNewSMT = exports.genReputationNullifier = exports.genEpochKeyNullifier = exports.genEpochKey = exports.verifyUSTEvents = exports.verifyUserStateTransitionEvent = exports.verifyProcessAttestationEvents = exports.verifyProcessAttestationEvent = exports.verifyStartTransitionProofEvent = exports.verifySignUpProofEvent = exports.verifyReputationProofEvent = exports.verifyEpochKeyProofEvent = exports.formatProofForSnarkjsVerification = exports.computeInitUserStateRoot = exports.computeEmptyUserStateRoot = exports.SMT_ZERO_LEAF = exports.SMT_ONE_LEAF = exports.defaultUserStateLeaf = void 0;
const keyv_1 = __importDefault(require("keyv"));
const contracts_1 = require("@unirep/contracts");
const crypto_1 = require("@unirep/crypto");
const testLocal_1 = require("../config/testLocal");
const UnirepState_1 = require("./UnirepState");
const UserState_1 = require("./UserState");
const nullifierDomainSeparator_1 = require("../config/nullifierDomainSeparator");
const circuits_1 = require("@unirep/circuits");
Object.defineProperty(exports, "formatProofForSnarkjsVerification", { enumerable: true, get: function () { return circuits_1.formatProofForSnarkjsVerification; } });
const defaults_1 = require("../cli/defaults");
const defaultUserStateLeaf = (0, crypto_1.hash5)([BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)]);
exports.defaultUserStateLeaf = defaultUserStateLeaf;
const SMT_ZERO_LEAF = (0, crypto_1.hashLeftRight)(BigInt(0), BigInt(0));
exports.SMT_ZERO_LEAF = SMT_ZERO_LEAF;
const SMT_ONE_LEAF = (0, crypto_1.hashLeftRight)(BigInt(1), BigInt(0));
exports.SMT_ONE_LEAF = SMT_ONE_LEAF;
const computeEmptyUserStateRoot = (treeDepth) => {
    const t = new crypto_1.IncrementalQuinTree(treeDepth, defaultUserStateLeaf, 2);
    return t.root;
};
exports.computeEmptyUserStateRoot = computeEmptyUserStateRoot;
const computeInitUserStateRoot = async (treeDepth, leafIdx, airdropPosRep) => {
    const t = await crypto_1.SparseMerkleTreeImpl.create(new keyv_1.default(), treeDepth, defaultUserStateLeaf);
    if (leafIdx && airdropPosRep) {
        const leafValue = (0, crypto_1.hash5)([BigInt(airdropPosRep), BigInt(0), BigInt(0), BigInt(1)]);
        await t.update(BigInt(leafIdx), leafValue);
    }
    return t.getRootHash();
};
exports.computeInitUserStateRoot = computeInitUserStateRoot;
const genEpochKey = (identityNullifier, epoch, nonce, _epochTreeDepth = testLocal_1.circuitEpochTreeDepth) => {
    const values = [
        identityNullifier,
        epoch,
        nonce,
        BigInt(0),
        BigInt(0),
    ];
    let epochKey = (0, crypto_1.hash5)(values).toString();
    // Adjust epoch key size according to epoch tree depth
    const epochKeyModed = BigInt(epochKey) % BigInt(2 ** _epochTreeDepth);
    return epochKeyModed;
};
exports.genEpochKey = genEpochKey;
const genEpochKeyNullifier = (identityNullifier, epoch, nonce) => {
    return (0, crypto_1.hash5)([
        nullifierDomainSeparator_1.EPOCH_KEY_NULLIFIER_DOMAIN,
        identityNullifier,
        BigInt(epoch),
        BigInt(nonce),
        BigInt(0)
    ]);
};
exports.genEpochKeyNullifier = genEpochKeyNullifier;
const genReputationNullifier = (identityNullifier, epoch, nonce, attesterId) => {
    return (0, crypto_1.hash5)([
        nullifierDomainSeparator_1.REPUTATION_NULLIFIER_DOMAIN,
        identityNullifier,
        BigInt(epoch),
        BigInt(nonce),
        attesterId
    ]);
};
exports.genReputationNullifier = genReputationNullifier;
const genNewSMT = async (treeDepth, defaultLeafHash) => {
    return crypto_1.SparseMerkleTreeImpl.create(new keyv_1.default(), treeDepth, defaultLeafHash);
};
exports.genNewSMT = genNewSMT;
const verifyEpochKeyProofEvent = async (event) => {
    var _a;
    const args = (_a = event === null || event === void 0 ? void 0 : event.args) === null || _a === void 0 ? void 0 : _a._proof;
    const emptyArray = [];
    const formatPublicSignals = emptyArray.concat(args === null || args === void 0 ? void 0 : args.globalStateTree, args === null || args === void 0 ? void 0 : args.epoch, args === null || args === void 0 ? void 0 : args.epochKey).map(n => BigInt(n));
    const formatProof = (0, circuits_1.formatProofForSnarkjsVerification)(args === null || args === void 0 ? void 0 : args.proof);
    const isProofValid = await (0, circuits_1.verifyProof)(circuits_1.Circuit.verifyEpochKey, formatProof, formatPublicSignals);
    return isProofValid;
};
exports.verifyEpochKeyProofEvent = verifyEpochKeyProofEvent;
const verifyReputationProofEvent = async (event) => {
    var _a;
    const args = (_a = event === null || event === void 0 ? void 0 : event.args) === null || _a === void 0 ? void 0 : _a._proof;
    const emptyArray = [];
    const formatPublicSignals = emptyArray.concat(args === null || args === void 0 ? void 0 : args.repNullifiers, args === null || args === void 0 ? void 0 : args.epoch, args === null || args === void 0 ? void 0 : args.epochKey, args === null || args === void 0 ? void 0 : args.globalStateTree, args === null || args === void 0 ? void 0 : args.attesterId, args === null || args === void 0 ? void 0 : args.proveReputationAmount, args === null || args === void 0 ? void 0 : args.minRep, args === null || args === void 0 ? void 0 : args.proveGraffiti, args === null || args === void 0 ? void 0 : args.graffitiPreImage).map(n => BigInt(n));
    const formatProof = (0, circuits_1.formatProofForSnarkjsVerification)(args === null || args === void 0 ? void 0 : args.proof);
    const isProofValid = await (0, circuits_1.verifyProof)(circuits_1.Circuit.proveReputation, formatProof, formatPublicSignals);
    return isProofValid;
};
exports.verifyReputationProofEvent = verifyReputationProofEvent;
const verifySignUpProofEvent = async (event) => {
    var _a;
    const args = (_a = event === null || event === void 0 ? void 0 : event.args) === null || _a === void 0 ? void 0 : _a._proof;
    const emptyArray = [];
    const formatPublicSignals = emptyArray.concat(args === null || args === void 0 ? void 0 : args.epoch, args === null || args === void 0 ? void 0 : args.epochKey, args === null || args === void 0 ? void 0 : args.globalStateTree, args === null || args === void 0 ? void 0 : args.attesterId, args === null || args === void 0 ? void 0 : args.userHasSignedUp).map(n => BigInt(n));
    const formatProof = (0, circuits_1.formatProofForSnarkjsVerification)(args === null || args === void 0 ? void 0 : args.proof);
    const isProofValid = await (0, circuits_1.verifyProof)(circuits_1.Circuit.proveUserSignUp, formatProof, formatPublicSignals);
    return isProofValid;
};
exports.verifySignUpProofEvent = verifySignUpProofEvent;
const verifyStartTransitionProofEvent = async (event) => {
    const args = event === null || event === void 0 ? void 0 : event.args;
    const emptyArray = [];
    const formatPublicSignals = emptyArray.concat(args === null || args === void 0 ? void 0 : args._blindedUserState, args === null || args === void 0 ? void 0 : args._blindedHashChain, args === null || args === void 0 ? void 0 : args._globalStateTree).map(n => BigInt(n));
    const formatProof = (0, circuits_1.formatProofForSnarkjsVerification)(args === null || args === void 0 ? void 0 : args._proof);
    const isProofValid = await (0, circuits_1.verifyProof)(circuits_1.Circuit.startTransition, formatProof, formatPublicSignals);
    return isProofValid;
};
exports.verifyStartTransitionProofEvent = verifyStartTransitionProofEvent;
const verifyProcessAttestationEvent = async (event) => {
    const args = event === null || event === void 0 ? void 0 : event.args;
    const emptyArray = [];
    const formatPublicSignals = emptyArray.concat(args === null || args === void 0 ? void 0 : args._outputBlindedUserState, args === null || args === void 0 ? void 0 : args._outputBlindedHashChain, args === null || args === void 0 ? void 0 : args._inputBlindedUserState).map(n => BigInt(n));
    const formatProof = (0, circuits_1.formatProofForSnarkjsVerification)(args === null || args === void 0 ? void 0 : args._proof);
    const isProofValid = await (0, circuits_1.verifyProof)(circuits_1.Circuit.processAttestations, formatProof, formatPublicSignals);
    return isProofValid;
};
exports.verifyProcessAttestationEvent = verifyProcessAttestationEvent;
const verifyUserStateTransitionEvent = async (event) => {
    var _a;
    const transitionArgs = (_a = event === null || event === void 0 ? void 0 : event.args) === null || _a === void 0 ? void 0 : _a._proof;
    const emptyArray = [];
    let formatPublicSignals = emptyArray.concat(transitionArgs.newGlobalStateTreeLeaf, transitionArgs.epkNullifiers, transitionArgs.transitionFromEpoch, transitionArgs.blindedUserStates, transitionArgs.fromGlobalStateTree, transitionArgs.blindedHashChains, transitionArgs.fromEpochTree).map(n => BigInt(n));
    let formatProof = (0, circuits_1.formatProofForSnarkjsVerification)(transitionArgs.proof);
    const isProofValid = await (0, circuits_1.verifyProof)(circuits_1.Circuit.userStateTransition, formatProof, formatPublicSignals);
    return isProofValid;
};
exports.verifyUserStateTransitionEvent = verifyUserStateTransitionEvent;
const verifyUSTEvents = async (transitionEvent, startTransitionEvent, processAttestationEvents) => {
    var _a;
    // verify the final UST proof
    const isValid = await verifyUserStateTransitionEvent(transitionEvent);
    if (!isValid)
        return false;
    // verify the start transition proof
    const isStartTransitionProofValid = await verifyStartTransitionProofEvent(startTransitionEvent);
    if (!isStartTransitionProofValid)
        return false;
    // verify process attestations proofs
    const transitionArgs = (_a = transitionEvent === null || transitionEvent === void 0 ? void 0 : transitionEvent.args) === null || _a === void 0 ? void 0 : _a._proof;
    const isProcessAttestationValid = await verifyProcessAttestationEvents(processAttestationEvents, transitionArgs.blindedUserStates[0], transitionArgs.blindedUserStates[1]);
    if (!isProcessAttestationValid)
        return false;
    return true;
};
exports.verifyUSTEvents = verifyUSTEvents;
const verifyProcessAttestationEvents = async (processAttestationEvents, startBlindedUserState, finalBlindedUserState) => {
    var _a;
    let currentBlindedUserState = startBlindedUserState;
    // The rest are process attestations proofs
    for (let i = 0; i < processAttestationEvents.length; i++) {
        const args = (_a = processAttestationEvents[i]) === null || _a === void 0 ? void 0 : _a.args;
        const isValid = await verifyProcessAttestationEvent(processAttestationEvents[i]);
        if (!isValid)
            return false;
        currentBlindedUserState = args === null || args === void 0 ? void 0 : args._outputBlindedUserState;
    }
    return currentBlindedUserState.eq(finalBlindedUserState);
};
exports.verifyProcessAttestationEvents = verifyProcessAttestationEvents;
const genUnirepStateFromParams = (_unirepState) => {
    const parsedGSTLeaves = {};
    const parsedEpochTreeLeaves = {};
    const parsedNullifiers = {};
    const parsedAttestationsMap = {};
    for (let key in _unirepState.GSTLeaves) {
        parsedGSTLeaves[key] = _unirepState.GSTLeaves[key].map(n => BigInt(n));
    }
    for (let key in _unirepState.epochTreeLeaves) {
        const leaves = [];
        _unirepState.epochTreeLeaves[key].map(n => {
            const splitStr = n.split(": ");
            const epochTreeLeaf = {
                epochKey: BigInt(splitStr[0]),
                hashchainResult: BigInt(splitStr[1])
            };
            leaves.push(epochTreeLeaf);
        });
        parsedEpochTreeLeaves[key] = leaves;
    }
    for (let n of _unirepState.nullifiers) {
        parsedNullifiers[n] = true;
    }
    for (let key in _unirepState.latestEpochKeyToAttestationsMap) {
        const parsedAttestations = [];
        for (const attestation of _unirepState.latestEpochKeyToAttestationsMap[key]) {
            const jsonAttestation = JSON.parse(attestation);
            const attestClass = new UnirepState_1.Attestation(BigInt(jsonAttestation.attesterId), BigInt(jsonAttestation.posRep), BigInt(jsonAttestation.negRep), BigInt(jsonAttestation.graffiti), BigInt(jsonAttestation.signUp));
            parsedAttestations.push(attestClass);
        }
        parsedAttestationsMap[key] = parsedAttestations;
    }
    const unirepState = new UnirepState_1.UnirepState(_unirepState.settings, _unirepState.currentEpoch, _unirepState.latestProcessedBlock, parsedGSTLeaves, parsedEpochTreeLeaves, parsedAttestationsMap, parsedNullifiers);
    return unirepState;
};
exports.genUnirepStateFromParams = genUnirepStateFromParams;
/*
 * Retrieves and parses on-chain Unirep contract data to create an off-chain
 * representation as a UnirepState object.
 * @param provider An Ethereum provider
 * @param address The address of the Unirep contract
 * @param startBlock The block number when Unirep contract is deployed
 */
const genUnirepStateFromContract = async (provider, address, _unirepState) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const unirepContract = await (0, contracts_1.getUnirepContract)(address, provider);
    let unirepState;
    if (_unirepState === undefined) {
        const treeDepths_ = await unirepContract.treeDepths();
        const globalStateTreeDepth = treeDepths_.globalStateTreeDepth;
        const userStateTreeDepth = treeDepths_.userStateTreeDepth;
        const epochTreeDepth = treeDepths_.epochTreeDepth;
        const attestingFee = await unirepContract.attestingFee();
        const epochLength = await unirepContract.epochLength();
        const numEpochKeyNoncePerEpoch = await unirepContract.numEpochKeyNoncePerEpoch();
        const maxReputationBudget = await unirepContract.maxReputationBudget();
        const setting = {
            globalStateTreeDepth: globalStateTreeDepth,
            userStateTreeDepth: userStateTreeDepth,
            epochTreeDepth: epochTreeDepth,
            attestingFee: attestingFee,
            epochLength: epochLength.toNumber(),
            numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
            maxReputationBudget: maxReputationBudget,
        };
        unirepState = new UnirepState_1.UnirepState(setting);
    }
    else {
        unirepState = genUnirepStateFromParams(_unirepState);
    }
    const latestBlock = _unirepState === null || _unirepState === void 0 ? void 0 : _unirepState.latestProcessedBlock;
    const startBlock = latestBlock != undefined ? latestBlock + 1 : defaults_1.DEFAULT_START_BLOCK;
    const UserSignedUpFilter = unirepContract.filters.UserSignedUp();
    const userSignedUpEvents = await unirepContract.queryFilter(UserSignedUpFilter, startBlock);
    const UserStateTransitionedFilter = unirepContract.filters.UserStateTransitioned();
    const userStateTransitionedEvents = await unirepContract.queryFilter(UserStateTransitionedFilter, startBlock);
    const attestationSubmittedFilter = unirepContract.filters.AttestationSubmitted();
    const attestationSubmittedEvents = await unirepContract.queryFilter(attestationSubmittedFilter, startBlock);
    const epochEndedFilter = unirepContract.filters.EpochEnded();
    const epochEndedEvents = await unirepContract.queryFilter(epochEndedFilter, startBlock);
    const sequencerFilter = unirepContract.filters.Sequencer();
    const sequencerEvents = await unirepContract.queryFilter(sequencerFilter, startBlock);
    // proof events
    const transitionFilter = unirepContract.filters.IndexedUserStateTransitionProof();
    const transitionEvents = await unirepContract.queryFilter(transitionFilter);
    const startTransitionFilter = unirepContract.filters.IndexedStartedTransitionProof();
    const startTransitionEvents = await unirepContract.queryFilter(startTransitionFilter);
    const processAttestationsFilter = unirepContract.filters.IndexedProcessedAttestationsProof();
    const processAttestationsEvents = await unirepContract.queryFilter(processAttestationsFilter);
    const epochKeyProofFilter = unirepContract.filters.IndexedEpochKeyProof();
    const epochKeyProofEvent = await unirepContract.queryFilter(epochKeyProofFilter);
    const repProofFilter = unirepContract.filters.IndexedReputationProof();
    const repProofEvent = await unirepContract.queryFilter(repProofFilter);
    const signUpProofFilter = unirepContract.filters.IndexedUserSignedUpProof();
    const signUpProofEvent = await unirepContract.queryFilter(signUpProofFilter);
    // Reverse the events so pop() can start from the first event
    userSignedUpEvents.reverse();
    attestationSubmittedEvents.reverse();
    epochEndedEvents.reverse();
    userStateTransitionedEvents.reverse();
    const proofIndexMap = {};
    const isProofIndexValid = {};
    const events = transitionEvents.concat(startTransitionEvents, processAttestationsEvents, epochKeyProofEvent, repProofEvent, signUpProofEvent);
    for (const event of events) {
        const proofIndex = Number((_a = event === null || event === void 0 ? void 0 : event.args) === null || _a === void 0 ? void 0 : _a._proofIndex);
        proofIndexMap[proofIndex] = event;
    }
    for (let i = 0; i < sequencerEvents.length; i++) {
        const sequencerEvent = sequencerEvents[i];
        // console.log('Generating Unirep State progress: ', i, '/', sequencerEvents.length)
        const blockNumber = sequencerEvent.blockNumber;
        if (blockNumber < startBlock)
            continue;
        const occurredEvent = (_b = sequencerEvent.args) === null || _b === void 0 ? void 0 : _b._event;
        if (occurredEvent === contracts_1.Event.UserSignedUp) {
            const signUpEvent = userSignedUpEvents.pop();
            if (signUpEvent === undefined) {
                console.log(`Event sequence mismatch: missing UserSignedUp event`);
                continue;
            }
            const args = signUpEvent === null || signUpEvent === void 0 ? void 0 : signUpEvent.args;
            const epoch = Number(args === null || args === void 0 ? void 0 : args._epoch);
            const commitment = BigInt(args === null || args === void 0 ? void 0 : args._identityCommitment);
            const attesterId = Number(args === null || args === void 0 ? void 0 : args._attesterId);
            const airdrop = Number(args === null || args === void 0 ? void 0 : args._airdropAmount);
            await unirepState.signUp(epoch, commitment, attesterId, airdrop, blockNumber);
        }
        else if (occurredEvent === contracts_1.Event.AttestationSubmitted) {
            const attestationSubmittedEvent = attestationSubmittedEvents.pop();
            if (attestationSubmittedEvent === undefined) {
                console.log(`Event sequence mismatch: missing AttestationSubmitted event`);
                continue;
            }
            const args = attestationSubmittedEvent === null || attestationSubmittedEvent === void 0 ? void 0 : attestationSubmittedEvent.args;
            const epoch = Number(args === null || args === void 0 ? void 0 : args._epoch);
            const proofIndex = Number(args === null || args === void 0 ? void 0 : args._proofIndex);
            const attestation_ = args === null || args === void 0 ? void 0 : args._attestation;
            const event = proofIndexMap[proofIndex];
            const results = (_c = event === null || event === void 0 ? void 0 : event.args) === null || _c === void 0 ? void 0 : _c._proof;
            if (isProofIndexValid[proofIndex] === undefined) {
                let isValid;
                if (event.event === "IndexedEpochKeyProof") {
                    isValid = await verifyEpochKeyProofEvent(event);
                }
                else if (event.event === "IndexedReputationProof") {
                    isValid = await verifyReputationProofEvent(event);
                }
                else if (event.event === "IndexedUserSignedUpProof") {
                    isValid = await verifySignUpProofEvent(event);
                }
                else {
                    console.log('Cannot find the attestation event');
                    continue;
                }
                // verify the proof of the given proof index
                if (!isValid) {
                    console.log('Proof is invalid: ', event.event, ' , transaction hash: ', event.transactionHash);
                    isProofIndexValid[proofIndex] = false;
                    continue;
                }
                // verify GSTRoot of the proof
                const isGSTRootExisted = unirepState.GSTRootExists(results === null || results === void 0 ? void 0 : results.globalStateTree, epoch);
                if (!isGSTRootExisted) {
                    console.log('Global state tree root does not exist');
                    isProofIndexValid[proofIndex] = false;
                    continue;
                }
                // if it is SpendRepuation event, check the reputation nullifiers
                if ((args === null || args === void 0 ? void 0 : args._event) === contracts_1.AttestationEvent.SpendReputation) {
                    let validNullifier = true;
                    const nullifiers = results === null || results === void 0 ? void 0 : results.repNullifiers.map(n => BigInt(n));
                    const nullifiersAmount = Number(results === null || results === void 0 ? void 0 : results.proveReputationAmount);
                    for (let j = 0; j < nullifiersAmount; j++) {
                        if (unirepState.nullifierExist(nullifiers[j])) {
                            console.log('duplicated nullifier', BigInt(nullifiers[j]).toString());
                            validNullifier = false;
                            break;
                        }
                    }
                    if (validNullifier) {
                        for (let j = 0; j < nullifiersAmount; j++) {
                            unirepState.addReputationNullifiers(nullifiers[j], blockNumber);
                        }
                    }
                    else {
                        isProofIndexValid[proofIndex] = false;
                        continue;
                    }
                }
                isProofIndexValid[proofIndex] = true;
            }
            if (isProofIndexValid[proofIndex]) {
                // update attestation
                const attestation = new UnirepState_1.Attestation(BigInt(attestation_.attesterId), BigInt(attestation_.posRep), BigInt(attestation_.negRep), BigInt(attestation_.graffiti), BigInt(attestation_.signUp));
                const epochKey = args === null || args === void 0 ? void 0 : args._epochKey;
                if (epochKey.eq(results === null || results === void 0 ? void 0 : results.epochKey)) {
                    unirepState.addAttestation(epochKey.toString(), attestation, blockNumber);
                }
            }
        }
        else if (occurredEvent === contracts_1.Event.EpochEnded) {
            const epochEndedEvent = epochEndedEvents.pop();
            if (epochEndedEvent === undefined) {
                console.log(`Event sequence mismatch: missing epochEndedEvent`);
                continue;
            }
            const epoch = (_d = epochEndedEvent.args) === null || _d === void 0 ? void 0 : _d._epoch.toNumber();
            await unirepState.epochTransition(epoch, blockNumber);
        }
        else if (occurredEvent === contracts_1.Event.UserStateTransitioned) {
            const userStateTransitionedEvent = userStateTransitionedEvents.pop();
            if (userStateTransitionedEvent === undefined) {
                console.log(`Event sequence mismatch: missing userStateTransitionedEvent`);
                continue;
            }
            const args = userStateTransitionedEvent === null || userStateTransitionedEvent === void 0 ? void 0 : userStateTransitionedEvent.args;
            const epoch = Number(args === null || args === void 0 ? void 0 : args._epoch);
            const newLeaf = BigInt(args === null || args === void 0 ? void 0 : args._hashedLeaf);
            const proofIndex = Number(args === null || args === void 0 ? void 0 : args._proofIndex);
            const event = proofIndexMap[proofIndex];
            const proofArgs = (_e = event === null || event === void 0 ? void 0 : event.args) === null || _e === void 0 ? void 0 : _e._proof;
            const fromEpoch = Number(proofArgs === null || proofArgs === void 0 ? void 0 : proofArgs.transitionFromEpoch);
            if (isProofIndexValid[proofIndex] === undefined) {
                let isValid = false;
                if (event.event !== "IndexedUserStateTransitionProof") {
                    isProofIndexValid[proofIndex] = false;
                    continue;
                }
                const proofIndexes = (_f = event === null || event === void 0 ? void 0 : event.args) === null || _f === void 0 ? void 0 : _f._proofIndexRecords.map(n => Number(n));
                const startTransitionEvent = proofIndexMap[proofIndexes[0]];
                if (startTransitionEvent === undefined ||
                    (startTransitionEvent === null || startTransitionEvent === void 0 ? void 0 : startTransitionEvent.event) !== "IndexedStartedTransitionProof") {
                    isProofIndexValid[proofIndex] = false;
                    continue;
                }
                const processAttestationEvents = [];
                for (let j = 1; j < proofIndexes.length; j++) {
                    if (proofIndexes[j] === 0)
                        isValid = false;
                    const processAttestationEvent = proofIndexMap[proofIndexes[j]];
                    if (processAttestationEvent === undefined ||
                        (processAttestationEvent === null || processAttestationEvent === void 0 ? void 0 : processAttestationEvent.event) !== "IndexedProcessedAttestationsProof") {
                        isProofIndexValid[proofIndex] = false;
                        continue;
                    }
                    processAttestationEvents.push(processAttestationEvent);
                }
                isValid = await verifyUSTEvents(event, startTransitionEvent, processAttestationEvents);
                if (!isValid) {
                    console.log('Proof is invalid: ', event.event, ' , transaction hash: ', event.transactionHash);
                    isProofIndexValid[proofIndex] = false;
                    continue;
                }
                const GSTRoot = proofArgs === null || proofArgs === void 0 ? void 0 : proofArgs.fromGlobalStateTree;
                // check if GST root matches
                const isGSTRootExisted = unirepState.GSTRootExists(GSTRoot, fromEpoch);
                if (!isGSTRootExisted) {
                    console.log('Global state tree root does not exist');
                    isProofIndexValid[proofIndex] = false;
                    continue;
                }
                // Check if epoch tree root matches
                const epochTreeRoot = proofArgs === null || proofArgs === void 0 ? void 0 : proofArgs.fromEpochTree;
                const isEpochTreeExisted = await unirepState.epochTreeRootExists(epochTreeRoot, fromEpoch);
                if (!isEpochTreeExisted) {
                    console.log('Epoch tree root mismatches');
                    isProofIndexValid[proofIndex] = false;
                    continue;
                }
                isProofIndexValid[proofIndex] = true;
            }
            if (isProofIndexValid[proofIndex]) {
                const epkNullifiersInEvent = (_g = proofArgs === null || proofArgs === void 0 ? void 0 : proofArgs.epkNullifiers) === null || _g === void 0 ? void 0 : _g.map(n => BigInt(n));
                let exist = false;
                for (let nullifier of epkNullifiersInEvent) {
                    if (unirepState.nullifierExist(nullifier)) {
                        console.log('duplicated nullifier', nullifier.toString());
                        exist = true;
                        break;
                    }
                }
                if (!exist) {
                    unirepState.userStateTransition(fromEpoch, newLeaf, epkNullifiersInEvent, blockNumber);
                }
            }
        }
        else {
            console.log('unexpected event', occurredEvent);
        }
    }
    return unirepState;
};
exports.genUnirepStateFromContract = genUnirepStateFromContract;
/*
 * Create UserState object from given user state and
 * retrieves and parses on-chain Unirep contract data to create an off-chain
 * representation as a UserState object (including UnirepState object).
 * (This assumes user has already signed up in the Unirep contract)
 * @param userIdentity The semaphore identity of the user
 * @param _userState The stored user state that the function start with
 */
const genUserStateFromParams = (userIdentity, _userState) => {
    const unirepState = genUnirepStateFromParams(_userState.unirepState);
    const userStateLeaves = [];
    const transitionedFromAttestations = {};
    for (const key in _userState.latestUserStateLeaves) {
        const parsedLeaf = JSON.parse(_userState.latestUserStateLeaves[key]);
        const leaf = {
            attesterId: BigInt(key),
            reputation: new UserState_1.Reputation(BigInt(parsedLeaf.posRep), BigInt(parsedLeaf.negRep), BigInt(parsedLeaf.graffiti), BigInt(parsedLeaf.signUp))
        };
        userStateLeaves.push(leaf);
    }
    for (const key in _userState.transitionedFromAttestations) {
        transitionedFromAttestations[key] = [];
        for (const attest of _userState.transitionedFromAttestations[key]) {
            const parsedAttest = JSON.parse(attest);
            const attestation = new UnirepState_1.Attestation(BigInt(parsedAttest.attesterId), BigInt(parsedAttest.posRep), BigInt(parsedAttest.negRep), BigInt(parsedAttest.graffiti), BigInt(parsedAttest.signUp));
            transitionedFromAttestations[key].push(attestation);
        }
    }
    const userState = new UserState_1.UserState(unirepState, userIdentity, _userState.hasSignedUp, _userState.latestTransitionedEpoch, _userState.latestGSTLeafIndex, userStateLeaves, transitionedFromAttestations);
    return userState;
};
exports.genUserStateFromParams = genUserStateFromParams;
/*
 * This function works mostly the same as genUnirepStateFromContract,
 * except that it also updates the user's state during events processing.
 * @param provider An Ethereum provider
 * @param address The address of the Unirep contract
 * @param userIdentity The semaphore identity of the user
 * @param _userState The stored user state that the function start with
 */
const genUserStateFromContract = async (provider, address, userIdentity, _userState) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const unirepContract = await (0, contracts_1.getUnirepContract)(address, provider);
    let unirepState;
    let userState;
    if (_userState === undefined) {
        const treeDepths_ = await unirepContract.treeDepths();
        const globalStateTreeDepth = treeDepths_.globalStateTreeDepth;
        const userStateTreeDepth = treeDepths_.userStateTreeDepth;
        const epochTreeDepth = treeDepths_.epochTreeDepth;
        const attestingFee = await unirepContract.attestingFee();
        const epochLength = await unirepContract.epochLength();
        const numEpochKeyNoncePerEpoch = await unirepContract.numEpochKeyNoncePerEpoch();
        const maxReputationBudget = await unirepContract.maxReputationBudget();
        const setting = {
            globalStateTreeDepth: globalStateTreeDepth,
            userStateTreeDepth: userStateTreeDepth,
            epochTreeDepth: epochTreeDepth,
            attestingFee: attestingFee,
            epochLength: epochLength.toNumber(),
            numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
            maxReputationBudget: maxReputationBudget,
        };
        unirepState = new UnirepState_1.UnirepState(setting);
        userState = new UserState_1.UserState(unirepState, userIdentity);
    }
    else {
        userState = genUserStateFromParams(userIdentity, _userState);
        unirepState = userState.getUnirepState();
    }
    const latestBlock = unirepState === null || unirepState === void 0 ? void 0 : unirepState.latestProcessedBlock;
    const startBlock = latestBlock != undefined ? latestBlock + 1 : defaults_1.DEFAULT_START_BLOCK;
    const UserSignedUpFilter = unirepContract.filters.UserSignedUp();
    const userSignedUpEvents = await unirepContract.queryFilter(UserSignedUpFilter, startBlock);
    const UserStateTransitionedFilter = unirepContract.filters.UserStateTransitioned();
    const userStateTransitionedEvents = await unirepContract.queryFilter(UserStateTransitionedFilter, startBlock);
    const attestationSubmittedFilter = unirepContract.filters.AttestationSubmitted();
    const attestationSubmittedEvents = await unirepContract.queryFilter(attestationSubmittedFilter, startBlock);
    const epochEndedFilter = unirepContract.filters.EpochEnded();
    const epochEndedEvents = await unirepContract.queryFilter(epochEndedFilter, startBlock);
    const sequencerFilter = unirepContract.filters.Sequencer();
    const sequencerEvents = await unirepContract.queryFilter(sequencerFilter, startBlock);
    // proof events
    const transitionFilter = unirepContract.filters.IndexedUserStateTransitionProof();
    const transitionEvents = await unirepContract.queryFilter(transitionFilter);
    const startTransitionFilter = unirepContract.filters.IndexedStartedTransitionProof();
    const startTransitionEvents = await unirepContract.queryFilter(startTransitionFilter);
    const processAttestationsFilter = unirepContract.filters.IndexedProcessedAttestationsProof();
    const processAttestationsEvents = await unirepContract.queryFilter(processAttestationsFilter);
    const epochKeyProofFilter = unirepContract.filters.IndexedEpochKeyProof();
    const epochKeyProofEvent = await unirepContract.queryFilter(epochKeyProofFilter);
    const repProofFilter = unirepContract.filters.IndexedReputationProof();
    const repProofEvent = await unirepContract.queryFilter(repProofFilter);
    const signUpProofFilter = unirepContract.filters.IndexedUserSignedUpProof();
    const signUpProofEvent = await unirepContract.queryFilter(signUpProofFilter);
    // Reverse the events so pop() can start from the first event
    userSignedUpEvents.reverse();
    attestationSubmittedEvents.reverse();
    epochEndedEvents.reverse();
    userStateTransitionedEvents.reverse();
    const proofIndexMap = {};
    const isProofIndexValid = {};
    const events = transitionEvents.concat(startTransitionEvents, processAttestationsEvents, epochKeyProofEvent, repProofEvent, signUpProofEvent);
    for (const event of events) {
        const proofIndex = Number((_a = event === null || event === void 0 ? void 0 : event.args) === null || _a === void 0 ? void 0 : _a._proofIndex);
        proofIndexMap[proofIndex] = event;
    }
    for (let i = 0; i < sequencerEvents.length; i++) {
        // console.log('Generating User State progress: ', i, '/', sequencerEvents.length)
        const sequencerEvent = sequencerEvents[i];
        const blockNumber = sequencerEvent.blockNumber;
        if (blockNumber < startBlock)
            continue;
        const occurredEvent = (_b = sequencerEvent.args) === null || _b === void 0 ? void 0 : _b._event;
        if (occurredEvent === contracts_1.Event.UserSignedUp) {
            const signUpEvent = userSignedUpEvents.pop();
            if (signUpEvent === undefined) {
                console.log(`Event sequence mismatch: missing UserSignedUp event`);
                continue;
            }
            const args = signUpEvent === null || signUpEvent === void 0 ? void 0 : signUpEvent.args;
            const epoch = Number(args === null || args === void 0 ? void 0 : args._epoch);
            const commitment = BigInt(args === null || args === void 0 ? void 0 : args._identityCommitment);
            const attesterId = Number(args === null || args === void 0 ? void 0 : args._attesterId);
            const airdrop = Number(args === null || args === void 0 ? void 0 : args._airdropAmount);
            await userState.signUp(epoch, commitment, attesterId, airdrop, blockNumber);
        }
        else if (occurredEvent === contracts_1.Event.AttestationSubmitted) {
            const attestationSubmittedEvent = attestationSubmittedEvents.pop();
            if (attestationSubmittedEvent === undefined) {
                console.log(`Event sequence mismatch: missing AttestationSubmitted event`);
                continue;
            }
            const args = attestationSubmittedEvent === null || attestationSubmittedEvent === void 0 ? void 0 : attestationSubmittedEvent.args;
            const epoch = Number(args === null || args === void 0 ? void 0 : args._epoch);
            const proofIndex = Number(args === null || args === void 0 ? void 0 : args._proofIndex);
            const attestation_ = args === null || args === void 0 ? void 0 : args._attestation;
            const event = proofIndexMap[proofIndex];
            const results = (_c = event === null || event === void 0 ? void 0 : event.args) === null || _c === void 0 ? void 0 : _c._proof;
            if (isProofIndexValid[proofIndex] === undefined) {
                let isValid;
                if (event.event === "IndexedEpochKeyProof") {
                    isValid = await verifyEpochKeyProofEvent(event);
                }
                else if (event.event === "IndexedReputationProof") {
                    isValid = await verifyReputationProofEvent(event);
                }
                else if (event.event === "IndexedUserSignedUpProof") {
                    isValid = await verifySignUpProofEvent(event);
                }
                else {
                    console.log('Cannot find the attestation event');
                    continue;
                }
                // verify the proof of the given proof index
                if (!isValid) {
                    console.log('Proof is invalid: ', event.event, ' , transaction hash: ', event.transactionHash);
                    isProofIndexValid[proofIndex] = false;
                    continue;
                }
                // verify GSTRoot of the proof
                const isGSTRootExisted = userState.GSTRootExists(results === null || results === void 0 ? void 0 : results.globalStateTree, epoch);
                if (!isGSTRootExisted) {
                    console.log('Global state tree root does not exist');
                    isProofIndexValid[proofIndex] = false;
                    continue;
                }
                // if it is SpendRepuation event, check the reputation nullifiers
                if ((args === null || args === void 0 ? void 0 : args._event) === contracts_1.AttestationEvent.SpendReputation) {
                    let validNullifier = true;
                    const nullifiers = results === null || results === void 0 ? void 0 : results.repNullifiers.map(n => BigInt(n));
                    const nullifiersAmount = Number(results === null || results === void 0 ? void 0 : results.proveReputationAmount);
                    for (let j = 0; j < nullifiersAmount; j++) {
                        if (userState.nullifierExist(nullifiers[j])) {
                            console.log('duplicated nullifier', BigInt(nullifiers[j]).toString());
                            validNullifier = false;
                            break;
                        }
                    }
                    if (validNullifier) {
                        for (let j = 0; j < nullifiersAmount; j++) {
                            userState.addReputationNullifiers(nullifiers[j], blockNumber);
                        }
                    }
                    else {
                        isProofIndexValid[proofIndex] = false;
                        continue;
                    }
                }
                isProofIndexValid[proofIndex] = true;
            }
            if (isProofIndexValid[proofIndex]) {
                // update attestation
                const attestation = new UnirepState_1.Attestation(BigInt(attestation_.attesterId), BigInt(attestation_.posRep), BigInt(attestation_.negRep), BigInt(attestation_.graffiti), BigInt(attestation_.signUp));
                const epochKey = args === null || args === void 0 ? void 0 : args._epochKey;
                if (epochKey.eq(results === null || results === void 0 ? void 0 : results.epochKey)) {
                    userState.addAttestation(epochKey.toString(), attestation, blockNumber);
                }
            }
        }
        else if (occurredEvent === contracts_1.Event.EpochEnded) {
            const epochEndedEvent = epochEndedEvents.pop();
            if (epochEndedEvent === undefined) {
                console.log(`Event sequence mismatch: missing epochEndedEvent`);
                continue;
            }
            const epoch = (_d = epochEndedEvent.args) === null || _d === void 0 ? void 0 : _d._epoch.toNumber();
            await userState.epochTransition(epoch, blockNumber);
        }
        else if (occurredEvent === contracts_1.Event.UserStateTransitioned) {
            const userStateTransitionedEvent = userStateTransitionedEvents.pop();
            if (userStateTransitionedEvent === undefined) {
                console.log(`Event sequence mismatch: missing userStateTransitionedEvent`);
                continue;
            }
            const args = userStateTransitionedEvent === null || userStateTransitionedEvent === void 0 ? void 0 : userStateTransitionedEvent.args;
            const epoch = Number(args === null || args === void 0 ? void 0 : args._epoch);
            const newLeaf = BigInt(args === null || args === void 0 ? void 0 : args._hashedLeaf);
            const proofIndex = Number(args === null || args === void 0 ? void 0 : args._proofIndex);
            const event = proofIndexMap[proofIndex];
            const proofArgs = (_e = event === null || event === void 0 ? void 0 : event.args) === null || _e === void 0 ? void 0 : _e._proof;
            const fromEpoch = Number(proofArgs === null || proofArgs === void 0 ? void 0 : proofArgs.transitionFromEpoch);
            if (isProofIndexValid[proofIndex] === undefined) {
                let isValid = false;
                if (event.event !== "IndexedUserStateTransitionProof") {
                    isProofIndexValid[proofIndex] = false;
                    continue;
                }
                const proofIndexes = (_f = event === null || event === void 0 ? void 0 : event.args) === null || _f === void 0 ? void 0 : _f._proofIndexRecords.map(n => Number(n));
                const startTransitionEvent = proofIndexMap[proofIndexes[0]];
                if (startTransitionEvent === undefined ||
                    (startTransitionEvent === null || startTransitionEvent === void 0 ? void 0 : startTransitionEvent.event) !== "IndexedStartedTransitionProof") {
                    isProofIndexValid[proofIndex] = false;
                    continue;
                }
                const processAttestationEvents = [];
                for (let j = 1; j < proofIndexes.length; j++) {
                    if (proofIndexes[j] === 0)
                        isValid = false;
                    const processAttestationEvent = proofIndexMap[proofIndexes[j]];
                    if (processAttestationEvent === undefined ||
                        (processAttestationEvent === null || processAttestationEvent === void 0 ? void 0 : processAttestationEvent.event) !== "IndexedProcessedAttestationsProof") {
                        isProofIndexValid[proofIndex] = false;
                        continue;
                    }
                    processAttestationEvents.push(processAttestationEvent);
                }
                isValid = await verifyUSTEvents(event, startTransitionEvent, processAttestationEvents);
                if (!isValid) {
                    console.log('Proof is invalid: ', event.event, ' , transaction hash: ', event.transactionHash);
                    isProofIndexValid[proofIndex] = false;
                    continue;
                }
                const GSTRoot = proofArgs === null || proofArgs === void 0 ? void 0 : proofArgs.fromGlobalStateTree;
                // check if GST root matches
                const isGSTRootExisted = userState.GSTRootExists(GSTRoot, fromEpoch);
                if (!isGSTRootExisted) {
                    console.log('Global state tree root does not exist');
                    isProofIndexValid[proofIndex] = false;
                    continue;
                }
                // Check if epoch tree root matches
                const epochTreeRoot = proofArgs === null || proofArgs === void 0 ? void 0 : proofArgs.fromEpochTree;
                const isEpochTreeExisted = await userState.epochTreeRootExists(epochTreeRoot, fromEpoch);
                if (!isEpochTreeExisted) {
                    console.log('Epoch tree root mismatches');
                    isProofIndexValid[proofIndex] = false;
                    continue;
                }
                isProofIndexValid[proofIndex] = true;
            }
            if (isProofIndexValid[proofIndex]) {
                const epkNullifiersInEvent = (_g = proofArgs === null || proofArgs === void 0 ? void 0 : proofArgs.epkNullifiers) === null || _g === void 0 ? void 0 : _g.map(n => BigInt(n));
                let exist = false;
                for (let nullifier of epkNullifiersInEvent) {
                    if (userState.nullifierExist(nullifier)) {
                        console.log('duplicated nullifier', nullifier.toString());
                        exist = true;
                        break;
                    }
                }
                if (!exist) {
                    await userState.userStateTransition(fromEpoch, newLeaf, epkNullifiersInEvent, blockNumber);
                }
            }
        }
        else {
            console.log('unexpected event', occurredEvent);
        }
    }
    return userState;
};
exports.genUserStateFromContract = genUserStateFromContract;
