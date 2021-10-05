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
/*
 * Retrieves and parses on-chain Unirep contract data to create an off-chain
 * representation as a UnirepState object.
 * @param provider An Ethereum provider
 * @param address The address of the Unirep contract
 * @param startBlock The block number when Unirep contract is deployed
 */
const genUnirepStateFromContract = async (provider, address, startBlock) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21;
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
    const nullifierSubmittedFilter = unirepContract.filters.ReputationNullifierSubmitted();
    const nullifierSubmittedEvents = await unirepContract.queryFilter(nullifierSubmittedFilter, startBlock);
    const epochEndedFilter = unirepContract.filters.EpochEnded();
    const epochEndedEvents = await unirepContract.queryFilter(epochEndedFilter, startBlock);
    const startedTransitionFilter = unirepContract.filters.StartedTransition();
    const startedTransitionEvents = await unirepContract.queryFilter(startedTransitionFilter, startBlock);
    const processedAttestationsFilter = unirepContract.filters.ProcessedAttestations();
    const processedAttestationsEvents = await unirepContract.queryFilter(processedAttestationsFilter, startBlock);
    const userStateTransitionedFilter = unirepContract.filters.UserStateTransitioned();
    const userStateTransitionedEvents = await unirepContract.queryFilter(userStateTransitionedFilter, startBlock);
    const sequencerFilter = unirepContract.filters.Sequencer();
    const sequencerEvents = await unirepContract.queryFilter(sequencerFilter, startBlock);
    // Reverse the events so pop() can start from the first event
    newGSTLeafInsertedEvents.reverse();
    attestationSubmittedEvents.reverse();
    nullifierSubmittedEvents.reverse();
    epochEndedEvents.reverse();
    startedTransitionEvents.reverse();
    processedAttestationsEvents.reverse();
    userStateTransitionedEvents.reverse();
    for (let i = 0; i < sequencerEvents.length; i++) {
        const sequencerEvent = sequencerEvents[i];
        const occurredEvent = (_a = sequencerEvent.args) === null || _a === void 0 ? void 0 : _a._event;
        if (occurredEvent === "UserSignUp") {
            const newLeafEvent = newGSTLeafInsertedEvents.pop();
            assert_1.default(newLeafEvent !== undefined, `Event sequence mismatch: missing newGSTLeafInsertedEvent`);
            const newLeaf = (_b = newLeafEvent.args) === null || _b === void 0 ? void 0 : _b._hashedLeaf;
            unirepState.signUp(unirepState.currentEpoch, BigInt(newLeaf));
        }
        else if (occurredEvent === "AttestationSubmitted") {
            const attestationEvent = attestationSubmittedEvents.pop();
            assert_1.default(attestationEvent !== undefined, `Event sequence mismatch: missing attestationSubmittedEvent`);
            const epoch = (_c = attestationEvent.args) === null || _c === void 0 ? void 0 : _c._epoch.toNumber();
            assert_1.default(epoch === unirepState.currentEpoch, `Attestation epoch (${epoch}) does not match current epoch (${unirepState.currentEpoch})`);
            const _attestation = (_d = attestationEvent.args) === null || _d === void 0 ? void 0 : _d.attestation;
            const attestation = new UnirepState_1.Attestation(BigInt(_attestation.attesterId), BigInt(_attestation.posRep), BigInt(_attestation.negRep), BigInt(_attestation.graffiti), BigInt(_attestation.signUp));
            unirepState.addAttestation((_e = attestationEvent.args) === null || _e === void 0 ? void 0 : _e._epochKey.toString(), attestation);
        }
        else if (occurredEvent === "ReputationNullifierSubmitted") {
            const nullifierEvent = nullifierSubmittedEvents.pop();
            assert_1.default(nullifierEvent !== undefined, `Event sequence mismatch: missing nullifierSubmittedEvent`);
            const isProofValid = await unirepContract.verifyReputation((_f = nullifierEvent.args) === null || _f === void 0 ? void 0 : _f.reputationNullifiers, (_g = nullifierEvent.args) === null || _g === void 0 ? void 0 : _g._epoch, (_h = nullifierEvent.args) === null || _h === void 0 ? void 0 : _h.reputationProofData.epochKey, (_j = nullifierEvent.args) === null || _j === void 0 ? void 0 : _j.reputationProofData.globalStateTree, (_k = nullifierEvent.args) === null || _k === void 0 ? void 0 : _k.reputationProofData.attesterId, (_l = nullifierEvent.args) === null || _l === void 0 ? void 0 : _l.reputationProofData.proveReputationAmount, (_m = nullifierEvent.args) === null || _m === void 0 ? void 0 : _m.reputationProofData.minRep, (_o = nullifierEvent.args) === null || _o === void 0 ? void 0 : _o.reputationProofData.proveGraffiti, (_p = nullifierEvent.args) === null || _p === void 0 ? void 0 : _p.reputationProofData.graffitiPreImage, (_q = nullifierEvent.args) === null || _q === void 0 ? void 0 : _q.reputationProofData.proof);
            // Check if Global state tree root exists
            const GSTRoot = (_r = nullifierEvent.args) === null || _r === void 0 ? void 0 : _r.reputationProofData.globalStateTree;
            const epoch = (_s = nullifierEvent.args) === null || _s === void 0 ? void 0 : _s._epoch;
            const isGSTRootExisted = unirepState.GSTRootExists(GSTRoot, epoch);
            if (!isGSTRootExisted) {
                console.log('Global state tree root does not exist');
                continue;
            }
            // Proof is invalid, skip this step
            if (!isProofValid) {
                console.log("Invalid Reputation proof");
                continue;
            }
            // Update nullifiers
            for (let i = 0; i < ((_t = nullifierEvent.args) === null || _t === void 0 ? void 0 : _t.reputationNullifiers.length); i++) {
                unirepState.addReputationNullifiers((_u = nullifierEvent.args) === null || _u === void 0 ? void 0 : _u.reputationNullifiers[i]);
            }
        }
        else if (occurredEvent === "EpochEnded") {
            const epochEndedEvent = epochEndedEvents.pop();
            assert_1.default(epochEndedEvent !== undefined, `Event sequence mismatch: missing epochEndedEvent`);
            const epoch = (_v = epochEndedEvent.args) === null || _v === void 0 ? void 0 : _v._epoch.toNumber();
            assert_1.default(epoch === unirepState.currentEpoch, `Ended epoch (${epoch}) does not match current epoch (${unirepState.currentEpoch})`);
            // Get epoch tree leaves of the ending epoch
            let [epochKeys_, epochKeyHashchains_] = await unirepContract.getEpochTreeLeaves(epoch);
            epochKeys_ = epochKeys_.map((epk) => BigInt(epk.toString()));
            epochKeyHashchains_ = epochKeyHashchains_.map((hc) => BigInt(hc.toString()));
            const epochTreeLeaves = [];
            for (let i = 0; i < epochKeys_.length; i++) {
                const epochTreeLeaf = {
                    epochKey: epochKeys_[i],
                    hashchainResult: epochKeyHashchains_[i]
                };
                epochTreeLeaves.push(epochTreeLeaf);
            }
            await unirepState.epochTransition(epoch, epochTreeLeaves);
        }
        else if (occurredEvent === "StartedTransition") {
            const startedTransitiodEvent = startedTransitionEvents.pop();
            assert_1.default(startedTransitiodEvent !== undefined, `Event sequence mismatch: missing startedTransitiodEvent`);
            const isProofValid = await unirepContract.verifyStartTransitionProof((_w = startedTransitiodEvent.args) === null || _w === void 0 ? void 0 : _w._blindedUserState, (_x = startedTransitiodEvent.args) === null || _x === void 0 ? void 0 : _x._blindedHashChain, (_y = startedTransitiodEvent.args) === null || _y === void 0 ? void 0 : _y._GSTRoot, (_z = startedTransitiodEvent.args) === null || _z === void 0 ? void 0 : _z._proof);
            // Proof is invalid, skip this step
            if (!isProofValid) {
                console.log("Invalid Start transition proof");
                continue;
            }
            unirepState.addBlindedUserState((_0 = startedTransitiodEvent.args) === null || _0 === void 0 ? void 0 : _0._blindedUserState);
            unirepState.addBlindedHashChain((_1 = startedTransitiodEvent.args) === null || _1 === void 0 ? void 0 : _1._blindedHashChain);
        }
        else if (occurredEvent === "ProcessedAttestations") {
            const processedAttestationsEvent = processedAttestationsEvents.pop();
            assert_1.default(processedAttestationsEvent !== undefined, `Event sequence mismatch: missing processedAttestationsEvent`);
            for (let i = 0; i < numEpochKeyNoncePerEpoch; i++) {
                if (unirepState.blindedUserStateExist((_2 = processedAttestationsEvent.args) === null || _2 === void 0 ? void 0 : _2._inputBlindedUserState) != true) {
                    console.log(`Unprocessed blinded user state`);
                    continue;
                }
            }
            const isProofValid = await unirepContract.verifyProcessAttestationProof((_3 = processedAttestationsEvent.args) === null || _3 === void 0 ? void 0 : _3._outputBlindedUserState, (_4 = processedAttestationsEvent.args) === null || _4 === void 0 ? void 0 : _4._outputBlindedHashChain, (_5 = processedAttestationsEvent.args) === null || _5 === void 0 ? void 0 : _5._inputBlindedUserState, (_6 = processedAttestationsEvent.args) === null || _6 === void 0 ? void 0 : _6._proof);
            // Proof is invalid, skip this step
            if (!isProofValid) {
                console.log("Invalid process attestation proof");
                continue;
            }
            unirepState.addBlindedUserState((_7 = processedAttestationsEvent.args) === null || _7 === void 0 ? void 0 : _7._outputBlindedUserState);
            unirepState.addBlindedHashChain((_8 = processedAttestationsEvent.args) === null || _8 === void 0 ? void 0 : _8._outputBlindedHashChain);
        }
        else if (occurredEvent === "UserStateTransitioned") {
            const userStateTransitionedEvent = userStateTransitionedEvents.pop();
            assert_1.default(userStateTransitionedEvent !== undefined, `Event sequence mismatch: missing userStateTransitionedEvent`);
            const newLeaf = (_9 = userStateTransitionedEvent.args) === null || _9 === void 0 ? void 0 : _9.userTransitionedData.newGlobalStateTreeLeaf;
            const _blindedHashChains = (_10 = userStateTransitionedEvent.args) === null || _10 === void 0 ? void 0 : _10.userTransitionedData.blindedHashChains;
            for (let i = 0; i < numEpochKeyNoncePerEpoch; i++) {
                if (unirepState.blindedHashChainExist(_blindedHashChains[i].toString()) != true) {
                    console.log(`Unprocessed blinded hash chain`);
                    continue;
                }
            }
            const isProofValid = await unirepContract.verifyUserStateTransition(newLeaf, (_11 = userStateTransitionedEvent.args) === null || _11 === void 0 ? void 0 : _11.userTransitionedData.epkNullifiers, (_12 = userStateTransitionedEvent.args) === null || _12 === void 0 ? void 0 : _12.userTransitionedData.fromEpoch, (_13 = userStateTransitionedEvent.args) === null || _13 === void 0 ? void 0 : _13.userTransitionedData.blindedUserStates, (_14 = userStateTransitionedEvent.args) === null || _14 === void 0 ? void 0 : _14.userTransitionedData.fromGlobalStateTree, (_15 = userStateTransitionedEvent.args) === null || _15 === void 0 ? void 0 : _15.userTransitionedData.blindedHashChains, (_16 = userStateTransitionedEvent.args) === null || _16 === void 0 ? void 0 : _16.userTransitionedData.fromEpochTree, (_17 = userStateTransitionedEvent.args) === null || _17 === void 0 ? void 0 : _17.userTransitionedData.proof);
            // Check if Global state tree root exists
            const GSTRoot = (_18 = userStateTransitionedEvent.args) === null || _18 === void 0 ? void 0 : _18.userTransitionedData.fromGlobalStateTree;
            const epoch = (_19 = userStateTransitionedEvent.args) === null || _19 === void 0 ? void 0 : _19.userTransitionedData.fromEpoch;
            const isGSTRootExisted = unirepState.GSTRootExists(GSTRoot, epoch);
            if (!isGSTRootExisted) {
                console.log('Global state tree root does not exist');
                continue;
            }
            // Check if epoch tree root matches
            const epochTreeRoot = (_20 = userStateTransitionedEvent.args) === null || _20 === void 0 ? void 0 : _20.userTransitionedData.fromEpochTree;
            const isEpochTreeExisted = unirepState.epochTreeRootExists(epochTreeRoot, epoch);
            if (!isEpochTreeExisted) {
                console.log('Epoch tree root mismatches');
                continue;
            }
            // Proof is invalid, skip this step
            if (!isProofValid) {
                console.log("Invalid UserStateTransitioned proof");
                continue;
            }
            const epkNullifiersInEvent = (_21 = userStateTransitionedEvent.args) === null || _21 === void 0 ? void 0 : _21.userTransitionedData.epkNullifiers;
            unirepState.userStateTransition(unirepState.currentEpoch, BigInt(newLeaf), epkNullifiersInEvent);
        }
        else {
            throw new Error(`Unexpected event: ${occurredEvent}`);
        }
    }
    assert_1.default(newGSTLeafInsertedEvents.length == 0, `${newGSTLeafInsertedEvents.length} newGSTLeafInsert events left unprocessed`);
    assert_1.default(attestationSubmittedEvents.length == 0, `${attestationSubmittedEvents.length} attestationSubmitted events left unprocessed`);
    assert_1.default(nullifierSubmittedEvents.length == 0, `${nullifierSubmittedEvents.length} nullifierSubmitted events left unprocessed`);
    assert_1.default(epochEndedEvents.length == 0, `${epochEndedEvents.length} newGSTLeafInsert events left unprocessed`);
    assert_1.default(startedTransitionEvents.length == 0, `${startedTransitionEvents.length} startedTransition events left unprocessed`);
    assert_1.default(processedAttestationsEvents.length == 0, `${processedAttestationsEvents.length} processedAttestations events left unprocessed`);
    assert_1.default(userStateTransitionedEvents.length == 0, `${userStateTransitionedEvents.length} newGSTLeafInsert events left unprocessed`);
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23;
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
    const nullifierSubmittedFilter = unirepContract.filters.ReputationNullifierSubmitted();
    const nullifierSubmittedEvents = await unirepContract.queryFilter(nullifierSubmittedFilter, startBlock);
    const epochEndedFilter = unirepContract.filters.EpochEnded();
    const epochEndedEvents = await unirepContract.queryFilter(epochEndedFilter, startBlock);
    const startedTransitionFilter = unirepContract.filters.StartedTransition();
    const startedTransitionEvents = await unirepContract.queryFilter(startedTransitionFilter, startBlock);
    const processedAttestationsFilter = unirepContract.filters.ProcessedAttestations();
    const processedAttestationsEvents = await unirepContract.queryFilter(processedAttestationsFilter, startBlock);
    const userStateTransitionedFilter = unirepContract.filters.UserStateTransitioned();
    const userStateTransitionedEvents = await unirepContract.queryFilter(userStateTransitionedFilter, startBlock);
    const sequencerFilter = unirepContract.filters.Sequencer();
    const sequencerEvents = await unirepContract.queryFilter(sequencerFilter, startBlock);
    // Reverse the events so pop() can start from the first event
    newGSTLeafInsertedEvents.reverse();
    attestationSubmittedEvents.reverse();
    nullifierSubmittedEvents.reverse();
    epochEndedEvents.reverse();
    startedTransitionEvents.reverse();
    processedAttestationsEvents.reverse();
    userStateTransitionedEvents.reverse();
    // Variables used to keep track of data required for user to transition
    let userHasSignedUp = false;
    let currentEpochGSTLeafIndexToInsert = 0;
    let epkNullifiers = [];
    for (let i = 0; i < sequencerEvents.length; i++) {
        const sequencerEvent = sequencerEvents[i];
        const occurredEvent = (_a = sequencerEvent.args) === null || _a === void 0 ? void 0 : _a._event;
        if (occurredEvent === "UserSignUp") {
            const newLeafEvent = newGSTLeafInsertedEvents.pop();
            assert_1.default(newLeafEvent !== undefined, `Event sequence mismatch: missing newGSTLeafInsertedEvent`);
            const newLeaf = BigInt((_b = newLeafEvent.args) === null || _b === void 0 ? void 0 : _b._hashedLeaf);
            unirepState.signUp(unirepState.currentEpoch, newLeaf);
            // New leaf matches user's airdropped leaf means user signed up.
            const attesterId = (_c = newLeafEvent.args) === null || _c === void 0 ? void 0 : _c._attesterId.toNumber();
            const airdropPosRep = (_d = newLeafEvent.args) === null || _d === void 0 ? void 0 : _d._airdropAmount.toNumber();
            const airdropUserStateRoot = await computeInitUserStateRoot(unirepState.userStateTreeDepth, attesterId, airdropPosRep);
            const emptyUserStateRoot = computeEmptyUserStateRoot(unirepState.userStateTreeDepth);
            const userAirdropGSTLeaf = crypto_1.hashLeftRight(userIdentityCommitment, airdropUserStateRoot);
            const userEmptyGSTLeaf = crypto_1.hashLeftRight(userIdentityCommitment, emptyUserStateRoot);
            if (userAirdropGSTLeaf === newLeaf) {
                userState.signUp(unirepState.currentEpoch, currentEpochGSTLeafIndexToInsert, attesterId, airdropPosRep);
                userHasSignedUp = true;
            }
            else if (userEmptyGSTLeaf === newLeaf) {
                userState.signUp(unirepState.currentEpoch, currentEpochGSTLeafIndexToInsert, 0, 0);
                userHasSignedUp = true;
            }
            // A user sign up, increment (next) GST leaf index
            currentEpochGSTLeafIndexToInsert++;
        }
        else if (occurredEvent === "AttestationSubmitted") {
            const attestationEvent = attestationSubmittedEvents.pop();
            assert_1.default(attestationEvent !== undefined, `Event sequence mismatch: missing attestationSubmittedEvent`);
            const epoch = (_e = attestationEvent.args) === null || _e === void 0 ? void 0 : _e._epoch.toNumber();
            assert_1.default(epoch === unirepState.currentEpoch, `Attestation epoch (${epoch}) does not match current epoch (${unirepState.currentEpoch})`);
            const _attestation = (_f = attestationEvent.args) === null || _f === void 0 ? void 0 : _f.attestation;
            const attestation = new UnirepState_1.Attestation(BigInt(_attestation.attesterId), BigInt(_attestation.posRep), BigInt(_attestation.negRep), BigInt(_attestation.graffiti), BigInt(_attestation.signUp));
            const epochKey = (_g = attestationEvent.args) === null || _g === void 0 ? void 0 : _g._epochKey;
            unirepState.addAttestation(epochKey.toString(), attestation);
        }
        else if (occurredEvent === "ReputationNullifierSubmitted") {
            const nullifierEvent = nullifierSubmittedEvents.pop();
            assert_1.default(nullifierEvent !== undefined, `Event sequence mismatch: missing nullifierSubmittedEvent`);
            const isProofValid = await unirepContract.verifyReputation((_h = nullifierEvent.args) === null || _h === void 0 ? void 0 : _h.reputationNullifiers, (_j = nullifierEvent.args) === null || _j === void 0 ? void 0 : _j._epoch, (_k = nullifierEvent.args) === null || _k === void 0 ? void 0 : _k.reputationProofData.epochKey, (_l = nullifierEvent.args) === null || _l === void 0 ? void 0 : _l.reputationProofData.globalStateTree, (_m = nullifierEvent.args) === null || _m === void 0 ? void 0 : _m.reputationProofData.attesterId, (_o = nullifierEvent.args) === null || _o === void 0 ? void 0 : _o.reputationProofData.proveReputationAmount, (_p = nullifierEvent.args) === null || _p === void 0 ? void 0 : _p.reputationProofData.minRep, (_q = nullifierEvent.args) === null || _q === void 0 ? void 0 : _q.reputationProofData.proveGraffiti, (_r = nullifierEvent.args) === null || _r === void 0 ? void 0 : _r.reputationProofData.graffitiPreImage, (_s = nullifierEvent.args) === null || _s === void 0 ? void 0 : _s.reputationProofData.proof);
            // Check if Global state tree root exists
            const GSTRoot = (_t = nullifierEvent.args) === null || _t === void 0 ? void 0 : _t.reputationProofData.globalStateTree;
            const epoch = (_u = nullifierEvent.args) === null || _u === void 0 ? void 0 : _u._epoch;
            const isGSTRootExisted = unirepState.GSTRootExists(GSTRoot, epoch);
            if (!isGSTRootExisted) {
                console.log('Global state tree root does not exist');
                continue;
            }
            // Proof is invalid, skip this step
            if (!isProofValid) {
                console.log("Invalid Reputation proof");
                continue;
            }
            // Update nullifiers
            for (let i = 0; i < ((_v = nullifierEvent.args) === null || _v === void 0 ? void 0 : _v.reputationNullifiers.length); i++) {
                unirepState.addReputationNullifiers((_w = nullifierEvent.args) === null || _w === void 0 ? void 0 : _w.reputationNullifiers[i]);
            }
        }
        else if (occurredEvent === "EpochEnded") {
            const epochEndedEvent = epochEndedEvents.pop();
            assert_1.default(epochEndedEvent !== undefined, `Event sequence mismatch: missing epochEndedEvent`);
            const epoch = (_x = epochEndedEvent.args) === null || _x === void 0 ? void 0 : _x._epoch.toNumber();
            assert_1.default(epoch === unirepState.currentEpoch, `Ended epoch (${epoch}) does not match current epoch (${unirepState.currentEpoch})`);
            // Get epoch tree leaves of the ending epoch
            let [epochKeys_, epochKeyHashchains_] = await unirepContract.getEpochTreeLeaves(epoch);
            epochKeys_ = epochKeys_.map((epk) => BigInt(epk.toString()));
            epochKeyHashchains_ = epochKeyHashchains_.map((hc) => BigInt(hc.toString()));
            const epochTreeLeaves = [];
            for (let i = 0; i < epochKeys_.length; i++) {
                const epochTreeLeaf = {
                    epochKey: epochKeys_[i],
                    hashchainResult: epochKeyHashchains_[i]
                };
                epochTreeLeaves.push(epochTreeLeaf);
            }
            await unirepState.epochTransition(epoch, epochTreeLeaves);
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
        else if (occurredEvent === "StartedTransition") {
            const startedTransitiodEvent = startedTransitionEvents.pop();
            assert_1.default(startedTransitiodEvent !== undefined, `Event sequence mismatch: missing startedTransitiodEvent`);
            const isProofValid = await unirepContract.verifyStartTransitionProof((_y = startedTransitiodEvent.args) === null || _y === void 0 ? void 0 : _y._blindedUserState, (_z = startedTransitiodEvent.args) === null || _z === void 0 ? void 0 : _z._blindedHashChain, (_0 = startedTransitiodEvent.args) === null || _0 === void 0 ? void 0 : _0._GSTRoot, (_1 = startedTransitiodEvent.args) === null || _1 === void 0 ? void 0 : _1._proof);
            // Proof is invalid, skip this step
            if (!isProofValid) {
                console.log("Invalid Start transition proof");
                continue;
            }
            unirepState.addBlindedUserState((_2 = startedTransitiodEvent.args) === null || _2 === void 0 ? void 0 : _2._blindedUserState);
            unirepState.addBlindedHashChain((_3 = startedTransitiodEvent.args) === null || _3 === void 0 ? void 0 : _3._blindedHashChain);
        }
        else if (occurredEvent === "ProcessedAttestations") {
            const processedAttestationsEvent = processedAttestationsEvents.pop();
            assert_1.default(processedAttestationsEvent !== undefined, `Event sequence mismatch: missing processedAttestationsEvent`);
            for (let i = 0; i < numEpochKeyNoncePerEpoch; i++) {
                if (unirepState.blindedUserStateExist((_4 = processedAttestationsEvent.args) === null || _4 === void 0 ? void 0 : _4._inputBlindedUserState) != true) {
                    console.log(`Unprocessed blinded user state`);
                    continue;
                }
            }
            const isProofValid = await unirepContract.verifyProcessAttestationProof((_5 = processedAttestationsEvent.args) === null || _5 === void 0 ? void 0 : _5._outputBlindedUserState, (_6 = processedAttestationsEvent.args) === null || _6 === void 0 ? void 0 : _6._outputBlindedHashChain, (_7 = processedAttestationsEvent.args) === null || _7 === void 0 ? void 0 : _7._inputBlindedUserState, (_8 = processedAttestationsEvent.args) === null || _8 === void 0 ? void 0 : _8._proof);
            // Proof is invalid, skip this step
            if (!isProofValid) {
                console.log("Invalid process attestation proof");
                continue;
            }
            unirepState.addBlindedUserState((_9 = processedAttestationsEvent.args) === null || _9 === void 0 ? void 0 : _9._outputBlindedUserState);
            unirepState.addBlindedHashChain((_10 = processedAttestationsEvent.args) === null || _10 === void 0 ? void 0 : _10._outputBlindedHashChain);
        }
        else if (occurredEvent === "UserStateTransitioned") {
            const userStateTransitionedEvent = userStateTransitionedEvents.pop();
            assert_1.default(userStateTransitionedEvent !== undefined, `Event sequence mismatch: missing userStateTransitionedEvent`);
            const newLeaf = (_11 = userStateTransitionedEvent.args) === null || _11 === void 0 ? void 0 : _11.userTransitionedData.newGlobalStateTreeLeaf;
            const isProofValid = await unirepContract.verifyUserStateTransition(newLeaf, (_12 = userStateTransitionedEvent.args) === null || _12 === void 0 ? void 0 : _12.userTransitionedData.epkNullifiers, (_13 = userStateTransitionedEvent.args) === null || _13 === void 0 ? void 0 : _13.userTransitionedData.fromEpoch, (_14 = userStateTransitionedEvent.args) === null || _14 === void 0 ? void 0 : _14.userTransitionedData.blindedUserStates, (_15 = userStateTransitionedEvent.args) === null || _15 === void 0 ? void 0 : _15.userTransitionedData.fromGlobalStateTree, (_16 = userStateTransitionedEvent.args) === null || _16 === void 0 ? void 0 : _16.userTransitionedData.blindedHashChains, (_17 = userStateTransitionedEvent.args) === null || _17 === void 0 ? void 0 : _17.userTransitionedData.fromEpochTree, (_18 = userStateTransitionedEvent.args) === null || _18 === void 0 ? void 0 : _18.userTransitionedData.proof);
            // Check if Global state tree root exists
            const GSTRoot = (_19 = userStateTransitionedEvent.args) === null || _19 === void 0 ? void 0 : _19.userTransitionedData.fromGlobalStateTree;
            const epoch = (_20 = userStateTransitionedEvent.args) === null || _20 === void 0 ? void 0 : _20.userTransitionedData.fromEpoch;
            const isGSTRootExisted = unirepState.GSTRootExists(GSTRoot, epoch);
            if (!isGSTRootExisted) {
                console.log('Global state tree root does not exist');
                continue;
            }
            // Check if epoch tree root matches
            const epochTreeRoot = (_21 = userStateTransitionedEvent.args) === null || _21 === void 0 ? void 0 : _21.userTransitionedData.fromEpochTree;
            const isEpochTreeExisted = unirepState.epochTreeRootExists(epochTreeRoot, epoch);
            if (!isEpochTreeExisted) {
                console.log('Epoch tree root mismatches');
                continue;
            }
            // Proof is invalid, skip this event
            if (!isProofValid) {
                console.log("Invalid UserStateTransitioned proof");
                continue;
            }
            const epkNullifiersInEvent = (_22 = userStateTransitionedEvent.args) === null || _22 === void 0 ? void 0 : _22.userTransitionedData.epkNullifiers.map(n => BigInt(n));
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
                (((_23 = userStateTransitionedEvent.args) === null || _23 === void 0 ? void 0 : _23.userTransitionedData.fromEpoch.toNumber()) === userState.latestTransitionedEpoch)) {
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
                    assert_1.default(ethers_1.ethers.BigNumber.from(newState.newGSTLeaf).eq(newLeaf), 'New GST leaf mismatch');
                    // User transition to this epoch, increment (next) GST leaf index
                    currentEpochGSTLeafIndexToInsert++;
                }
                else if (epkNullifiersMatched > 0) {
                    throw new Error(`Number of epoch key nullifiers matched ${epkNullifiersMatched} not equal to numEpochKeyNoncePerEpoch ${numEpochKeyNoncePerEpoch}`);
                }
            }
            unirepState.userStateTransition(unirepState.currentEpoch, BigInt(newLeaf), epkNullifiersInEvent);
        }
        else {
            throw new Error(`Unexpected event: ${occurredEvent}`);
        }
    }
    assert_1.default(newGSTLeafInsertedEvents.length == 0, `${newGSTLeafInsertedEvents.length} newGSTLeafInsert events left unprocessed`);
    assert_1.default(attestationSubmittedEvents.length == 0, `${attestationSubmittedEvents.length} attestationSubmitted events left unprocessed`);
    assert_1.default(nullifierSubmittedEvents.length == 0, `${nullifierSubmittedEvents.length} nullifierSubmitted events left unprocessed`);
    assert_1.default(epochEndedEvents.length == 0, `${epochEndedEvents.length} newGSTLeafInsert events left unprocessed`);
    assert_1.default(startedTransitionEvents.length == 0, `${startedTransitionEvents.length} startedTransition events left unprocessed`);
    assert_1.default(processedAttestationsEvents.length == 0, `${processedAttestationsEvents.length} processedAttestations events left unprocessed`);
    assert_1.default(userStateTransitionedEvents.length == 0, `${userStateTransitionedEvents.length} newGSTLeafInsert events left unprocessed`);
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
