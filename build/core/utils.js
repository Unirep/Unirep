"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.genUserStateFromParams = exports.genUserStateFromContract = exports.genUnirepStateFromContract = exports.genNewSMT = exports.genReputationNullifier = exports.genEpochKeyNullifier = exports.genEpochKey = exports.getTreeDepthsForTesting = exports.computeInitUserStateRoot = exports.computeEmptyUserStateRoot = exports.SMT_ZERO_LEAF = exports.SMT_ONE_LEAF = exports.defaultUserStateLeaf = void 0;
// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2305 will be reported.
// @ts-ignore
const ethers_1 = require("ethers");
const keyv_1 = __importDefault(require("keyv"));
const assert_1 = __importDefault(require("assert"));
const contracts_1 = require("@unirep/contracts");
const crypto_1 = require("@unirep/crypto");
const testLocal_1 = require("../config/testLocal");
const UnirepState_1 = require("./UnirepState");
const UserState_1 = require("./UserState");
const nullifierDomainSeparator_1 = require("../config/nullifierDomainSeparator");
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
    let epochKey = crypto_1.hash5(values);
    // Adjust epoch key size according to epoch tree depth
    const epochKeyModed = BigInt(epochKey) % BigInt(2 ** _epochTreeDepth);
    return epochKeyModed;
};
exports.genEpochKey = genEpochKey;
const genEpochKeyNullifier = (identityNullifier, epoch, nonce) => {
    return crypto_1.hash5([nullifierDomainSeparator_1.EPOCH_KEY_NULLIFIER_DOMAIN, identityNullifier, BigInt(epoch), BigInt(nonce), BigInt(0)]);
};
exports.genEpochKeyNullifier = genEpochKeyNullifier;
const genReputationNullifier = (identityNullifier, epoch, nonce) => {
    return crypto_1.hash5([nullifierDomainSeparator_1.REPUTATION_NULLIFIER_DOMAIN, identityNullifier, BigInt(epoch), BigInt(nonce), BigInt(0)]);
};
exports.genReputationNullifier = genReputationNullifier;
const genNewSMT = async (treeDepth, defaultLeafHash) => {
    return crypto_1.SparseMerkleTreeImpl.create(new keyv_1.default(), treeDepth, defaultLeafHash);
};
exports.genNewSMT = genNewSMT;
const verifyNewGSTProofByIndex = async (unirepContract, proofIndex) => {
    var _a, _b, _c;
    const signUpFilter = unirepContract.filters.UserSignUp(proofIndex);
    const signUpEvents = await unirepContract.queryFilter(signUpFilter);
    // found user sign up event, then continue
    if (signUpEvents.length == 1)
        return signUpEvents[0];
    // 2. verify user state transition proof
    // TODO verify GST root and epoch tree root
    const transitionFilter = unirepContract.filters.UserStateTransitionProof(proofIndex);
    const transitionEvents = await unirepContract.queryFilter(transitionFilter);
    if (transitionEvents.length == 0)
        return;
    // proof index is supposed to be unique, therefore it should be only one event found
    const transitionArgs = (_b = (_a = transitionEvents[0]) === null || _a === void 0 ? void 0 : _a.args) === null || _b === void 0 ? void 0 : _b.userTransitionedData;
    // backward verification
    const isValid = await unirepContract.verifyUserStateTransition(transitionArgs.newGlobalStateTreeLeaf, transitionArgs.epkNullifiers, transitionArgs.transitionFromEpoch, transitionArgs.blindedUserStates, transitionArgs.fromGlobalStateTree, transitionArgs.blindedHashChains, transitionArgs.fromEpochTree, transitionArgs.proof);
    if (!isValid)
        return;
    // process attestations proofs
    const isProcessAttestationValid = await verifyProcessAttestationEvents(unirepContract, transitionArgs.blindedUserStates[0], transitionArgs.blindedUserStates[1]);
    if (!isProcessAttestationValid)
        return;
    const startTransitionFilter = unirepContract.filters.StartedTransitionProof(transitionArgs.blindedUserStates[0], null, transitionArgs.fromGlobalStateTree);
    const startTransitionEvents = await unirepContract.queryFilter(startTransitionFilter);
    if (startTransitionEvents.length == 0)
        return;
    const startTransitionArgs = (_c = startTransitionEvents[0]) === null || _c === void 0 ? void 0 : _c.args;
    const isStartTransitionProofValid = await unirepContract.verifyStartTransitionProof(startTransitionArgs === null || startTransitionArgs === void 0 ? void 0 : startTransitionArgs._blindedUserState, startTransitionArgs === null || startTransitionArgs === void 0 ? void 0 : startTransitionArgs._blindedHashChain, startTransitionArgs === null || startTransitionArgs === void 0 ? void 0 : startTransitionArgs._GSTRoot, startTransitionArgs === null || startTransitionArgs === void 0 ? void 0 : startTransitionArgs._proof);
    if (!isStartTransitionProofValid)
        return;
    return transitionEvents[0];
};
const verifyProcessAttestationEvents = async (unirepContract, startBlindedUserState, currentBlindedUserState) => {
    const processAttestationFilter = unirepContract.filters.ProcessedAttestationsProof(currentBlindedUserState);
    const processAttestationEvents = await unirepContract.queryFilter(processAttestationFilter);
    if (processAttestationEvents.length == 0)
        return false;
    let returnValue = false;
    for (const event of processAttestationEvents) {
        const args = event === null || event === void 0 ? void 0 : event.args;
        const isValid = await unirepContract.verifyProcessAttestationProof(args === null || args === void 0 ? void 0 : args._outputBlindedUserState, args === null || args === void 0 ? void 0 : args._outputBlindedHashChain, args === null || args === void 0 ? void 0 : args._inputBlindedUserState, args === null || args === void 0 ? void 0 : args._proof);
        if (!isValid)
            continue;
        if (BigInt(args === null || args === void 0 ? void 0 : args._inputBlindedUserState) == startBlindedUserState) {
            returnValue = true;
            break;
        }
        else {
            returnValue = returnValue || await verifyProcessAttestationEvents(unirepContract, startBlindedUserState, args === null || args === void 0 ? void 0 : args._inputBlindedUserState);
        }
    }
    return returnValue;
};
const verifyAttestationProofsByIndex = async (unirepContract, proofIndex) => {
    var _a, _b, _c, _d, _e, _f;
    const epochKeyProofFilter = unirepContract.filters.EpochKeyProof(proofIndex);
    const epochKeyProofEvent = await unirepContract.queryFilter(epochKeyProofFilter);
    const repProofFilter = unirepContract.filters.ReputationNullifierProof(proofIndex);
    const repProofEvent = await unirepContract.queryFilter(repProofFilter);
    const signUpProofFilter = unirepContract.filters.UserSignedUpProof(proofIndex);
    const signUpProofEvent = await unirepContract.queryFilter(signUpProofFilter);
    if (epochKeyProofEvent.length == 1) {
        console.log('epoch key event');
        const args = (_b = (_a = epochKeyProofEvent[0]) === null || _a === void 0 ? void 0 : _a.args) === null || _b === void 0 ? void 0 : _b.epochKeyProofData;
        const isProofValid = await unirepContract.verifyEpochKeyValidity(args === null || args === void 0 ? void 0 : args.fromGlobalStateTree, args === null || args === void 0 ? void 0 : args.epoch, args === null || args === void 0 ? void 0 : args.epochKey, args === null || args === void 0 ? void 0 : args.proof);
        if (isProofValid)
            return {
                GSTRoot: args === null || args === void 0 ? void 0 : args.fromGlobalStateTree,
                nullifiers: []
            };
    }
    else if (repProofEvent.length == 1) {
        console.log('rep nullifier event');
        const args = (_d = (_c = repProofEvent[0]) === null || _c === void 0 ? void 0 : _c.args) === null || _d === void 0 ? void 0 : _d.reputationProofData;
        const isProofValid = await unirepContract.verifyReputation(args === null || args === void 0 ? void 0 : args.repNullifiers, args === null || args === void 0 ? void 0 : args.epoch, args === null || args === void 0 ? void 0 : args.epochKey, args === null || args === void 0 ? void 0 : args.globalStateTree, args === null || args === void 0 ? void 0 : args.attesterId, args === null || args === void 0 ? void 0 : args.proveReputationAmount, args === null || args === void 0 ? void 0 : args.minRep, args === null || args === void 0 ? void 0 : args.proveGraffiti, args === null || args === void 0 ? void 0 : args.graffitiPreImage, args === null || args === void 0 ? void 0 : args.proof);
        if (isProofValid)
            return {
                GSTRoot: args === null || args === void 0 ? void 0 : args.globalStateTree,
                nullifiers: args === null || args === void 0 ? void 0 : args.repNullifiers,
            };
    }
    else if (signUpProofEvent.length == 1) {
        console.log('sign up event');
        const args = (_f = (_e = signUpProofEvent[0]) === null || _e === void 0 ? void 0 : _e.args) === null || _f === void 0 ? void 0 : _f.signUpProofData;
        const isProofValid = await unirepContract.verifyUserSignUp(args === null || args === void 0 ? void 0 : args.epoch, args === null || args === void 0 ? void 0 : args.epochKey, args === null || args === void 0 ? void 0 : args.globalStateTree, args === null || args === void 0 ? void 0 : args.attesterId, args === null || args === void 0 ? void 0 : args.proof);
        if (isProofValid)
            return {
                GSTRoot: args === null || args === void 0 ? void 0 : args.globalStateTree,
                nullifiers: [],
            };
    }
    return {
        GSTRoot: BigInt(0),
        nullifiers: []
    };
};
/*
 * Retrieves and parses on-chain Unirep contract data to create an off-chain
 * representation as a UnirepState object.
 * @param provider An Ethereum provider
 * @param address The address of the Unirep contract
 * @param startBlock The block number when Unirep contract is deployed
 */
