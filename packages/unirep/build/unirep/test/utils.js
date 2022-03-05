"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.genProveSignUpCircuitInput = exports.genReputationCircuitInput = exports.genEpochKeyCircuitInput = exports.getReputationRecords = exports.verifyProcessAttestationsProof = exports.verifyStartTransitionProof = exports.verifyProcessAttestationEvents = exports.verifyNewGSTLeafEvents = exports.verifyNewGSTProofByIndex = exports.computeEpochKeyProofHash = exports.toCompleteHexString = exports.genRandomList = exports.genRandomAttestation = exports.getTreeDepthsForTesting = exports.genNewGST = exports.genNewSMT = exports.genNewUserStateTree = exports.genNewEpochTree = exports.defaultUserStateLeaf = exports.computeEmptyUserStateRoot = exports.SMT_ZERO_LEAF = exports.SMT_ONE_LEAF = void 0;
// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2503 will be reported.
// @ts-ignore
const ethers_1 = require("ethers");
const keyv_1 = __importDefault(require("keyv"));
const crypto_1 = require("@unirep/crypto");
const circuits_1 = require("@unirep/circuits");
const testLocal_1 = require("../config/testLocal");
const core_1 = require("../core");
const toCompleteHexString = (str, len) => {
    str = (0, crypto_1.add0x)(str);
    if (len)
        str = ethers_1.ethers.utils.hexZeroPad(str, len);
    return str;
};
exports.toCompleteHexString = toCompleteHexString;
const SMT_ZERO_LEAF = (0, crypto_1.hashLeftRight)(BigInt(0), BigInt(0));
exports.SMT_ZERO_LEAF = SMT_ZERO_LEAF;
const SMT_ONE_LEAF = (0, crypto_1.hashLeftRight)(BigInt(1), BigInt(0));
exports.SMT_ONE_LEAF = SMT_ONE_LEAF;
const genNewSMT = async (treeDepth, defaultLeafHash) => {
    return crypto_1.SparseMerkleTreeImpl.create(new keyv_1.default(), treeDepth, defaultLeafHash);
};
exports.genNewSMT = genNewSMT;
const genNewEpochTree = async (deployEnv = "contract") => {
    let _epochTreeDepth;
    if (deployEnv === 'contract') {
        _epochTreeDepth = testLocal_1.epochTreeDepth;
    }
    else if (deployEnv === 'circuit') {
        _epochTreeDepth = testLocal_1.circuitEpochTreeDepth;
    }
    else {
        throw new Error('Only contract and circuit testing env are supported');
    }
    const defaultOTSMTHash = SMT_ONE_LEAF;
    return genNewSMT(_epochTreeDepth, defaultOTSMTHash);
};
exports.genNewEpochTree = genNewEpochTree;
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
const defaultUserStateLeaf = (0, crypto_1.hash5)([BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)]);
exports.defaultUserStateLeaf = defaultUserStateLeaf;
const computeEmptyUserStateRoot = (treeDepth) => {
    const t = new crypto_1.IncrementalQuinTree(treeDepth, defaultUserStateLeaf, 2);
    return t.root;
};
exports.computeEmptyUserStateRoot = computeEmptyUserStateRoot;
const genNewGST = (GSTDepth, USTDepth) => {
    const emptyUserStateRoot = computeEmptyUserStateRoot(USTDepth);
    const defaultGSTLeaf = (0, crypto_1.hashLeftRight)(BigInt(0), emptyUserStateRoot);
    const GST = new crypto_1.IncrementalQuinTree(GSTDepth, defaultGSTLeaf, 2);
    return GST;
};
exports.genNewGST = genNewGST;
const genNewUserStateTree = async (deployEnv = "circuit") => {
    let _userStateTreeDepth;
    if (deployEnv === 'contract') {
        _userStateTreeDepth = testLocal_1.userStateTreeDepth;
    }
    else if (deployEnv === 'circuit') {
        _userStateTreeDepth = testLocal_1.circuitUserStateTreeDepth;
    }
    else {
        throw new Error('Only contract and circuit testing env are supported');
    }
    return genNewSMT(_userStateTreeDepth, defaultUserStateLeaf);
};
exports.genNewUserStateTree = genNewUserStateTree;
const genRandomAttestation = () => {
    const attesterId = Math.ceil(Math.random() * 10);
    const attestation = new core_1.Attestation(BigInt(attesterId), BigInt(Math.floor(Math.random() * 100)), BigInt(Math.floor(Math.random() * 100)), (0, crypto_1.genRandomSalt)(), BigInt(Math.floor(Math.random() * 2)));
    return attestation;
};
exports.genRandomAttestation = genRandomAttestation;
const genRandomList = (length) => {
    const array = [];
    for (let i = 0; i < length; i++) {
        array.push((0, crypto_1.genRandomSalt)());
    }
    return array;
};
exports.genRandomList = genRandomList;
const computeEpochKeyProofHash = (epochKeyProof) => {
    const abiEncoder = ethers_1.ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "uint256", "uint256[8]"], epochKeyProof);
    return ethers_1.ethers.utils.keccak256(abiEncoder);
};
exports.computeEpochKeyProofHash = computeEpochKeyProofHash;
const verifyNewGSTProofByIndex = async (unirepContract, proofIndex) => {
    var _a, _b, _c, _d, _e;
    const signUpFilter = unirepContract.filters.UserSignUp(proofIndex);
    const signUpEvents = await unirepContract.queryFilter(signUpFilter);
    // found user sign up event, then continue
    if (signUpEvents.length == 1)
        return signUpEvents[0];
    // 2. verify user state transition proof
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
    const _proofIndexes = (_d = (_c = transitionEvents[0]) === null || _c === void 0 ? void 0 : _c.args) === null || _d === void 0 ? void 0 : _d._proofIndexRecords;
    // Proof index 0 should be the start transition proof
    const startTransitionFilter = unirepContract.filters.StartedTransitionProof(_proofIndexes[0], transitionArgs.blindedUserStates[0], transitionArgs.fromGlobalStateTree);
    const startTransitionEvents = await unirepContract.queryFilter(startTransitionFilter);
    if (startTransitionEvents.length == 0)
        return;
    const startTransitionArgs = (_e = startTransitionEvents[0]) === null || _e === void 0 ? void 0 : _e.args;
    const isStartTransitionProofValid = await unirepContract.verifyStartTransitionProof(startTransitionArgs === null || startTransitionArgs === void 0 ? void 0 : startTransitionArgs._blindedUserState, startTransitionArgs === null || startTransitionArgs === void 0 ? void 0 : startTransitionArgs._blindedHashChain, startTransitionArgs === null || startTransitionArgs === void 0 ? void 0 : startTransitionArgs._globalStateTree, startTransitionArgs === null || startTransitionArgs === void 0 ? void 0 : startTransitionArgs._proof);
    if (!isStartTransitionProofValid)
        return;
    // process attestations proofs
    const isProcessAttestationValid = await verifyProcessAttestationEvents(unirepContract, transitionArgs.blindedUserStates[0], transitionArgs.blindedUserStates[1], _proofIndexes);
    if (!isProcessAttestationValid)
        return;
    return transitionEvents[0];
};
exports.verifyNewGSTProofByIndex = verifyNewGSTProofByIndex;
const verifyNewGSTLeafEvents = async (unirepContract, currentEpoch) => {
    const newLeafFilter = unirepContract.filters.NewGSTLeafInserted(currentEpoch);
    const newLeafEvents = await unirepContract.queryFilter(newLeafFilter);
    const newLeaves = [];
    for (const event of newLeafEvents) {
        const args = event === null || event === void 0 ? void 0 : event.args;
        const proofIndex = args === null || args === void 0 ? void 0 : args._proofIndex;
        // New leaf events are from user sign up and user state transition
        // 1. check user sign up
        const isProofValid = await verifyNewGSTProofByIndex(unirepContract, proofIndex);
        // all verification is done
        if (isProofValid) {
            newLeaves.push(BigInt(args === null || args === void 0 ? void 0 : args._hashedLeaf));
        }
    }
    return newLeaves;
};
exports.verifyNewGSTLeafEvents = verifyNewGSTLeafEvents;
const verifyProcessAttestationEvents = async (unirepContract, startBlindedUserState, finalBlindedUserState, _proofIndexes) => {
    var _a;
    let currentBlindedUserState = startBlindedUserState;
    // The rest are process attestations proofs
    for (let i = 1; i < _proofIndexes.length; i++) {
        const processAttestationsFilter = unirepContract.filters.ProcessedAttestationsProof(_proofIndexes[i], currentBlindedUserState);
        const processAttestationsEvents = await unirepContract.queryFilter(processAttestationsFilter);
        if (processAttestationsEvents.length == 0)
            return false;
        const args = (_a = processAttestationsEvents[0]) === null || _a === void 0 ? void 0 : _a.args;
        const isValid = await unirepContract.verifyProcessAttestationProof(args === null || args === void 0 ? void 0 : args._outputBlindedUserState, args === null || args === void 0 ? void 0 : args._outputBlindedHashChain, args === null || args === void 0 ? void 0 : args._inputBlindedUserState, args === null || args === void 0 ? void 0 : args._proof);
        if (!isValid)
            return false;
        currentBlindedUserState = args === null || args === void 0 ? void 0 : args._outputBlindedUserState;
    }
    return currentBlindedUserState.eq(finalBlindedUserState);
};
exports.verifyProcessAttestationEvents = verifyProcessAttestationEvents;
const verifyStartTransitionProof = async (startTransitionProof) => {
    return await (0, circuits_1.verifyProof)(circuits_1.Circuit.startTransition, startTransitionProof.proof, startTransitionProof.publicSignals);
};
exports.verifyStartTransitionProof = verifyStartTransitionProof;
const verifyProcessAttestationsProof = async (processAttestationProof) => {
    return await (0, circuits_1.verifyProof)(circuits_1.Circuit.processAttestations, processAttestationProof.proof, processAttestationProof.publicSignals);
};
exports.verifyProcessAttestationsProof = verifyProcessAttestationsProof;
const getReputationRecords = (id, unirepState) => {
    const currentEpoch = unirepState.currentEpoch;
    let reputaitonRecord = {};
    for (let i = 0; i < currentEpoch; i++) {
        for (let j = 0; j < unirepState.setting.numEpochKeyNoncePerEpoch; j++) {
            const epk = (0, core_1.genEpochKey)(id.identityNullifier, i, j);
            const attestations = unirepState.getAttestations(epk.toString());
            for (let attestation of attestations) {
                const attesterId = attestation.attesterId.toString();
                if (reputaitonRecord[attesterId] === undefined) {
                    reputaitonRecord[attesterId] = new core_1.Reputation(attestation.posRep, attestation.negRep, attestation.graffiti, attestation.signUp);
                }
                else {
                    reputaitonRecord[attesterId].update(attestation.posRep, attestation.negRep, attestation.graffiti, attestation.signUp);
                }
            }
        }
    }
    return reputaitonRecord;
};
exports.getReputationRecords = getReputationRecords;
const genEpochKeyCircuitInput = (id, tree, leafIndex, ustRoot, epoch, nonce) => {
    const proof = tree.genMerklePath(leafIndex);
    const root = tree.root;
    const epk = (0, core_1.genEpochKey)(id['identityNullifier'], epoch, nonce);
    const circuitInputs = {
        GST_path_elements: proof.pathElements,
        GST_path_index: proof.indices,
        GST_root: root,
        identity_pk: id['keypair']['pubKey'],
        identity_nullifier: id['identityNullifier'],
        identity_trapdoor: id['identityTrapdoor'],
        user_tree_root: ustRoot,
        nonce: nonce,
        epoch: epoch,
        epoch_key: epk,
    };
    return (0, crypto_1.stringifyBigInts)(circuitInputs);
};
exports.genEpochKeyCircuitInput = genEpochKeyCircuitInput;
const genReputationCircuitInput = async (id, epoch, nonce, GSTree, leafIdx, reputationRecords, attesterId, _repNullifiersAmount, _minRep, _proveGraffiti, _graffitiPreImage) => {
    const epk = (0, core_1.genEpochKey)(id['identityNullifier'], epoch, nonce);
    const repNullifiersAmount = _repNullifiersAmount === undefined ? 0 : _repNullifiersAmount;
    const minRep = _minRep === undefined ? 0 : _minRep;
    const proveGraffiti = _proveGraffiti === undefined ? 0 : _proveGraffiti;
    let graffitiPreImage;
    if (proveGraffiti === 1 && reputationRecords[attesterId] !== undefined) {
        graffitiPreImage = reputationRecords[attesterId]['graffitiPreImage'];
    }
    graffitiPreImage = graffitiPreImage === undefined ? 0 : graffitiPreImage;
    if (reputationRecords[attesterId] === undefined) {
        reputationRecords[attesterId] = core_1.Reputation.default();
    }
    // User state tree
    const userStateTree = await genNewUserStateTree();
    for (const attester of Object.keys(reputationRecords)) {
        await userStateTree.update(BigInt(attester), reputationRecords[attester].hash());
    }
    const userStateRoot = userStateTree.getRootHash();
    const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId));
    // Global state tree
    const GSTreeProof = GSTree.genMerklePath(leafIdx); // if there is only one GST leaf, the index is 0
    const GSTreeRoot = GSTree.root;
    // selectors and karma nonce
    const nonceStarter = 0;
    const selectors = [];
    const nonceList = [];
    for (let i = 0; i < repNullifiersAmount; i++) {
        nonceList.push(BigInt(nonceStarter + i));
        selectors.push(BigInt(1));
    }
    for (let i = repNullifiersAmount; i < testLocal_1.maxReputationBudget; i++) {
        nonceList.push(BigInt(0));
        selectors.push(BigInt(0));
    }
    const circuitInputs = {
        epoch: epoch,
        epoch_key_nonce: nonce,
        epoch_key: epk,
        identity_pk: id['keypair']['pubKey'],
        identity_nullifier: id['identityNullifier'],
        identity_trapdoor: id['identityTrapdoor'],
        user_tree_root: userStateRoot,
        GST_path_index: GSTreeProof.indices,
        GST_path_elements: GSTreeProof.pathElements,
        GST_root: GSTreeRoot,
        attester_id: attesterId,
        pos_rep: reputationRecords[attesterId]['posRep'],
        neg_rep: reputationRecords[attesterId]['negRep'],
        graffiti: reputationRecords[attesterId]['graffiti'],
        sign_up: reputationRecords[attesterId]['signUp'],
        UST_path_elements: USTPathElements,
        rep_nullifiers_amount: repNullifiersAmount,
        selectors: selectors,
        rep_nonce: nonceList,
        min_rep: minRep,
        prove_graffiti: proveGraffiti,
        graffiti_pre_image: graffitiPreImage
    };
    return (0, crypto_1.stringifyBigInts)(circuitInputs);
};
exports.genReputationCircuitInput = genReputationCircuitInput;
const genProveSignUpCircuitInput = async (id, epoch, GSTree, leafIdx, reputationRecords, attesterId, _signUp) => {
    const nonce = 0;
    const epk = (0, core_1.genEpochKey)(id['identityNullifier'], epoch, nonce);
    if (reputationRecords[attesterId] === undefined) {
        reputationRecords[attesterId] = core_1.Reputation.default();
    }
    // User state tree
    const userStateTree = await genNewUserStateTree();
    for (const attester of Object.keys(reputationRecords)) {
        await userStateTree.update(BigInt(attester), reputationRecords[attester].hash());
    }
    const userStateRoot = userStateTree.getRootHash();
    const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId));
    // Global state tree
    const GSTreeProof = GSTree.genMerklePath(leafIdx); // if there is only one GST leaf, the index is 0
    const GSTreeRoot = GSTree.root;
    const circuitInputs = {
        epoch: epoch,
        epoch_key: epk,
        identity_pk: id['keypair']['pubKey'],
        identity_nullifier: id['identityNullifier'],
        identity_trapdoor: id['identityTrapdoor'],
        user_tree_root: userStateRoot,
        GST_path_index: GSTreeProof.indices,
        GST_path_elements: GSTreeProof.pathElements,
        GST_root: GSTreeRoot,
        attester_id: attesterId,
        pos_rep: reputationRecords[attesterId]['posRep'],
        neg_rep: reputationRecords[attesterId]['negRep'],
        graffiti: reputationRecords[attesterId]['graffiti'],
        sign_up: reputationRecords[attesterId]['signUp'],
        UST_path_elements: USTPathElements,
    };
    return (0, crypto_1.stringifyBigInts)(circuitInputs);
};
exports.genProveSignUpCircuitInput = genProveSignUpCircuitInput;
