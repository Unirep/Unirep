"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.genInputForContract = exports.genProofAndVerify = exports.formatProofAndPublicSignals = exports.genProveSignUpCircuitInput = exports.genReputationCircuitInput = exports.genUserStateTransitionCircuitInput = exports.genProcessAttestationsCircuitInput = exports.genStartTransitionCircuitInput = exports.genEpochKeyCircuitInput = exports.bootstrapRandomUSTree = exports.genEpochKeyNullifier = exports.genEpochKey = exports.toCompleteHexString = exports.genNewSMT = exports.genNewUserStateTree = exports.genNewEpochTree = exports.getTreeDepthsForTesting = exports.defaultGSTLeaf = exports.defaultUserStateLeaf = exports.computeEmptyUserStateRoot = exports.GSTZERO_VALUE = exports.SMT_ZERO_LEAF = exports.SMT_ONE_LEAF = exports.Reputation = exports.Attestation = void 0;
// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2503 will be reported.
// @ts-ignore
const assert_1 = __importDefault(require("assert"));
const ethers_1 = require("ethers");
const keyv_1 = __importDefault(require("keyv"));
const crypto_1 = require("@unirep/crypto");
const circuits_1 = require("@unirep/circuits");
const config_1 = require("../config");
const src_1 = require("../src");
Object.defineProperty(exports, "Attestation", { enumerable: true, get: function () { return src_1.Attestation; } });
const SMT_ZERO_LEAF = (0, crypto_1.hashLeftRight)(BigInt(0), BigInt(0));
exports.SMT_ZERO_LEAF = SMT_ZERO_LEAF;
const SMT_ONE_LEAF = (0, crypto_1.hashLeftRight)(BigInt(1), BigInt(0));
exports.SMT_ONE_LEAF = SMT_ONE_LEAF;
const EPOCH_KEY_NULLIFIER_DOMAIN = BigInt(1);
const GSTZERO_VALUE = 0;
exports.GSTZERO_VALUE = GSTZERO_VALUE;
class Reputation {
    constructor(_posRep, _negRep, _graffiti, _signUp) {
        this.graffitiPreImage = BigInt(0);
        this.update = (_posRep, _negRep, _graffiti, _signUp) => {
            this.posRep = BigInt(Number(this.posRep) + Number(_posRep));
            this.negRep = BigInt(Number(this.negRep) + Number(_negRep));
            if (_graffiti != BigInt(0)) {
                this.graffiti = _graffiti;
            }
            this.signUp = this.signUp || _signUp;
            return this;
        };
        this.addGraffitiPreImage = (_graffitiPreImage) => {
            (0, assert_1.default)((0, crypto_1.hashOne)(_graffitiPreImage) === this.graffiti, 'Graffiti pre-image does not match');
            this.graffitiPreImage = _graffitiPreImage;
        };
        this.hash = () => {
            return (0, crypto_1.hash5)([
                this.posRep,
                this.negRep,
                this.graffiti,
                this.signUp,
                BigInt(0),
            ]);
        };
        this.posRep = _posRep;
        this.negRep = _negRep;
        this.graffiti = _graffiti;
        this.signUp = _signUp;
    }
    static default() {
        return new Reputation(BigInt(0), BigInt(0), BigInt(0), BigInt(0));
    }
}
exports.Reputation = Reputation;
const getTreeDepthsForTesting = () => {
    return {
        "userStateTreeDepth": config_1.circuitUserStateTreeDepth,
        "globalStateTreeDepth": config_1.circuitGlobalStateTreeDepth,
        "epochTreeDepth": config_1.circuitEpochTreeDepth,
    };
};
exports.getTreeDepthsForTesting = getTreeDepthsForTesting;
const toCompleteHexString = (str, len) => {
    str = (0, crypto_1.add0x)(str);
    if (len)
        str = ethers_1.ethers.utils.hexZeroPad(str, len);
    return str;
};
exports.toCompleteHexString = toCompleteHexString;
const genNewSMT = async (treeDepth, defaultLeafHash) => {
    return crypto_1.SparseMerkleTreeImpl.create(new keyv_1.default(), treeDepth, defaultLeafHash);
};
exports.genNewSMT = genNewSMT;
const genNewEpochTree = async (_epochTreeDepth = config_1.circuitEpochTreeDepth) => {
    const defaultOTSMTHash = SMT_ONE_LEAF;
    return genNewSMT(_epochTreeDepth, defaultOTSMTHash);
};
exports.genNewEpochTree = genNewEpochTree;
const defaultUserStateLeaf = (0, crypto_1.hash5)([BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)]);
exports.defaultUserStateLeaf = defaultUserStateLeaf;
const computeEmptyUserStateRoot = (treeDepth) => {
    const t = new crypto_1.IncrementalQuinTree(treeDepth, defaultUserStateLeaf, 2);
    return t.root;
};
exports.computeEmptyUserStateRoot = computeEmptyUserStateRoot;
const defaultGSTLeaf = (treeDepth) => {
    const USTRoot = computeEmptyUserStateRoot(treeDepth);
    return (0, crypto_1.hashLeftRight)(BigInt(0), USTRoot);
};
exports.defaultGSTLeaf = defaultGSTLeaf;
const genNewUserStateTree = async (_userStateTreeDepth = config_1.circuitUserStateTreeDepth) => {
    return genNewSMT(_userStateTreeDepth, defaultUserStateLeaf);
};
exports.genNewUserStateTree = genNewUserStateTree;
const genEpochKey = (identityNullifier, epoch, nonce, _epochTreeDepth = config_1.circuitEpochTreeDepth) => {
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
    return (0, crypto_1.hash5)([EPOCH_KEY_NULLIFIER_DOMAIN, identityNullifier, BigInt(epoch), BigInt(nonce), BigInt(0)]);
};
exports.genEpochKeyNullifier = genEpochKeyNullifier;
const bootstrapRandomUSTree = async () => {
    const expectedNumAttestationsMade = 5;
    const userStateTree = await genNewUserStateTree();
    let reputationRecords = {};
    // Bootstrap user state for the first `expectedNumAttestationsMade` attesters
    for (let i = 1; i < expectedNumAttestationsMade; i++) {
        const attesterId = BigInt(Math.ceil(Math.random() * (2 ** config_1.circuitUserStateTreeDepth - 1)));
        if (reputationRecords[attesterId.toString()] === undefined) {
            const signUp = Math.floor(Math.random() * 2);
            reputationRecords[attesterId.toString()] = new Reputation(BigInt(Math.floor(Math.random() * 100)), BigInt(Math.floor(Math.random() * 100)), (0, crypto_1.genRandomSalt)(), BigInt(signUp));
        }
        await userStateTree.update(BigInt(attesterId), reputationRecords[attesterId.toString()].hash());
    }
    return { userStateTree, reputationRecords };
};
exports.bootstrapRandomUSTree = bootstrapRandomUSTree;
const genEpochKeyCircuitInput = (id, tree, leafIndex, ustRoot, epoch, nonce) => {
    const proof = tree.genMerklePath(leafIndex);
    const root = tree.root;
    const epk = genEpochKey(id['identityNullifier'], epoch, nonce);
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
const genStartTransitionCircuitInput = (id, tree, leafIndex, ustRoot, epoch, nonce) => {
    const proof = tree.genMerklePath(leafIndex);
    const root = tree.root;
    const circuitInputs = {
        epoch: epoch,
        nonce: nonce,
        user_tree_root: ustRoot,
        identity_pk: id['keypair']['pubKey'],
        identity_nullifier: id['identityNullifier'],
        identity_trapdoor: id['identityTrapdoor'],
        GST_path_elements: proof.pathElements,
        GST_path_index: proof.indices,
        GST_root: root
    };
    return (0, crypto_1.stringifyBigInts)(circuitInputs);
};
exports.genStartTransitionCircuitInput = genStartTransitionCircuitInput;
const genProcessAttestationsCircuitInput = async (id, epoch, fromNonce, toNonce, _selectors, _hashChainStarter, _attestations) => {
    const oldPosReps = [];
    const oldNegReps = [];
    const oldGraffities = [];
    const oldSignUps = [];
    const attesterIds = [];
    const posReps = [];
    const negReps = [];
    const overwriteGraffitis = [];
    const graffities = [];
    const signUps = [];
    let selectors = [];
    const hashChainStarter = _hashChainStarter === undefined ? (0, crypto_1.genRandomSalt)() : _hashChainStarter;
    const intermediateUserStateTreeRoots = [];
    const userStateTreePathElements = [];
    const userStateTree = await genNewUserStateTree();
    let reputationRecords = {};
    // Bootstrap user state
    for (let i = 0; i < config_1.numAttestationsPerProof; i++) {
        // attester ID cannot be 0
        const attesterId = BigInt(Math.ceil(Math.random() * (2 ** config_1.circuitUserStateTreeDepth - 1)));
        if (reputationRecords[attesterId.toString()] === undefined) {
            const signUp = Math.floor(Math.random() * 2);
            reputationRecords[attesterId.toString()] = new Reputation(BigInt(Math.floor(Math.random() * 100)), BigInt(Math.floor(Math.random() * 100)), (0, crypto_1.genRandomSalt)(), BigInt(signUp));
        }
        await userStateTree.update(attesterId, reputationRecords[attesterId.toString()].hash());
    }
    intermediateUserStateTreeRoots.push(userStateTree.getRootHash());
    // Ensure as least one of the selectors is true
    const selTrue = Math.floor(Math.random() * config_1.numAttestationsPerProof);
    for (let i = 0; i < config_1.numAttestationsPerProof; i++) {
        if (i == selTrue)
            selectors.push(1);
        else
            selectors.push(Math.floor(Math.random() * 2));
    }
    if (_selectors !== undefined)
        selectors = _selectors;
    let hashChainResult = hashChainStarter;
    for (let i = 0; i < config_1.numAttestationsPerProof; i++) {
        let attesterId;
        let attestation;
        if (_attestations === undefined) {
            // attester ID cannot be 0
            attesterId = BigInt(Math.ceil(Math.random() * (2 ** config_1.circuitUserStateTreeDepth - 1)));
            const signUp = Math.floor(Math.random() * 2);
            attestation = new src_1.Attestation(attesterId, BigInt(Math.floor(Math.random() * 100)), BigInt(Math.floor(Math.random() * 100)), BigInt(0), BigInt(signUp));
        }
        else {
            attesterId = _attestations[i].attesterId;
            attestation = _attestations[i];
        }
        attesterIds.push(attesterId);
        posReps.push(attestation['posRep']);
        negReps.push(attestation['negRep']);
        graffities.push(attestation['graffiti']);
        signUps.push(attestation['signUp']);
        overwriteGraffitis.push(BigInt(attestation['graffiti'] != BigInt(0)));
        if (reputationRecords[attesterId.toString()] === undefined) {
            reputationRecords[attesterId.toString()] = Reputation.default();
        }
        if (selectors[i] == 1) {
            oldPosReps.push(reputationRecords[attesterId.toString()]['posRep']);
            oldNegReps.push(reputationRecords[attesterId.toString()]['negRep']);
            oldGraffities.push(reputationRecords[attesterId.toString()]['graffiti']);
            oldSignUps.push(reputationRecords[attesterId.toString()]['signUp']);
            // Get old reputation record proof
            const oldReputationRecordProof = await userStateTree.getMerkleProof(attesterId);
            userStateTreePathElements.push(oldReputationRecordProof);
            // Update reputation record
            reputationRecords[attesterId.toString()].update(attestation['posRep'], attestation['negRep'], attestation['graffiti'], attestation['signUp']);
            await userStateTree.update(attesterId, reputationRecords[attesterId.toString()].hash());
            const attestation_hash = attestation.hash();
            hashChainResult = (0, crypto_1.hashLeftRight)(attestation_hash, hashChainResult);
        }
        else {
            oldPosReps.push(BigInt(0));
            oldNegReps.push(BigInt(0));
            oldGraffities.push(BigInt(0));
            oldSignUps.push(BigInt(0));
            const leafZeroPathElements = await userStateTree.getMerkleProof(BigInt(0));
            userStateTreePathElements.push(leafZeroPathElements);
        }
        intermediateUserStateTreeRoots.push(userStateTree.getRootHash());
    }
    const inputBlindedUserState = (0, crypto_1.hash5)([id['identityNullifier'], intermediateUserStateTreeRoots[0], epoch, fromNonce]);
    const circuitInputs = {
        epoch: epoch,
        from_nonce: fromNonce,
        to_nonce: toNonce,
        identity_nullifier: id['identityNullifier'],
        intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
        old_pos_reps: oldPosReps,
        old_neg_reps: oldNegReps,
        old_graffities: oldGraffities,
        old_sign_ups: oldSignUps,
        path_elements: userStateTreePathElements,
        attester_ids: attesterIds,
        pos_reps: posReps,
        neg_reps: negReps,
        graffities: graffities,
        overwrite_graffities: overwriteGraffitis,
        sign_ups: signUps,
        selectors: selectors,
        hash_chain_starter: hashChainStarter,
        input_blinded_user_state: inputBlindedUserState,
    };
    return { circuitInputs: (0, crypto_1.stringifyBigInts)(circuitInputs), hashChainResult: hashChainResult };
};
exports.genProcessAttestationsCircuitInput = genProcessAttestationsCircuitInput;
const genUserStateTransitionCircuitInput = async (id, epoch) => {
    // config
    const startEpochKeyNonce = Math.floor(Math.random() * config_1.numEpochKeyNoncePerEpoch);
    const endEpochKeyNonce = (startEpochKeyNonce + config_1.numEpochKeyNoncePerEpoch - 1) % config_1.numEpochKeyNoncePerEpoch;
    // Epoch tree
    const epochTree = await genNewEpochTree();
    // User state tree
    const { userStateTree } = await bootstrapRandomUSTree();
    const intermediateUserStateTreeRoots = [];
    const blindedUserState = [];
    const blindedHashChain = [];
    const epochTreePathElements = [];
    intermediateUserStateTreeRoots.push(userStateTree.getRootHash());
    blindedUserState.push((0, crypto_1.hash5)([id['identityNullifier'], userStateTree.getRootHash(), BigInt(epoch), BigInt(startEpochKeyNonce)]));
    // Global state tree
    const GSTree = new crypto_1.IncrementalQuinTree(config_1.circuitGlobalStateTreeDepth, GSTZERO_VALUE, 2);
    const commitment = (0, crypto_1.genIdentityCommitment)(id);
    const hashedLeaf = (0, crypto_1.hashLeftRight)(commitment, userStateTree.getRootHash());
    GSTree.insert(hashedLeaf);
    const GSTreeProof = GSTree.genMerklePath(0);
    const GSTreeRoot = GSTree.root;
    const hashChainResults = [];
    // Begin generating and processing attestations
    for (let nonce = 0; nonce < config_1.numEpochKeyNoncePerEpoch; nonce++) {
        // Each epoch key has `ATTESTATIONS_PER_EPOCH_KEY` of attestations so
        // interval between starting index of each epoch key is `ATTESTATIONS_PER_EPOCH_KEY`.
        const epochKey = genEpochKey(id['identityNullifier'], epoch, nonce, config_1.circuitEpochTreeDepth);
        const hashChainResult = (0, crypto_1.genRandomSalt)();
        // Blinded hash chain result
        hashChainResults.push(hashChainResult);
        blindedHashChain.push((0, crypto_1.hash5)([id['identityNullifier'], hashChainResult, BigInt(epoch), BigInt(nonce)]));
        // Seal hash chain of this epoch key
        const sealedHashChainResult = (0, crypto_1.hashLeftRight)(BigInt(1), hashChainResult);
        // Update epoch tree
        await epochTree.update(epochKey, sealedHashChainResult);
    }
    const intermediateUserStateTreeRoot = (0, crypto_1.genRandomSalt)();
    intermediateUserStateTreeRoots.push(intermediateUserStateTreeRoot);
    blindedUserState.push((0, crypto_1.hash5)([id['identityNullifier'], intermediateUserStateTreeRoot, BigInt(epoch), BigInt(endEpochKeyNonce)]));
    for (let nonce = 0; nonce < config_1.numEpochKeyNoncePerEpoch; nonce++) {
        const epochKey = genEpochKey(id['identityNullifier'], epoch, nonce, config_1.circuitEpochTreeDepth);
        // Get epoch tree root and merkle proof for this epoch key
        epochTreePathElements.push(await epochTree.getMerkleProof(epochKey));
    }
    const epochTreeRoot = epochTree.getRootHash();
    const circuitInputs = {
        epoch: epoch,
        blinded_user_state: blindedUserState,
        intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
        start_epoch_key_nonce: startEpochKeyNonce,
        end_epoch_key_nonce: endEpochKeyNonce,
        identity_pk: id['keypair']['pubKey'],
        identity_nullifier: id['identityNullifier'],
        identity_trapdoor: id['identityTrapdoor'],
        GST_path_elements: GSTreeProof.pathElements,
        GST_path_index: GSTreeProof.indices,
        GST_root: GSTreeRoot,
        epk_path_elements: epochTreePathElements,
        hash_chain_results: hashChainResults,
        blinded_hash_chain_results: blindedHashChain,
        epoch_tree_root: epochTreeRoot
    };
    return (0, crypto_1.stringifyBigInts)(circuitInputs);
};
exports.genUserStateTransitionCircuitInput = genUserStateTransitionCircuitInput;
const genReputationCircuitInput = async (id, epoch, nonce, reputationRecords, attesterId, _repNullifiersAmount, _minRep, _proveGraffiti, _graffitiPreImage) => {
    const epk = genEpochKey(id['identityNullifier'], epoch, nonce);
    const repNullifiersAmount = _repNullifiersAmount === undefined ? 0 : _repNullifiersAmount;
    const minRep = _minRep === undefined ? 0 : _minRep;
    const proveGraffiti = _proveGraffiti === undefined ? 0 : _proveGraffiti;
    let graffitiPreImage;
    if (proveGraffiti === 1 && reputationRecords[attesterId] !== undefined) {
        graffitiPreImage = reputationRecords[attesterId]['graffitiPreImage'];
    }
    graffitiPreImage = graffitiPreImage === undefined ? 0 : graffitiPreImage;
    if (reputationRecords[attesterId] === undefined) {
        reputationRecords[attesterId] = Reputation.default();
    }
    // User state tree
    const userStateTree = await genNewUserStateTree();
    for (const attester of Object.keys(reputationRecords)) {
        await userStateTree.update(BigInt(attester), reputationRecords[attester].hash());
    }
    const userStateRoot = userStateTree.getRootHash();
    const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId));
    // Global state tree
    const GSTree = new crypto_1.IncrementalQuinTree(config_1.circuitGlobalStateTreeDepth, GSTZERO_VALUE, 2);
    const commitment = (0, crypto_1.genIdentityCommitment)(id);
    const hashedLeaf = (0, crypto_1.hashLeftRight)(commitment, userStateRoot);
    GSTree.insert(hashedLeaf);
    const GSTreeProof = GSTree.genMerklePath(0); // if there is only one GST leaf, the index is 0
    const GSTreeRoot = GSTree.root;
    // selectors and karma nonce
    const nonceStarter = 0;
    const selectors = [];
    const nonceList = [];
    for (let i = 0; i < repNullifiersAmount; i++) {
        nonceList.push(BigInt(nonceStarter + i));
        selectors.push(BigInt(1));
    }
    for (let i = repNullifiersAmount; i < config_1.maxReputationBudget; i++) {
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
const genProveSignUpCircuitInput = async (id, epoch, reputationRecords, attesterId, _signUp) => {
    const nonce = 0;
    const epk = genEpochKey(id['identityNullifier'], epoch, nonce);
    if (reputationRecords[attesterId] === undefined) {
        reputationRecords[attesterId] = Reputation.default();
    }
    // User state tree
    const userStateTree = await genNewUserStateTree();
    for (const attester of Object.keys(reputationRecords)) {
        await userStateTree.update(BigInt(attester), reputationRecords[attester].hash());
    }
    const userStateRoot = userStateTree.getRootHash();
    const USTPathElements = await userStateTree.getMerkleProof(BigInt(attesterId));
    // Global state tree
    const GSTree = new crypto_1.IncrementalQuinTree(config_1.circuitGlobalStateTreeDepth, GSTZERO_VALUE, 2);
    const commitment = (0, crypto_1.genIdentityCommitment)(id);
    const hashedLeaf = (0, crypto_1.hashLeftRight)(commitment, userStateRoot);
    GSTree.insert(hashedLeaf);
    const GSTreeProof = GSTree.genMerklePath(0); // if there is only one GST leaf, the index is 0
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
const formatProofAndPublicSignals = (circuit, proof, publicSignals) => {
    let result;
    const formattedProof = (0, circuits_1.formatProofForVerifierContract)(proof);
    if (circuit === circuits_1.Circuit.proveReputation) {
        result = new src_1.ReputationProof(publicSignals, proof);
    }
    else if (circuit === circuits_1.Circuit.verifyEpochKey) {
        result = new src_1.EpochKeyProof(publicSignals, proof);
    }
    else if (circuit === circuits_1.Circuit.proveUserSignUp) {
        result = new src_1.SignUpProof(publicSignals, proof);
    }
    else if (circuit === circuits_1.Circuit.startTransition) {
        result = {
            blindedUserState: publicSignals[0],
            blindedHashChain: publicSignals[1],
            GSTRoot: publicSignals[2],
            proof: formattedProof
        };
    }
    else if (circuit === circuits_1.Circuit.processAttestations) {
        result = {
            outputBlindedUserState: publicSignals[0],
            outputBlindedHashChain: publicSignals[1],
            inputBlindedUserState: publicSignals[2],
            proof: formattedProof
        };
    }
    else if (circuit === circuits_1.Circuit.userStateTransition) {
        result = new src_1.UserTransitionProof(publicSignals, proof);
    }
    else {
        result = publicSignals.concat([formattedProof]);
    }
    return result;
};
exports.formatProofAndPublicSignals = formatProofAndPublicSignals;
const genProofAndVerify = async (circuit, circuitInputs) => {
    const startTime = new Date().getTime();
    const { proof, publicSignals } = await (0, circuits_1.genProofAndPublicSignals)(circuit, circuitInputs);
    const endTime = new Date().getTime();
    console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`);
    const isValid = await (0, circuits_1.verifyProof)(circuit, proof, publicSignals);
    return isValid;
};
exports.genProofAndVerify = genProofAndVerify;
const genInputForContract = async (circuit, circuitInputs) => {
    const startTime = new Date().getTime();
    const { proof, publicSignals } = await (0, circuits_1.genProofAndPublicSignals)(circuit, circuitInputs);
    const endTime = new Date().getTime();
    console.log(`Gen Proof time: ${endTime - startTime} ms (${Math.floor((endTime - startTime) / 1000)} s)`);
    const input = formatProofAndPublicSignals(circuit, proof, publicSignals);
    return input;
};
exports.genInputForContract = genInputForContract;