const genUnirepStateFromContract = async (provider, address, startBlock) => {
    var _a, _b, _c, _d, _e, _f;
    const unirepContract = await contracts_1.getUnirepContract(address, provider);
    const treeDepths_ = await unirepContract.treeDepths();
    const globalStateTreeDepth = treeDepths_.globalStateTreeDepth;
    const userStateTreeDepth = treeDepths_.userStateTreeDepth;
    const epochTreeDepth = treeDepths_.epochTreeDepth;
    const attestingFee = await unirepContract.attestingFee();
    const epochLength = await unirepContract.epochLength();
    const numEpochKeyNoncePerEpoch = await unirepContract.numEpochKeyNoncePerEpoch();
    const maxRepuationBudget = await unirepContract.maxReputationBudget();
    const unirepState = new UnirepState_1.UnirepState(ethers_1.ethers.BigNumber.from(globalStateTreeDepth).toNumber(), ethers_1.ethers.BigNumber.from(userStateTreeDepth).toNumber(), ethers_1.ethers.BigNumber.from(epochTreeDepth).toNumber(), attestingFee, ethers_1.ethers.BigNumber.from(epochLength).toNumber(), ethers_1.ethers.BigNumber.from(numEpochKeyNoncePerEpoch).toNumber(), ethers_1.ethers.BigNumber.from(maxRepuationBudget).toNumber());
    const newGSTLeafInsertedFilter = unirepContract.filters.NewGSTLeafInserted();
    const newGSTLeafInsertedEvents = await unirepContract.queryFilter(newGSTLeafInsertedFilter, startBlock);
    const attestationSubmittedFilter = unirepContract.filters.AttestationSubmitted();
    const attestationSubmittedEvents = await unirepContract.queryFilter(attestationSubmittedFilter, startBlock);
    const epochEndedFilter = unirepContract.filters.EpochEnded();
    const epochEndedEvents = await unirepContract.queryFilter(epochEndedFilter, startBlock);
    const sequencerFilter = unirepContract.filters.Sequencer();
    const sequencerEvents = await unirepContract.queryFilter(sequencerFilter, startBlock);
    // Reverse the events so pop() can start from the first event
    newGSTLeafInsertedEvents.reverse();
    attestationSubmittedEvents.reverse();
    epochEndedEvents.reverse();
    for (let i = 0; i < sequencerEvents.length; i++) {
        const sequencerEvent = sequencerEvents[i];
        const occurredEvent = (_a = sequencerEvent.args) === null || _a === void 0 ? void 0 : _a._event;
        if (occurredEvent === "NewGSTLeafInserted") {
            const newLeafEvent = newGSTLeafInsertedEvents.pop();
            assert_1.default(newLeafEvent !== undefined, `Event sequence mismatch: missing newGSTLeafInsertedEvent`);
            const proofIndex = (_b = newLeafEvent.args) === null || _b === void 0 ? void 0 : _b._proofIndex;
            const isValidEvent = await verifyNewGSTProofByIndex(unirepContract, proofIndex);
            if (isValidEvent == undefined) {
                console.log('Proof is invalid');
                continue;
            }
            const newLeaf = BigInt((_c = newLeafEvent.args) === null || _c === void 0 ? void 0 : _c._hashedLeaf);
            if (isValidEvent.event == "UserSignUp") {
                // update Unirep State
                unirepState.signUp(unirepState.currentEpoch, newLeaf);
            }
            else if (isValidEvent.event == "UserStateTransitionProof") {
                const args = (_d = isValidEvent === null || isValidEvent === void 0 ? void 0 : isValidEvent.args) === null || _d === void 0 ? void 0 : _d.userTransitionedData;
                const GSTRoot = args === null || args === void 0 ? void 0 : args.fromGlobalStateTree;
                const epoch = args === null || args === void 0 ? void 0 : args.transitionFromEpoch;
                const isGSTRootExisted = unirepState.GSTRootExists(GSTRoot, epoch);
                if (!isGSTRootExisted) {
                    console.log('Global state tree root does not exist');
                    continue;
                }
                // Check if epoch tree root matches
                const epochTreeRoot = args === null || args === void 0 ? void 0 : args.fromEpochTree;
                const isEpochTreeExisted = unirepState.epochTreeRootExists(epochTreeRoot, epoch);
                if (!isEpochTreeExisted) {
                    console.log('Epoch tree root mismatches');
                    continue;
                }
                const epkNullifiersInEvent = (_e = isValidEvent.args) === null || _e === void 0 ? void 0 : _e.userTransitionedData.epkNullifiers;
                unirepState.userStateTransition(unirepState.currentEpoch, BigInt(newLeaf), epkNullifiersInEvent);
            }
        }
        else if (occurredEvent === "AttestationSubmitted") {
            const attestationEvent = attestationSubmittedEvents.pop();
            assert_1.default(attestationEvent !== undefined, `Event sequence mismatch: missing attestationSubmittedEvent`);
            const args = attestationEvent.args;
            const epoch = args === null || args === void 0 ? void 0 : args._epoch.toNumber();
            assert_1.default(epoch === unirepState.currentEpoch, `Attestation epoch (${epoch}) does not match current epoch (${unirepState.currentEpoch})`);
            const _attestation = args === null || args === void 0 ? void 0 : args.attestation;
            const proofIndex = args === null || args === void 0 ? void 0 : args._proofIndex;
            const results = await verifyAttestationProofsByIndex(unirepContract, proofIndex);
            if (results.GSTRoot == BigInt(0)) {
                console.log('Proof is invalid');
                continue;
            }
            const isGSTRootExisted = unirepState.GSTRootExists(results.GSTRoot, epoch);
            if (!isGSTRootExisted) {
                console.log('Global state tree root does not exist');
                continue;
            }
            const attestation = new UnirepState_1.Attestation(BigInt(_attestation.attesterId), BigInt(_attestation.posRep), BigInt(_attestation.negRep), BigInt(_attestation.graffiti), BigInt(_attestation.signUp));
            const epochKey = args === null || args === void 0 ? void 0 : args._epochKey;
            unirepState.addAttestation(epochKey.toString(), attestation);
            for (let nullifier of results.nullifiers) {
                unirepState.addReputationNullifiers(nullifier);
            }
        }
        else if (occurredEvent === "EpochEnded") {
            const epochEndedEvent = epochEndedEvents.pop();
            assert_1.default(epochEndedEvent !== undefined, `Event sequence mismatch: missing epochEndedEvent`);
            const epoch = (_f = epochEndedEvent.args) === null || _f === void 0 ? void 0 : _f._epoch.toNumber();
            assert_1.default(epoch === unirepState.currentEpoch, `Ended epoch (${epoch}) does not match current epoch (${unirepState.currentEpoch})`);
            await unirepState.epochTransition(epoch);
        }
        else {
            throw new Error(`Unexpected event: ${occurredEvent}`);
        }
    }
    assert_1.default(newGSTLeafInsertedEvents.length == 0, `${newGSTLeafInsertedEvents.length} newGSTLeafInsert events left unprocessed`);
    assert_1.default(attestationSubmittedEvents.length == 0, `${attestationSubmittedEvents.length} attestationSubmitted events left unprocessed`);
    assert_1.default(epochEndedEvents.length == 0, `${epochEndedEvents.length} newGSTLeafInsert events left unprocessed`);
    return unirepState;
};
exports.genUnirepStateFromContract = genUnirepStateFromContract;
/*
 * Create UserState object from given user state and
 * retrieves and parses on-chain Unirep contract data to create an off-chain
 * representation as a UserState object (including UnirepState object).
 * (This assumes user has already signed up in the Unirep contract)
 * @param provider An Ethereum provider
 * @param address The address of the Unirep contract
 * @param startBlock The block number when Unirep contract is deployed
 * @param userIdentity The semaphore identity of the user
 * @param userIdentityCommitment Commitment of the userIdentity
 * @param latestTransitionedEpoch Latest epoch user has transitioned to
 * @param latestGSTLeafIndex Leaf index in the global state tree of the latest epoch user has transitioned to
 * @param latestUserStateLeaves User state leaves (empty if no attestations received)
 * @param latestEpochKeys User's epoch keys of the epoch user has transitioned to
 */
