"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.genUserStateFromParams = exports.genUserStateFromContract = exports.genUnirepStateFromParams = exports.genUnirepStateFromContract = exports.genNewSMT = exports.genReputationNullifier = exports.genEpochKeyNullifier = exports.genEpochKey = exports.verifyUSTEvents = exports.verifyUserStateTransitionEvent = exports.verifyProcessAttestationEvents = exports.verifyProcessAttestationEvent = exports.verifyStartTransitionProofEvent = exports.verifySignUpProofEvent = exports.verifyReputationProofEvent = exports.verifyEpochKeyProofEvent = exports.formatProofForSnarkjsVerification = exports.getTreeDepthsForTesting = exports.computeInitUserStateRoot = exports.computeEmptyUserStateRoot = exports.SMT_ZERO_LEAF = exports.SMT_ONE_LEAF = exports.defaultUserStateLeaf = void 0;
const keyv_1 = __importDefault(require("keyv"));
const assert_1 = __importDefault(require("assert"));
const contracts_1 = require("@unirep/contracts");
const crypto_1 = require("@unirep/crypto");
const testLocal_1 = require("../config/testLocal");
const UnirepState_1 = require("./UnirepState");
const UserState_1 = require("./UserState");
const nullifierDomainSeparator_1 = require("../config/nullifierDomainSeparator");
const circuits_1 = require("@unirep/circuits");
const defaults_1 = require("../cli/defaults");
const defaultUserStateLeaf = crypto_1.hash5([BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)]);
exports.defaultUserStateLeaf = defaultUserStateLeaf;
const SMT_ZERO_LEAF = crypto_1.hashLeftRight(BigInt(0), BigInt(0));
exports.SMT_ZERO_LEAF = SMT_ZERO_LEAF;
const SMT_ONE_LEAF = crypto_1.hashLeftRight(BigInt(1), BigInt(0));
exports.SMT_ONE_LEAF = SMT_ONE_LEAF;
const computeEmptyUserStateRoot = (treeDepth) => {
    const t = new crypto_1.IncrementalQuinTree(treeDepth, defaultUserStateLeaf, 2);
    return t.root;
};
exports.computeEmptyUserStateRoot = computeEmptyUserStateRoot;
const computeInitUserStateRoot = async (treeDepth, leafIdx, airdropPosRep) => {
    const t = await crypto_1.SparseMerkleTreeImpl.create(new keyv_1.default(), treeDepth, defaultUserStateLeaf);
    const leafValue = crypto_1.hash5([BigInt(airdropPosRep), BigInt(0), BigInt(0), BigInt(1)]);
    await t.update(BigInt(leafIdx), leafValue);
    return t.getRootHash();
};
exports.computeInitUserStateRoot = computeInitUserStateRoot;
const getTreeDepthsForTesting = (deployEnv = "circuit") => {
    if (deployEnv === 'contract') {
        return {
            "userStateTreeDepth": testLocal_1.userStateTreeDepth,
            "globalStateTreeDepth": testLocal_1.globalStateTreeDepth,
            "epochTreeDepth": testLocal_1.epochTreeDepth,
        };
    }
    else if (deployEnv === 'circuit') {
        return {
            "userStateTreeDepth": testLocal_1.circuitUserStateTreeDepth,
            "globalStateTreeDepth": testLocal_1.circuitGlobalStateTreeDepth,
            "epochTreeDepth": testLocal_1.circuitEpochTreeDepth,
        };
    }
    else {
        throw new Error('Only contract and circuit testing env are supported');
    }
};
exports.getTreeDepthsForTesting = getTreeDepthsForTesting;
const genEpochKey = (identityNullifier, epoch, nonce, _epochTreeDepth = testLocal_1.circuitEpochTreeDepth) => {
    const values = [
        identityNullifier,
        epoch,
        nonce,
        BigInt(0),
        BigInt(0),
    ];
    let epochKey = crypto_1.hash5(values).toString();
    // Adjust epoch key size according to epoch tree depth
    const epochKeyModed = BigInt(epochKey) % BigInt(2 ** _epochTreeDepth);
    return epochKeyModed;
};
exports.genEpochKey = genEpochKey;
const genEpochKeyNullifier = (identityNullifier, epoch, nonce) => {
    return crypto_1.hash5([nullifierDomainSeparator_1.EPOCH_KEY_NULLIFIER_DOMAIN, identityNullifier, BigInt(epoch), BigInt(nonce), BigInt(0)]);
};
exports.genEpochKeyNullifier = genEpochKeyNullifier;
const genReputationNullifier = (identityNullifier, epoch, nonce, attesterId) => {
    return crypto_1.hash5([nullifierDomainSeparator_1.REPUTATION_NULLIFIER_DOMAIN, identityNullifier, BigInt(epoch), BigInt(nonce), attesterId]);
};
exports.genReputationNullifier = genReputationNullifier;
const genNewSMT = async (treeDepth, defaultLeafHash) => {
    return crypto_1.SparseMerkleTreeImpl.create(new keyv_1.default(), treeDepth, defaultLeafHash);
};
exports.genNewSMT = genNewSMT;
const formatProofForSnarkjsVerification = (_proof) => {
    return {
        pi_a: [
            _proof[0].toString(),
            _proof[1].toString(),
            '1'
        ],
        pi_b: [
            [
                _proof[3].toString(),
                _proof[2].toString()
            ],
            [
                _proof[5].toString(),
                _proof[4].toString()
            ],
            ['1', '0']
        ],
        pi_c: [
            _proof[6].toString(),
            _proof[7].toString(),
            '1'
        ],
        protocol: 'groth16',
        curve: 'bn128'
    };
};
exports.formatProofForSnarkjsVerification = formatProofForSnarkjsVerification;
const verifyEpochKeyProofEvent = async (event) => {
    var _a;
    const args = (_a = event === null || event === void 0 ? void 0 : event.args) === null || _a === void 0 ? void 0 : _a.epochKeyProofData;
    const emptyArray = [];
    const formatPublicSignals = emptyArray.concat(args === null || args === void 0 ? void 0 : args.globalStateTree, args === null || args === void 0 ? void 0 : args.epoch, args === null || args === void 0 ? void 0 : args.epochKey).map(n => BigInt(n).toString());
    const formatProof = formatProofForSnarkjsVerification(args === null || args === void 0 ? void 0 : args.proof);
    const isProofValid = await circuits_1.verifyProof(circuits_1.CircuitName.verifyEpochKey, formatProof, formatPublicSignals);
    return isProofValid;
};
exports.verifyEpochKeyProofEvent = verifyEpochKeyProofEvent;
const verifyReputationProofEvent = async (event) => {
    var _a;
    const args = (_a = event === null || event === void 0 ? void 0 : event.args) === null || _a === void 0 ? void 0 : _a.reputationProofData;
    const emptyArray = [];
    const formatPublicSignals = emptyArray.concat(args === null || args === void 0 ? void 0 : args.repNullifiers, args === null || args === void 0 ? void 0 : args.epoch, args === null || args === void 0 ? void 0 : args.epochKey, args === null || args === void 0 ? void 0 : args.globalStateTree, args === null || args === void 0 ? void 0 : args.attesterId, args === null || args === void 0 ? void 0 : args.proveReputationAmount, args === null || args === void 0 ? void 0 : args.minRep, args === null || args === void 0 ? void 0 : args.proveGraffiti, args === null || args === void 0 ? void 0 : args.graffitiPreImage).map(n => BigInt(n).toString());
    const formatProof = formatProofForSnarkjsVerification(args === null || args === void 0 ? void 0 : args.proof);
    const isProofValid = await circuits_1.verifyProof(circuits_1.CircuitName.proveReputation, formatProof, formatPublicSignals);
    return isProofValid;
};
exports.verifyReputationProofEvent = verifyReputationProofEvent;
const verifySignUpProofEvent = async (event) => {
    var _a;
    const args = (_a = event === null || event === void 0 ? void 0 : event.args) === null || _a === void 0 ? void 0 : _a.signUpProofData;
    const emptyArray = [];
    const formatPublicSignals = emptyArray.concat(args === null || args === void 0 ? void 0 : args.epoch, args === null || args === void 0 ? void 0 : args.epochKey, args === null || args === void 0 ? void 0 : args.globalStateTree, args === null || args === void 0 ? void 0 : args.attesterId, args === null || args === void 0 ? void 0 : args.userHasSignedUp).map(n => BigInt(n).toString());
    const formatProof = formatProofForSnarkjsVerification(args === null || args === void 0 ? void 0 : args.proof);
    const isProofValid = await circuits_1.verifyProof(circuits_1.CircuitName.proveUserSignUp, formatProof, formatPublicSignals);
    return isProofValid;
};
exports.verifySignUpProofEvent = verifySignUpProofEvent;
const verifyStartTransitionProofEvent = async (event) => {
    const args = event === null || event === void 0 ? void 0 : event.args;
    const emptyArray = [];
    const formatPublicSignals = emptyArray.concat(args === null || args === void 0 ? void 0 : args._blindedUserState, args === null || args === void 0 ? void 0 : args._blindedHashChain, args === null || args === void 0 ? void 0 : args._globalStateTree).map(n => BigInt(n).toString());
    const formatProof = formatProofForSnarkjsVerification(args === null || args === void 0 ? void 0 : args._proof);
    const isProofValid = await circuits_1.verifyProof(circuits_1.CircuitName.startTransition, formatProof, formatPublicSignals);
    return isProofValid;
};
exports.verifyStartTransitionProofEvent = verifyStartTransitionProofEvent;
const verifyProcessAttestationEvent = async (event) => {
    const args = event === null || event === void 0 ? void 0 : event.args;
    const emptyArray = [];
    const formatPublicSignals = emptyArray.concat(args === null || args === void 0 ? void 0 : args._outputBlindedUserState, args === null || args === void 0 ? void 0 : args._outputBlindedHashChain, args === null || args === void 0 ? void 0 : args._inputBlindedUserState).map(n => BigInt(n).toString());
    const formatProof = formatProofForSnarkjsVerification(args === null || args === void 0 ? void 0 : args._proof);
    const isProofValid = await circuits_1.verifyProof(circuits_1.CircuitName.processAttestations, formatProof, formatPublicSignals);
    return isProofValid;
};
exports.verifyProcessAttestationEvent = verifyProcessAttestationEvent;
const verifyUserStateTransitionEvent = async (event) => {
    var _a;
    const transitionArgs = (_a = event === null || event === void 0 ? void 0 : event.args) === null || _a === void 0 ? void 0 : _a.userTransitionedData;
    const emptyArray = [];
    let formatPublicSignals = emptyArray.concat(transitionArgs.newGlobalStateTreeLeaf, transitionArgs.epkNullifiers, transitionArgs.transitionFromEpoch, transitionArgs.blindedUserStates, transitionArgs.fromGlobalStateTree, transitionArgs.blindedHashChains, transitionArgs.fromEpochTree).map(n => BigInt(n).toString());
    let formatProof = formatProofForSnarkjsVerification(transitionArgs.proof);
    const isProofValid = await circuits_1.verifyProof(circuits_1.CircuitName.userStateTransition, formatProof, formatPublicSignals);
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
    const transitionArgs = (_a = transitionEvent === null || transitionEvent === void 0 ? void 0 : transitionEvent.args) === null || _a === void 0 ? void 0 : _a.userTransitionedData;
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const unirepContract = await contracts_1.getUnirepContract(address, provider);
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
        const emptyUserStateRoot = computeEmptyUserStateRoot(userStateTreeDepth);
        const setting = {
            globalStateTreeDepth: globalStateTreeDepth,
            userStateTreeDepth: userStateTreeDepth,
            epochTreeDepth: epochTreeDepth,
            attestingFee: attestingFee,
            epochLength: epochLength.toNumber(),
            numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
            maxReputationBudget: maxReputationBudget,
            defaultGSTLeaf: crypto_1.hashLeftRight(BigInt(0), emptyUserStateRoot)
        };
        unirepState = new UnirepState_1.UnirepState(setting);
    }
    else {
        unirepState = genUnirepStateFromParams(_unirepState);
    }
    const latestBlock = _unirepState === null || _unirepState === void 0 ? void 0 : _unirepState.latestProcessedBlock;
    const startBlock = latestBlock != undefined ? latestBlock + 1 : defaults_1.DEFAULT_START_BLOCK;
    const newGSTLeafInsertedFilter = unirepContract.filters.NewGSTLeafInserted();
    const newGSTLeafInsertedEvents = await unirepContract.queryFilter(newGSTLeafInsertedFilter, startBlock);
    const attestationSubmittedFilter = unirepContract.filters.AttestationSubmitted();
    const attestationSubmittedEvents = await unirepContract.queryFilter(attestationSubmittedFilter, startBlock);
    const epochEndedFilter = unirepContract.filters.EpochEnded();
    const epochEndedEvents = await unirepContract.queryFilter(epochEndedFilter, startBlock);
    const sequencerFilter = unirepContract.filters.Sequencer();
    const sequencerEvents = await unirepContract.queryFilter(sequencerFilter, startBlock);
    // proof events
    const signUpFilter = unirepContract.filters.UserSignUp();
    const signUpEvents = await unirepContract.queryFilter(signUpFilter);
    const transitionFilter = unirepContract.filters.UserStateTransitionProof();
    const transitionEvents = await unirepContract.queryFilter(transitionFilter);
    const startTransitionFilter = unirepContract.filters.StartedTransitionProof();
    const startTransitionEvents = await unirepContract.queryFilter(startTransitionFilter);
    const processAttestationsFilter = unirepContract.filters.ProcessedAttestationsProof();
    const processAttestationsEvents = await unirepContract.queryFilter(processAttestationsFilter);
    const epochKeyProofFilter = unirepContract.filters.EpochKeyProof();
    const epochKeyProofEvent = await unirepContract.queryFilter(epochKeyProofFilter);
    const repProofFilter = unirepContract.filters.ReputationNullifierProof();
    const repProofEvent = await unirepContract.queryFilter(repProofFilter);
    const signUpProofFilter = unirepContract.filters.UserSignedUpProof();
    const signUpProofEvent = await unirepContract.queryFilter(signUpProofFilter);
    // Reverse the events so pop() can start from the first event
    newGSTLeafInsertedEvents.reverse();
    attestationSubmittedEvents.reverse();
    epochEndedEvents.reverse();
    const proofIndexMap = {};
    const events = signUpEvents.concat(transitionEvents, startTransitionEvents, processAttestationsEvents, epochKeyProofEvent, repProofEvent, signUpProofEvent);
    for (const event of events) {
        proofIndexMap[Number((_a = event === null || event === void 0 ? void 0 : event.args) === null || _a === void 0 ? void 0 : _a._proofIndex)] = event;
    }
    for (let i = 0; i < sequencerEvents.length; i++) {
        const sequencerEvent = sequencerEvents[i];
        console.log('Generating Unirep State progress: ', i, '/', sequencerEvents.length);
        const blockNumber = sequencerEvent.blockNumber;
        if (blockNumber < startBlock)
            continue;
        const occurredEvent = (_b = sequencerEvent.args) === null || _b === void 0 ? void 0 : _b._event;
        if (occurredEvent === "NewGSTLeafInserted") {
            const newLeafEvent = newGSTLeafInsertedEvents.pop();
            assert_1.default(newLeafEvent !== undefined, `Event sequence mismatch: missing newGSTLeafInsertedEvent`);
            const proofIndex = Number((_c = newLeafEvent.args) === null || _c === void 0 ? void 0 : _c._proofIndex);
            const newLeaf = BigInt((_d = newLeafEvent.args) === null || _d === void 0 ? void 0 : _d._hashedLeaf);
            const event = proofIndexMap[proofIndex];
            if (event.event == "UserSignUp") {
                unirepState.signUp(unirepState.currentEpoch, newLeaf, blockNumber);
            }
            else if (event.event == "UserStateTransitionProof") {
                const proofIndexes = (_e = event === null || event === void 0 ? void 0 : event.args) === null || _e === void 0 ? void 0 : _e._proofIndexRecords.map(n => Number(n));
                const startTransitionEvent = proofIndexMap[proofIndexes[0]];
                if (startTransitionEvent == undefined)
                    continue;
                const processAttestationEvents = [];
                let validAttestationEvent = true;
                for (let j = 1; j < proofIndexes.length; j++) {
                    if (proofIndexes[j] === 0)
                        validAttestationEvent = false;
                    processAttestationEvents.push(proofIndexMap[proofIndexes[j]]);
                }
                if (!validAttestationEvent)
                    continue;
                const isValid = verifyUSTEvents(event, startTransitionEvent, processAttestationEvents);
                if (!isValid) {
                    console.log('Proof is invalid: ', event.event, ' , transaction hash: ', event.transactionHash);
                    continue;
                }
                const args = (_f = event === null || event === void 0 ? void 0 : event.args) === null || _f === void 0 ? void 0 : _f.userTransitionedData;
                const GSTRoot = args === null || args === void 0 ? void 0 : args.fromGlobalStateTree;
                const epoch = args === null || args === void 0 ? void 0 : args.transitionFromEpoch;
                const isGSTRootExisted = unirepState.GSTRootExists(GSTRoot, epoch);
                if (!isGSTRootExisted) {
                    console.log('Global state tree root does not exist');
                    continue;
                }
                // Check if epoch tree root matches
                const epochTreeRoot = args === null || args === void 0 ? void 0 : args.fromEpochTree;
                const isEpochTreeExisted = await unirepState.epochTreeRootExists(epochTreeRoot, epoch);
                if (!isEpochTreeExisted) {
                    console.log('Epoch tree root mismatches');
                    continue;
                }
                const epkNullifiersInEvent = args === null || args === void 0 ? void 0 : args.epkNullifiers.map(n => BigInt(n));
                unirepState.userStateTransition(unirepState.currentEpoch, BigInt(newLeaf), epkNullifiersInEvent, blockNumber);
            }
        }
        else if (occurredEvent === "AttestationSubmitted") {
            const attestationEvent = attestationSubmittedEvents.pop();
            assert_1.default(attestationEvent !== undefined, `Event sequence mismatch: missing attestationSubmittedEvent`);
            const args = attestationEvent.args;
            const epoch = args === null || args === void 0 ? void 0 : args._epoch.toNumber();
            assert_1.default(epoch === unirepState.currentEpoch, `Attestation epoch (${epoch}) does not match current epoch (${unirepState.currentEpoch})`);
            const _attestation = args === null || args === void 0 ? void 0 : args.attestation;
            const proofIndex = Number(args === null || args === void 0 ? void 0 : args._proofIndex);
            let results;
            let isProofValid = false;
            const event = proofIndexMap[proofIndex];
            if (event.event == "EpochKeyProof") {
                results = (_g = event === null || event === void 0 ? void 0 : event.args) === null || _g === void 0 ? void 0 : _g.epochKeyProofData;
                isProofValid = await verifyEpochKeyProofEvent(event);
            }
            else if (event.event == "ReputationNullifierProof") {
                results = (_h = event === null || event === void 0 ? void 0 : event.args) === null || _h === void 0 ? void 0 : _h.reputationProofData;
                isProofValid = await verifyReputationProofEvent(event);
            }
            else if (event.event == "UserSignedUpProof") {
                results = (_j = event === null || event === void 0 ? void 0 : event.args) === null || _j === void 0 ? void 0 : _j.signUpProofData;
                isProofValid = await verifySignUpProofEvent(event);
            }
            else {
                console.log('Cannot find the attestation event');
                continue;
            }
            if (!isProofValid) {
                console.log('Proof is invalid: ', attestationEvent.event, ' , transaction hash: ', attestationEvent.transactionHash);
                continue;
            }
            const isGSTRootExisted = unirepState.GSTRootExists(results === null || results === void 0 ? void 0 : results.globalStateTree, epoch);
            if (!isGSTRootExisted) {
                console.log('Global state tree root does not exist');
                continue;
            }
            const attestation = new UnirepState_1.Attestation(BigInt(_attestation.attesterId), BigInt(_attestation.posRep), BigInt(_attestation.negRep), BigInt(_attestation.graffiti), BigInt(_attestation.signUp));
            const epochKey = args === null || args === void 0 ? void 0 : args._epochKey;
            if (epochKey.eq(results === null || results === void 0 ? void 0 : results.epochKey)) {
                if ((args === null || args === void 0 ? void 0 : args._event) === "spendReputation") {
                    for (let nullifier of results === null || results === void 0 ? void 0 : results.repNullifiers) {
                        if (unirepState.nullifierExist(nullifier)) {
                            console.log('duplicated nullifier', BigInt(nullifier).toString());
                            continue;
                        }
                    }
                    for (let nullifier of results === null || results === void 0 ? void 0 : results.repNullifiers) {
                        unirepState.addReputationNullifiers(nullifier, blockNumber);
                    }
                }
                unirepState.addAttestation(epochKey.toString(), attestation, blockNumber);
            }
        }
        else if (occurredEvent === "EpochEnded") {
            const epochEndedEvent = epochEndedEvents.pop();
            assert_1.default(epochEndedEvent !== undefined, `Event sequence mismatch: missing epochEndedEvent`);
            const epoch = (_k = epochEndedEvent.args) === null || _k === void 0 ? void 0 : _k._epoch.toNumber();
            assert_1.default(epoch === unirepState.currentEpoch, `Ended epoch (${epoch}) does not match current epoch (${unirepState.currentEpoch})`);
            await unirepState.epochTransition(epoch, blockNumber);
        }
        else {
            throw new Error(`Unexpected event: ${occurredEvent}`);
        }
    }
    if (newGSTLeafInsertedEvents.length !== 0) {
        console.log(`${newGSTLeafInsertedEvents.length} newGSTLeafInsert events left unprocessed`);
    }
    if (attestationSubmittedEvents.length !== 0) {
        console.log(`${attestationSubmittedEvents.length} attestationSubmitted events left unprocessed`);
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const unirepContract = await contracts_1.getUnirepContract(address, provider);
    let unirepState;
    let userState;
    const userIdentityCommitment = crypto_1.genIdentityCommitment(userIdentity);
    if (_userState === undefined) {
        const treeDepths_ = await unirepContract.treeDepths();
        const globalStateTreeDepth = treeDepths_.globalStateTreeDepth;
        const userStateTreeDepth = treeDepths_.userStateTreeDepth;
        const epochTreeDepth = treeDepths_.epochTreeDepth;
        const attestingFee = await unirepContract.attestingFee();
        const epochLength = await unirepContract.epochLength();
        const numEpochKeyNoncePerEpoch = await unirepContract.numEpochKeyNoncePerEpoch();
        const maxReputationBudget = await unirepContract.maxReputationBudget();
        const emptyUserStateRoot = computeEmptyUserStateRoot(userStateTreeDepth);
        const setting = {
            globalStateTreeDepth: globalStateTreeDepth,
            userStateTreeDepth: userStateTreeDepth,
            epochTreeDepth: epochTreeDepth,
            attestingFee: attestingFee,
            epochLength: epochLength.toNumber(),
            numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
            maxReputationBudget: maxReputationBudget,
            defaultGSTLeaf: crypto_1.hashLeftRight(BigInt(0), emptyUserStateRoot)
        };
        unirepState = new UnirepState_1.UnirepState(setting);
        userState = new UserState_1.UserState(unirepState, userIdentity, false);
    }
    else {
        userState = genUserStateFromParams(userIdentity, _userState);
        unirepState = userState.getUnirepState();
    }
    const latestBlock = _userState === null || _userState === void 0 ? void 0 : _userState.unirepState.latestProcessedBlock;
    const startBlock = latestBlock != undefined ? latestBlock + 1 : defaults_1.DEFAULT_START_BLOCK;
    const newGSTLeafInsertedFilter = unirepContract.filters.NewGSTLeafInserted();
    const newGSTLeafInsertedEvents = await unirepContract.queryFilter(newGSTLeafInsertedFilter, startBlock);
    const attestationSubmittedFilter = unirepContract.filters.AttestationSubmitted();
    const attestationSubmittedEvents = await unirepContract.queryFilter(attestationSubmittedFilter, startBlock);
    const epochEndedFilter = unirepContract.filters.EpochEnded();
    const epochEndedEvents = await unirepContract.queryFilter(epochEndedFilter, startBlock);
    const sequencerFilter = unirepContract.filters.Sequencer();
    const sequencerEvents = await unirepContract.queryFilter(sequencerFilter, startBlock);
    // proof events
    const signUpFilter = unirepContract.filters.UserSignUp();
    const signUpEvents = await unirepContract.queryFilter(signUpFilter);
    const transitionFilter = unirepContract.filters.UserStateTransitionProof();
    const transitionEvents = await unirepContract.queryFilter(transitionFilter);
    const startTransitionFilter = unirepContract.filters.StartedTransitionProof();
    const startTransitionEvents = await unirepContract.queryFilter(startTransitionFilter);
    const processAttestationsFilter = unirepContract.filters.ProcessedAttestationsProof();
    const processAttestationsEvents = await unirepContract.queryFilter(processAttestationsFilter);
    const epochKeyProofFilter = unirepContract.filters.EpochKeyProof();
    const epochKeyProofEvent = await unirepContract.queryFilter(epochKeyProofFilter);
    const repProofFilter = unirepContract.filters.ReputationNullifierProof();
    const repProofEvent = await unirepContract.queryFilter(repProofFilter);
    const signUpProofFilter = unirepContract.filters.UserSignedUpProof();
    const signUpProofEvent = await unirepContract.queryFilter(signUpProofFilter);
    // Reverse the events so pop() can start from the first event
    newGSTLeafInsertedEvents.reverse();
    attestationSubmittedEvents.reverse();
    epochEndedEvents.reverse();
    const proofIndexMap = {};
    const events = signUpEvents.concat(transitionEvents, startTransitionEvents, processAttestationsEvents, epochKeyProofEvent, repProofEvent, signUpProofEvent);
    for (const event of events) {
        proofIndexMap[Number((_a = event === null || event === void 0 ? void 0 : event.args) === null || _a === void 0 ? void 0 : _a._proofIndex)] = event;
    }
    // Variables used to keep track of data required for user to transition
    let userHasSignedUp = (_userState === null || _userState === void 0 ? void 0 : _userState.hasSignedUp) === undefined ? false : _userState === null || _userState === void 0 ? void 0 : _userState.hasSignedUp;
    let currentEpochGSTLeafIndexToInsert = 0;
    let epkNullifiers = [];
    for (let i = 0; i < sequencerEvents.length; i++) {
        console.log('Generating User State progress: ', i, '/', sequencerEvents.length);
        const sequencerEvent = sequencerEvents[i];
        const blockNumber = sequencerEvent.blockNumber;
        if (blockNumber < startBlock)
            continue;
        const occurredEvent = (_b = sequencerEvent.args) === null || _b === void 0 ? void 0 : _b._event;
        if (occurredEvent === "NewGSTLeafInserted") {
            const newLeafEvent = newGSTLeafInsertedEvents.pop();
            assert_1.default(newLeafEvent !== undefined, `Event sequence mismatch: missing newGSTLeafInsertedEvent`);
            const proofIndex = Number((_c = newLeafEvent.args) === null || _c === void 0 ? void 0 : _c._proofIndex);
            const newLeaf = BigInt((_d = newLeafEvent.args) === null || _d === void 0 ? void 0 : _d._hashedLeaf);
            const event = proofIndexMap[proofIndex];
            if (event.event == "UserSignUp") {
                // update Unirep State
                unirepState.signUp(unirepState.currentEpoch, newLeaf, blockNumber);
                // update User State
                const commitment = BigInt((_e = event === null || event === void 0 ? void 0 : event.args) === null || _e === void 0 ? void 0 : _e._identityCommitment);
                if (userIdentityCommitment == commitment) {
                    const attesterId = (_f = event.args) === null || _f === void 0 ? void 0 : _f._attesterId.toNumber();
                    const airdropPosRep = (_g = event.args) === null || _g === void 0 ? void 0 : _g._airdropAmount.toNumber();
                    userState.signUp(unirepState.currentEpoch, currentEpochGSTLeafIndexToInsert, attesterId, airdropPosRep);
                    userHasSignedUp = true;
                }
            }
            else if (event.event == "UserStateTransitionProof") {
                const proofIndexes = (_h = event === null || event === void 0 ? void 0 : event.args) === null || _h === void 0 ? void 0 : _h._proofIndexRecords.map(n => Number(n));
                const startTransitionEvent = proofIndexMap[proofIndexes[0]];
                if (startTransitionEvent == undefined)
                    continue;
                const processAttestationEvents = [];
                let validAttestationEvent = true;
                for (let j = 1; j < proofIndexes.length; j++) {
                    if (proofIndexes[j] === 0)
                        validAttestationEvent = false;
                    processAttestationEvents.push(proofIndexMap[proofIndexes[j]]);
                }
                if (!validAttestationEvent)
                    continue;
                const isValid = verifyUSTEvents(event, startTransitionEvent, processAttestationEvents);
                if (!isValid) {
                    console.log('Proof is invalid: ', event.event, ' , transaction hash: ', event.transactionHash);
                    continue;
                }
                const args = (_j = event === null || event === void 0 ? void 0 : event.args) === null || _j === void 0 ? void 0 : _j.userTransitionedData;
                const GSTRoot = args === null || args === void 0 ? void 0 : args.fromGlobalStateTree;
                const epoch = args === null || args === void 0 ? void 0 : args.transitionFromEpoch;
                const isGSTRootExisted = unirepState.GSTRootExists(GSTRoot, epoch);
                if (!isGSTRootExisted) {
                    console.log('Global state tree root does not exist');
                    continue;
                }
                // Check if epoch tree root matches
                const epochTreeRoot = args === null || args === void 0 ? void 0 : args.fromEpochTree;
                const isEpochTreeExisted = await unirepState.epochTreeRootExists(epochTreeRoot, epoch);
                if (!isEpochTreeExisted) {
                    console.log('Epoch tree root mismatches');
                    continue;
                }
                const epkNullifiersInEvent = args === null || args === void 0 ? void 0 : args.epkNullifiers.map(n => BigInt(n));
                let isNullifierSeen = false;
                // Verify nullifiers are not seen before
                for (const nullifier of epkNullifiersInEvent) {
                    if (nullifier === BigInt(0))
                        continue;
                    else {
                        if (userState.nullifierExist(nullifier)) {
                            isNullifierSeen = true;
                            // If nullifier exists, the proof is considered invalid
                            console.log(`Invalid UserStateTransitioned proof: seen nullifier ${nullifier.toString()}`);
                            break;
                        }
                    }
                }
                if (isNullifierSeen)
                    continue;
                if (userHasSignedUp &&
                    ((args === null || args === void 0 ? void 0 : args.transitionFromEpoch.toNumber()) === userState.latestTransitionedEpoch)) {
                    // Latest epoch user transitioned to ends. Generate nullifiers of all epoch key
                    epkNullifiers = userState.getEpochKeyNullifiers(epoch);
                    let epkNullifiersMatched = 0;
                    for (const nullifier of epkNullifiers) {
                        if (epkNullifiersInEvent.indexOf(nullifier) !== -1)
                            epkNullifiersMatched++;
                    }
                    // Here we assume all epoch keys are processed in the same epoch. If this assumption does not
                    // stand anymore, below `epkNullifiersMatched` check should be changed.
                    if (epkNullifiersMatched == userState.numEpochKeyNoncePerEpoch) {
                        const newState = await userState.genNewUserStateAfterTransition();
                        userState.transition(newState.newUSTLeaves);
                        // User processed all epoch keys so non-zero GST leaf is generated.
                        if (newState.newGSTLeaf != (newLeaf)) {
                            console.log('New GST leaf mismatch');
                            continue;
                        }
                        // User transition to this epoch, increment (next) GST leaf index
                        currentEpochGSTLeafIndexToInsert++;
                    }
                    else if (epkNullifiersMatched > 0) {
                        throw new Error(`Number of epoch key nullifiers matched ${epkNullifiersMatched} not equal to numEpochKeyNoncePerEpoch ${testLocal_1.numEpochKeyNoncePerEpoch}`);
                    }
                }
                unirepState.userStateTransition(unirepState.currentEpoch, BigInt(newLeaf), epkNullifiersInEvent, blockNumber);
            }
            currentEpochGSTLeafIndexToInsert++;
        }
        else if (occurredEvent === "AttestationSubmitted") {
            const attestationEvent = attestationSubmittedEvents.pop();
            assert_1.default(attestationEvent !== undefined, `Event sequence mismatch: missing attestationSubmittedEvent`);
            const args = attestationEvent.args;
            const epoch = args === null || args === void 0 ? void 0 : args._epoch.toNumber();
            assert_1.default(epoch === unirepState.currentEpoch, `Attestation epoch (${epoch}) does not match current epoch (${unirepState.currentEpoch})`);
            const _attestation = args === null || args === void 0 ? void 0 : args.attestation;
            const proofIndex = Number(args === null || args === void 0 ? void 0 : args._proofIndex);
            let results;
            let isProofValid = false;
            const event = proofIndexMap[proofIndex];
            if (event.event == "EpochKeyProof") {
                results = (_k = event === null || event === void 0 ? void 0 : event.args) === null || _k === void 0 ? void 0 : _k.epochKeyProofData;
                isProofValid = await verifyEpochKeyProofEvent(event);
            }
            else if (event.event == "ReputationNullifierProof") {
                results = (_l = event === null || event === void 0 ? void 0 : event.args) === null || _l === void 0 ? void 0 : _l.reputationProofData;
                isProofValid = await verifyReputationProofEvent(event);
            }
            else if (event.event == "UserSignedUpProof") {
                results = (_m = event === null || event === void 0 ? void 0 : event.args) === null || _m === void 0 ? void 0 : _m.signUpProofData;
                isProofValid = await verifySignUpProofEvent(event);
            }
            else {
                console.log('Cannot find the attestation event');
                continue;
            }
            if (!isProofValid) {
                console.log('Proof is invalid: ', attestationEvent.event, ' , transaction hash: ', attestationEvent.transactionHash);
                continue;
            }
            const isGSTRootExisted = unirepState.GSTRootExists(results === null || results === void 0 ? void 0 : results.globalStateTree, epoch);
            if (!isGSTRootExisted) {
                console.log('Global state tree root does not exist');
                continue;
            }
            const attestation = new UnirepState_1.Attestation(BigInt(_attestation.attesterId), BigInt(_attestation.posRep), BigInt(_attestation.negRep), BigInt(_attestation.graffiti), BigInt(_attestation.signUp));
            const epochKey = args === null || args === void 0 ? void 0 : args._epochKey;
            if (epochKey.eq(results === null || results === void 0 ? void 0 : results.epochKey)) {
                if ((args === null || args === void 0 ? void 0 : args._event) === "spendReputation") {
                    for (let nullifier of results === null || results === void 0 ? void 0 : results.repNullifiers) {
                        if (unirepState.nullifierExist(nullifier)) {
                            console.log('duplicated nullifier', BigInt(nullifier).toString());
                            continue;
                        }
                    }
                    for (let nullifier of results === null || results === void 0 ? void 0 : results.repNullifiers) {
                        unirepState.addReputationNullifiers(nullifier, blockNumber);
                    }
                }
                unirepState.addAttestation(epochKey.toString(), attestation, blockNumber);
            }
        }
        else if (occurredEvent === "EpochEnded") {
            const epochEndedEvent = epochEndedEvents.pop();
            assert_1.default(epochEndedEvent !== undefined, `Event sequence mismatch: missing epochEndedEvent`);
            const epoch = (_o = epochEndedEvent.args) === null || _o === void 0 ? void 0 : _o._epoch.toNumber();
            assert_1.default(epoch === unirepState.currentEpoch, `Ended epoch (${epoch}) does not match current epoch (${unirepState.currentEpoch})`);
            await unirepState.epochTransition(epoch, blockNumber);
            if (userHasSignedUp) {
                if (epoch === userState.latestTransitionedEpoch) {
                    // save latest attestations in user state
                    userState.saveAttestations();
                }
            }
            // Epoch ends, reset (next) GST leaf index
            currentEpochGSTLeafIndexToInsert = 0;
        }
        else {
            throw new Error(`Unexpected event: ${occurredEvent}`);
        }
    }
    if (newGSTLeafInsertedEvents.length !== 0) {
        console.log(`${newGSTLeafInsertedEvents.length} newGSTLeafInsert events left unprocessed`);
    }
    if (attestationSubmittedEvents.length !== 0) {
        console.log(`${attestationSubmittedEvents.length} attestationSubmitted events left unprocessed`);
    }
    return userState;
};
exports.genUserStateFromContract = genUserStateFromContract;