const genUserStateFromParams = async (provider, address, startBlock, userIdentity, userIdentityCommitment, transitionedPosRep, transitionedNegRep, currentEpochPosRep, currentEpochNegRep, latestTransitionedEpoch, latestGSTLeafIndex, latestUserStateLeaves) => {
    const unirepState = await genUnirepStateFromContract(provider, address, startBlock);
    const userState = new UserState_1.UserState(unirepState, userIdentity, userIdentityCommitment, true, transitionedPosRep, transitionedNegRep, currentEpochPosRep, currentEpochNegRep, latestTransitionedEpoch, latestGSTLeafIndex, latestUserStateLeaves);
    return userState;
};
exports.genUserStateFromParams = genUserStateFromParams;
/*
 * This function works mostly the same as genUnirepStateFromContract,
 * except that it also updates the user's state during events processing.
 * @param provider An Ethereum provider
 * @param address The address of the Unirep contract
 * @param startBlock The block number when Unirep contract is deployed
 * @param userIdentity The semaphore identity of the user
 * @param userIdentityCommitment Commitment of the userIdentity
 */
const _genUserStateFromContract = async (provider, address, startBlock, userIdentity, userIdentityCommitment) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const unirepContract = await contracts_1.getUnirepContract(address, provider);
    const treeDepths_ = await unirepContract.treeDepths();
    const globalStateTreeDepth = treeDepths_.globalStateTreeDepth;
    const userStateTreeDepth = treeDepths_.userStateTreeDepth;
    const epochTreeDepth = treeDepths_.epochTreeDepth;
    const attestingFee = await unirepContract.attestingFee();
    const epochLength = await unirepContract.epochLength();
    const numEpochKeyNoncePerEpoch = await unirepContract.numEpochKeyNoncePerEpoch();
    const maxRepuationBudget = await unirepContract.maxReputationBudget();
    const unirepState = new UnirepState_1.UnirepState(ethers_1.ethers.BigNumber.from(globalStateTreeDepth).toNumber(), ethers_1.ethers.BigNumber.from(userStateTreeDepth).toNumber(), ethers_1.ethers.BigNumber.from(epochTreeDepth).toNumber(), attestingFee, ethers_1.ethers.BigNumber.from(epochLength).toNumber(), ethers_1.ethers.BigNumber.from(numEpochKeyNoncePerEpoch).toNumber(), ethers_1.ethers.BigNumber.from(maxRepuationBudget).toNumber());
    const userState = new UserState_1.UserState(unirepState, userIdentity, userIdentityCommitment, false);
    const newGSTLeafInsertedFilter = unirepContract.filters.NewGSTLeafInserted();
    const newGSTLeafInsertedEvents = await unirepContract.queryFilter(newGSTLeafInsertedFilter, startBlock);
    const attestationSubmittedFilter = unirepContract.filters.AttestationSubmitted();
    const attestationSubmittedEvents = await unirepContract.queryFilter(attestationSubmittedFilter, startBlock);
    const epochEndedFilter = unirepContract.filters.EpochEnded();
    const epochEndedEvents = await unirepContract.queryFilter(epochEndedFilter, startBlock);
    const sequencerFilter = unirepContract.filters.Sequencer();
    const sequencerEvents = await unirepContract.queryFilter(sequencerFilter, startBlock);
    // Reverse the events so pop() can start from the first event
    newGSTLeafInsertedEvents.reverse();
    attestationSubmittedEvents.reverse();
    epochEndedEvents.reverse();
    // Variables used to keep track of data required for user to transition
    let userHasSignedUp = false;
    let currentEpochGSTLeafIndexToInsert = 0;
    let epkNullifiers = [];
    for (let i = 0; i < sequencerEvents.length; i++) {
        const sequencerEvent = sequencerEvents[i];
        const occurredEvent = (_a = sequencerEvent.args) === null || _a === void 0 ? void 0 : _a._event;
        if (occurredEvent === "NewGSTLeafInserted") {
            const newLeafEvent = newGSTLeafInsertedEvents.pop();
            assert_1.default(newLeafEvent !== undefined, `Event sequence mismatch: missing newGSTLeafInsertedEvent`);
            const proofIndex = (_b = newLeafEvent.args) === null || _b === void 0 ? void 0 : _b._proofIndex;
            const isValidEvent = await verifyNewGSTProofByIndex(unirepContract, proofIndex);
            if (isValidEvent == undefined) {
                console.log('Proof is invalid');
                continue;
            }
            const newLeaf = BigInt((_c = newLeafEvent.args) === null || _c === void 0 ? void 0 : _c._hashedLeaf);
            if (isValidEvent.event == "UserSignUp") {
                // update Unirep State
                unirepState.signUp(unirepState.currentEpoch, newLeaf);
                // update User State
                const commitment = BigInt((_d = isValidEvent === null || isValidEvent === void 0 ? void 0 : isValidEvent.args) === null || _d === void 0 ? void 0 : _d._identityCommitment);
                if (userIdentityCommitment == commitment) {
                    const attesterId = (_e = isValidEvent.args) === null || _e === void 0 ? void 0 : _e._attesterId.toNumber();
                    const airdropPosRep = (_f = isValidEvent.args) === null || _f === void 0 ? void 0 : _f._airdropAmount.toNumber();
                    userState.signUp(unirepState.currentEpoch, currentEpochGSTLeafIndexToInsert, attesterId, airdropPosRep);
                    userHasSignedUp = true;
                }
            }
            else if (isValidEvent.event == "UserStateTransitionProof") {
                const args = (_g = isValidEvent === null || isValidEvent === void 0 ? void 0 : isValidEvent.args) === null || _g === void 0 ? void 0 : _g.userTransitionedData;
                const GSTRoot = args === null || args === void 0 ? void 0 : args.fromGlobalStateTree;
                const epoch = args === null || args === void 0 ? void 0 : args.transitionFromEpoch;
                const isGSTRootExisted = unirepState.GSTRootExists(GSTRoot, epoch);
                if (!isGSTRootExisted) {
                    console.log('Global state tree root does not exist');
                    continue;
                }
                // Check if epoch tree root matches
                const epochTreeRoot = args === null || args === void 0 ? void 0 : args.fromEpochTree;
                const isEpochTreeExisted = unirepState.epochTreeRootExists(epochTreeRoot, epoch);
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
                            break;
                        }
                        // User transition to this epoch, increment (next) GST leaf index
                        currentEpochGSTLeafIndexToInsert++;
                    }
                    else if (epkNullifiersMatched > 0) {
                        throw new Error(`Number of epoch key nullifiers matched ${epkNullifiersMatched} not equal to numEpochKeyNoncePerEpoch ${numEpochKeyNoncePerEpoch}`);
                    }
                }
                unirepState.userStateTransition(unirepState.currentEpoch, BigInt(newLeaf), epkNullifiersInEvent);
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
            const proofIndex = args === null || args === void 0 ? void 0 : args._proofIndex;
            const results = await verifyAttestationProofsByIndex(unirepContract, proofIndex);
            if (results.GSTRoot == BigInt(0)) {
                console.log('Proof is invalid');
                continue;
            }
            const isGSTRootExisted = unirepState.GSTRootExists(results.GSTRoot, epoch);
            if (!isGSTRootExisted) {
                console.log('Global state tree root does not exist');
                continue;
            }
            const attestation = new UnirepState_1.Attestation(BigInt(_attestation.attesterId), BigInt(_attestation.posRep), BigInt(_attestation.negRep), BigInt(_attestation.graffiti), BigInt(_attestation.signUp));
            const epochKey = args === null || args === void 0 ? void 0 : args._epochKey;
            unirepState.addAttestation(epochKey.toString(), attestation);
            for (let nullifier of results.nullifiers) {
                unirepState.addReputationNullifiers(nullifier);
            }
        }
        else if (occurredEvent === "EpochEnded") {
            const epochEndedEvent = epochEndedEvents.pop();
            assert_1.default(epochEndedEvent !== undefined, `Event sequence mismatch: missing epochEndedEvent`);
            const epoch = (_h = epochEndedEvent.args) === null || _h === void 0 ? void 0 : _h._epoch.toNumber();
            assert_1.default(epoch === unirepState.currentEpoch, `Ended epoch (${epoch}) does not match current epoch (${unirepState.currentEpoch})`);
            await unirepState.epochTransition(epoch);
            if (userHasSignedUp) {
                if (epoch === userState.latestTransitionedEpoch) {
                    // Latest epoch user transitioned to ends. Generate nullifiers of all epoch key
                    // so we can identify when user process the epoch keys.
                    epkNullifiers = userState.getEpochKeyNullifiers(epoch);
                }
            }
            // Epoch ends, reset (next) GST leaf index
            currentEpochGSTLeafIndexToInsert = 0;
        }
        else {
            throw new Error(`Unexpected event: ${occurredEvent}`);
        }
    }
    assert_1.default(newGSTLeafInsertedEvents.length == 0, `${newGSTLeafInsertedEvents.length} newGSTLeafInsert events left unprocessed`);
    assert_1.default(attestationSubmittedEvents.length == 0, `${attestationSubmittedEvents.length} attestationSubmitted events left unprocessed`);
    return userState;
};
/*
 * Given user identity and userIdentityCommitment, retrieves and parses on-chain
 * Unirep contract data to create an off-chain representation as a
 * UserState object (including UnirepState object).
 * @param provider An Ethereum provider
 * @param address The address of the Unirep contract
 * @param startBlock The block number when Unirep contract is deployed
 * @param userIdentity The semaphore identity of the user
 * @param userIdentityCommitment Commitment of the userIdentity
 */
const genUserStateFromContract = async (provider, address, startBlock, userIdentity, userIdentityCommitment) => {
    return await _genUserStateFromContract(provider, address, startBlock, userIdentity, userIdentityCommitment);
};
exports.genUserStateFromContract = genUserStateFromContract;
