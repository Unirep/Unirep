"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserState = exports.Reputation = void 0;
const assert_1 = __importDefault(require("assert"));
const crypto_1 = require("@unirep/crypto");
const circuits_1 = require("@unirep/circuits");
const utils_1 = require("./utils");
const testLocal_1 = require("../config/testLocal");
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
            assert_1.default(crypto_1.hashOne(_graffitiPreImage) === this.graffiti, 'Graffiti pre-image does not match');
            this.graffitiPreImage = _graffitiPreImage;
        };
        this.hash = () => {
            return crypto_1.hash5([
                this.posRep,
                this.negRep,
                this.graffiti,
                this.signUp,
                BigInt(0),
            ]);
        };
        this.toJSON = (space = 0) => {
            return JSON.stringify({
                posRep: this.posRep.toString(),
                negRep: this.negRep.toString(),
                graffiti: this.graffiti.toString(),
                graffitiPreImage: this.graffitiPreImage.toString(),
                signUp: this.signUp.toString()
            }, null, space);
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
class UserState {
    constructor(_unirepState, _id, _commitment, _hasSignedUp, _latestTransitionedEpoch, _latestGSTLeafIndex, _latestUserStateLeaves) {
        this.hasSignedUp = false;
        this.toJSON = (space = 0) => {
            return JSON.stringify({
                idNullifier: this.id.identityNullifier.toString(),
                idCommitment: this.commitment.toString(),
                hasSignedUp: this.hasSignedUp,
                latestTransitionedEpoch: this.latestTransitionedEpoch,
                latestGSTLeafIndex: this.latestGSTLeafIndex,
                latestUserStateLeaves: this.latestUserStateLeaves.map((l) => `${l.attesterId.toString()}: ${l.reputation.toJSON()}`),
                unirepState: JSON.parse(this.unirepState.toJSON())
            }, null, space);
        };
        /*
         * Proxy methods to get underlying UnirepState data
         */
        this.getUnirepStateCurrentEpoch = () => {
            return this.unirepState.currentEpoch;
        };
        this.getUnirepStateGSTree = (epoch) => {
            return this.unirepState.genGSTree(epoch);
        };
        this.getUnirepStateEpochTree = async (epoch) => {
            return this.unirepState.genEpochTree(epoch);
        };
        /*
         * Get the attestations of given epoch key
         */
        this.getAttestations = (epochKey) => {
            return this.unirepState.getAttestations(epochKey);
        };
        /*
         * Get the epoch key nullifier of given epoch
         */
        this.getEpochKeyNullifiers = (epoch) => {
            const nullifiers = [];
            for (let nonce = 0; nonce < this.numEpochKeyNoncePerEpoch; nonce++) {
                const nullifier = utils_1.genEpochKeyNullifier(this.id.identityNullifier, epoch, nonce);
                nullifiers.push(nullifier);
            }
            return nullifiers;
        };
        this.getRepByAttester = (attesterId) => {
            const leaf = this.latestUserStateLeaves.find((leaf) => leaf.attesterId == attesterId);
            if (leaf !== undefined)
                return leaf.reputation;
            else
                return Reputation.default();
        };
        /*
         * Check if given nullifier exists in nullifier tree
         */
        this.nullifierExist = (nullifier) => {
            return this.unirepState.nullifierExist(nullifier);
        };
        /*
         * Add a new epoch key to the list of epoch key of current epoch.
         */
        this.signUp = (_latestTransitionedEpoch, _latestGSTLeafIndex, _attesterId, _airdropAmount) => {
            assert_1.default(!this.hasSignedUp, "User has already signed up");
            this.latestTransitionedEpoch = _latestTransitionedEpoch;
            this.latestGSTLeafIndex = _latestGSTLeafIndex;
            this.hasSignedUp = true;
            const signUpInLeaf = 1;
            if (_attesterId && _airdropAmount) {
                const stateLeave = {
                    attesterId: BigInt(_attesterId),
                    reputation: Reputation.default().update(BigInt(_airdropAmount), BigInt(0), BigInt(0), BigInt(signUpInLeaf))
                };
                this.latestUserStateLeaves = [stateLeave];
            }
        };
        /*
         * Computes the user state tree with given state leaves
         */
        this._genUserStateTreeFromLeaves = async (leaves) => {
            const USTree = await utils_1.genNewSMT(this.userStateTreeDepth, utils_1.defaultUserStateLeaf);
            for (const leaf of leaves) {
                await USTree.update(leaf.attesterId, leaf.reputation.hash());
            }
            return USTree;
        };
        /*
         * Computes the user state tree of given epoch
         */
        this.genUserStateTree = async () => {
            const leaves = this.latestUserStateLeaves;
            return (await this._genUserStateTreeFromLeaves(leaves));
        };
        this.genVerifyEpochKeyProof = async (epochKeyNonce) => {
            assert_1.default(this.hasSignedUp, "User has not signed up yet");
            assert_1.default(epochKeyNonce < this.numEpochKeyNoncePerEpoch, `epochKeyNonce(${epochKeyNonce}) must be less than max epoch nonce`);
            const epoch = this.latestTransitionedEpoch;
            const epochKey = utils_1.genEpochKey(this.id.identityNullifier, epoch, epochKeyNonce, this.unirepState.epochTreeDepth);
            const userStateTree = await this.genUserStateTree();
            const GSTree = this.unirepState.genGSTree(epoch);
            const GSTProof = GSTree.genMerklePath(this.latestGSTLeafIndex);
            const circuitInputs = crypto_1.stringifyBigInts({
                GST_path_elements: GSTProof.pathElements,
                GST_path_index: GSTProof.indices,
                GST_root: GSTree.root,
                identity_pk: this.id.keypair.pubKey,
                identity_nullifier: this.id.identityNullifier,
                identity_trapdoor: this.id.identityTrapdoor,
                user_tree_root: userStateTree.getRootHash(),
                nonce: epochKeyNonce,
                epoch: epoch,
                epoch_key: epochKey,
            });
            const results = await circuits_1.genProofAndPublicSignals('verifyEpochKey', circuitInputs);
            return {
                proof: results['proof'],
                publicSignals: results['publicSignals'],
                globalStateTree: results['publicSignals'][0],
                epoch: results['publicSignals'][1],
                epochKey: results['publicSignals'][2],
            };
        };
        this._updateUserStateLeaf = (attestation, stateLeaves) => {
            const attesterId = attestation.attesterId;
            for (const leaf of stateLeaves) {
                if (leaf.attesterId === attesterId) {
                    leaf.reputation = leaf.reputation.update(attestation.posRep, attestation.negRep, attestation.graffiti, attestation.signUp);
                    return stateLeaves;
                }
            }
            // If no matching state leaf, insert new one
            const newLeaf = {
                attesterId: attesterId,
                reputation: Reputation.default().update(attestation.posRep, attestation.negRep, attestation.graffiti, attestation.signUp)
            };
            stateLeaves.push(newLeaf);
            return stateLeaves;
        };
        this.genNewUserStateAfterTransition = async () => {
            assert_1.default(this.hasSignedUp, "User has not signed up yet");
            const fromEpoch = this.latestTransitionedEpoch;
            let stateLeaves;
            stateLeaves = this.latestUserStateLeaves.slice();
            for (let nonce = 0; nonce < this.numEpochKeyNoncePerEpoch; nonce++) {
                const epkNullifier = utils_1.genEpochKeyNullifier(this.id.identityNullifier, fromEpoch, nonce);
                assert_1.default(!this.unirepState.nullifierExist(epkNullifier), `Epoch key with nonce ${nonce} is already processed, it's nullifier: ${epkNullifier}`);
                const epochKey = utils_1.genEpochKey(this.id.identityNullifier, fromEpoch, nonce, this.unirepState.epochTreeDepth);
                const attestations = this.unirepState.getAttestations(epochKey.toString());
                for (let i = 0; i < attestations.length; i++) {
                    const attestation = attestations[i];
                    stateLeaves = this._updateUserStateLeaf(attestation, stateLeaves);
                }
            }
            // Gen new user state tree
            const newUserStateTree = await this._genUserStateTreeFromLeaves(stateLeaves);
            // Gen new GST leaf
            const newGSTLeaf = crypto_1.hashLeftRight(this.commitment, newUserStateTree.getRootHash());
            return {
                'newGSTLeaf': newGSTLeaf,
                'newUSTLeaves': stateLeaves
            };
        };
        this._genStartTransitionCircuitInputs = async (fromNonce, userStateTreeRoot, GSTreeProof, GSTreeRoot) => {
            // Circuit inputs
            const circuitInputs = crypto_1.stringifyBigInts({
                epoch: this.latestTransitionedEpoch,
                nonce: fromNonce,
                user_tree_root: userStateTreeRoot,
                identity_pk: this.id.keypair.pubKey,
                identity_nullifier: this.id.identityNullifier,
                identity_trapdoor: this.id.identityTrapdoor,
                GST_path_elements: GSTreeProof.pathElements,
                GST_path_index: GSTreeProof.indices,
                GST_root: GSTreeRoot,
            });
            // Circuit outputs
            // blinded user state and blinded hash chain are the inputs of processAttestationProofs
            const blindedUserState = crypto_1.hash5([
                this.id.identityNullifier,
                userStateTreeRoot,
                this.latestTransitionedEpoch,
                fromNonce,
                BigInt(0)
            ]);
            const blindedHashChain = crypto_1.hash5([
                this.id.identityNullifier,
                BigInt(0),
                this.latestTransitionedEpoch,
                fromNonce,
                BigInt(0)
            ]);
            return {
                circuitInputs: circuitInputs,
                blindedUserState: blindedUserState,
                blindedHashChain: blindedHashChain,
            };
        };
        this.genUserStateTransitionProofs = async () => {
            assert_1.default(this.hasSignedUp, "User has not signed up yet");
            const fromEpoch = this.latestTransitionedEpoch;
            const fromNonce = 0;
            // User state tree
            const fromEpochUserStateTree = await this.genUserStateTree();
            const intermediateUserStateTreeRoots = [
                fromEpochUserStateTree.getRootHash()
            ];
            const userStateLeafPathElements = [];
            // GSTree
            const fromEpochGSTree = this.unirepState.genGSTree(fromEpoch);
            const GSTreeProof = fromEpochGSTree.genMerklePath(this.latestGSTLeafIndex);
            const GSTreeRoot = fromEpochGSTree.root;
            // Epoch tree
            const fromEpochTree = await this.unirepState.genEpochTree(fromEpoch);
            const epochTreeRoot = fromEpochTree.getRootHash();
            const epochKeyPathElements = [];
            // start transition proof
            const startTransitionCircuitInputs = await this._genStartTransitionCircuitInputs(fromNonce, intermediateUserStateTreeRoots[0], GSTreeProof, GSTreeRoot);
            // process attestation proof
            const processAttestationCircuitInputs = [];
            const fromNonces = [fromNonce];
            const toNonces = [];
            const hashChainStarter = [];
            const blindedUserState = [startTransitionCircuitInputs.blindedUserState];
            const blindedHashChain = [];
            let reputationRecords = {};
            const selectors = [];
            const attesterIds = [];
            const oldPosReps = [], oldNegReps = [], oldGraffities = [], oldSignUps = [];
            const posReps = [], negReps = [], graffities = [], overwriteGraffities = [], signUps = [];
            const finalBlindedUserState = [];
            const finalUserState = [intermediateUserStateTreeRoots[0]];
            const finalHashChain = [];
            for (let nonce = 0; nonce < this.numEpochKeyNoncePerEpoch; nonce++) {
                const epochKey = utils_1.genEpochKey(this.id.identityNullifier, fromEpoch, nonce, this.unirepState.epochTreeDepth);
                let currentHashChain = BigInt(0);
                // Blinded user state and hash chain of the epoch key
                toNonces.push(nonce);
                hashChainStarter.push(currentHashChain);
                // Attestations
                const attestations = this.unirepState.getAttestations(epochKey.toString());
                for (let i = 0; i < attestations.length; i++) {
                    // Include a blinded user state and blinded hash chain per proof
                    if (i && (i % this.numAttestationsPerProof == 0) && (i != this.numAttestationsPerProof - 1)) {
                        toNonces.push(nonce);
                        fromNonces.push(nonce);
                        hashChainStarter.push(currentHashChain);
                        blindedUserState.push(crypto_1.hash5([this.id.identityNullifier, fromEpochUserStateTree.getRootHash(), fromEpoch, nonce]));
                    }
                    const attestation = attestations[i];
                    const attesterId = attestation.attesterId;
                    const rep = this.getRepByAttester(attesterId);
                    if (reputationRecords[attesterId.toString()] === undefined) {
                        reputationRecords[attesterId.toString()] = new Reputation(rep.posRep, rep.negRep, rep.graffiti, rep.signUp);
                    }
                    oldPosReps.push(reputationRecords[attesterId.toString()]['posRep']);
                    oldNegReps.push(reputationRecords[attesterId.toString()]['negRep']);
                    oldGraffities.push(reputationRecords[attesterId.toString()]['graffiti']);
                    oldSignUps.push(reputationRecords[attesterId.toString()]['signUp']);
                    // Add UST merkle proof to the list
                    const USTLeafPathElements = await fromEpochUserStateTree.getMerkleProof(attesterId);
                    userStateLeafPathElements.push(USTLeafPathElements);
                    // Update attestation record
                    reputationRecords[attesterId.toString()].update(attestation['posRep'], attestation['negRep'], attestation['graffiti'], attestation['signUp']);
                    // Update UST
                    await fromEpochUserStateTree.update(attesterId, reputationRecords[attesterId.toString()].hash());
                    // Add new UST root to intermediate UST roots
                    intermediateUserStateTreeRoots.push(fromEpochUserStateTree.getRootHash());
                    selectors.push(1);
                    attesterIds.push(attesterId);
                    posReps.push(attestation['posRep']);
                    negReps.push(attestation['negRep']);
                    graffities.push(attestation['graffiti']);
                    overwriteGraffities.push(attestation['graffiti'] != BigInt(0));
                    signUps.push(attestation['signUp']);
                    // Update current hashchain result
                    const attestationHash = attestation.hash();
                    currentHashChain = crypto_1.hashLeftRight(attestationHash, currentHashChain);
                }
                // Fill in blank data for non-exist attestation
                const filledAttestationNum = attestations.length ? Math.ceil(attestations.length / this.numAttestationsPerProof) * this.numAttestationsPerProof : this.numAttestationsPerProof;
                for (let i = 0; i < (filledAttestationNum - attestations.length); i++) {
                    oldPosReps.push(BigInt(0));
                    oldNegReps.push(BigInt(0));
                    oldGraffities.push(BigInt(0));
                    oldSignUps.push(BigInt(0));
                    const USTLeafZeroPathElements = await fromEpochUserStateTree.getMerkleProof(BigInt(0));
                    userStateLeafPathElements.push(USTLeafZeroPathElements);
                    intermediateUserStateTreeRoots.push(fromEpochUserStateTree.getRootHash());
                    selectors.push(0);
                    attesterIds.push(BigInt(0));
                    posReps.push(BigInt(0));
                    negReps.push(BigInt(0));
                    graffities.push(BigInt(0));
                    overwriteGraffities.push(BigInt(0));
                    signUps.push(BigInt(0));
                }
                epochKeyPathElements.push(await fromEpochTree.getMerkleProof(epochKey));
                // finalUserState.push(fromEpochUserStateTree.getRootHash())
                finalHashChain.push(currentHashChain);
                blindedUserState.push(crypto_1.hash5([this.id.identityNullifier, fromEpochUserStateTree.getRootHash(), fromEpoch, nonce]));
                // finalBlindedUserState.push(hash5([this.id.identityNullifier, fromEpochUserStateTree.getRootHash(), fromEpoch, nonce]))
                blindedHashChain.push(crypto_1.hash5([this.id.identityNullifier, currentHashChain, fromEpoch, nonce]));
                if (nonce != this.numEpochKeyNoncePerEpoch - 1)
                    fromNonces.push(nonce);
            }
            for (let i = 0; i < fromNonces.length; i++) {
                const startIdx = this.numAttestationsPerProof * i;
                const endIdx = this.numAttestationsPerProof * (i + 1);
                // if(fromNonces[i] == toNonces[i] && intermediateUserStateTreeRoots[startIdx] == intermediateUserStateTreeRoots[endIdx]) continue
                processAttestationCircuitInputs.push(crypto_1.stringifyBigInts({
                    epoch: fromEpoch,
                    from_nonce: fromNonces[i],
                    to_nonce: toNonces[i],
                    identity_nullifier: this.id.identityNullifier,
                    intermediate_user_state_tree_roots: intermediateUserStateTreeRoots.slice(startIdx, endIdx + 1),
                    old_pos_reps: oldPosReps.slice(startIdx, endIdx),
                    old_neg_reps: oldNegReps.slice(startIdx, endIdx),
                    old_graffities: oldGraffities.slice(startIdx, endIdx),
                    old_sign_ups: oldSignUps.slice(startIdx, endIdx),
                    path_elements: userStateLeafPathElements.slice(startIdx, endIdx),
                    attester_ids: attesterIds.slice(startIdx, endIdx),
                    pos_reps: posReps.slice(startIdx, endIdx),
                    neg_reps: negReps.slice(startIdx, endIdx),
                    graffities: graffities.slice(startIdx, endIdx),
                    overwrite_graffities: overwriteGraffities.slice(startIdx, endIdx),
                    sign_ups: signUps.slice(startIdx, endIdx),
                    selectors: selectors.slice(startIdx, endIdx),
                    hash_chain_starter: hashChainStarter[i],
                    input_blinded_user_state: blindedUserState[i],
                }));
            }
            // final user state transition proof
            const startEpochKeyNonce = 0;
            const endEpochKeyNonce = this.numEpochKeyNoncePerEpoch - 1;
            finalUserState.push(fromEpochUserStateTree.getRootHash());
            finalBlindedUserState.push(crypto_1.hash5([this.id.identityNullifier, finalUserState[0], fromEpoch, startEpochKeyNonce]));
            finalBlindedUserState.push(crypto_1.hash5([this.id.identityNullifier, finalUserState[1], fromEpoch, endEpochKeyNonce]));
            const finalTransitionCircuitInputs = crypto_1.stringifyBigInts({
                epoch: fromEpoch,
                blinded_user_state: finalBlindedUserState,
                intermediate_user_state_tree_roots: finalUserState,
                start_epoch_key_nonce: startEpochKeyNonce,
                end_epoch_key_nonce: endEpochKeyNonce,
                identity_pk: this.id.keypair.pubKey,
                identity_nullifier: this.id.identityNullifier,
                identity_trapdoor: this.id.identityTrapdoor,
                GST_path_elements: GSTreeProof.pathElements,
                GST_path_index: GSTreeProof.indices,
                GST_root: GSTreeRoot,
                epk_path_elements: epochKeyPathElements,
                hash_chain_results: finalHashChain,
                blinded_hash_chain_results: blindedHashChain,
                epoch_tree_root: epochTreeRoot
            });
            // Generate proofs
            const startTransitionresults = await circuits_1.genProofAndPublicSignals('startTransition', startTransitionCircuitInputs.circuitInputs);
            const processAttestationProofs = [];
            for (let i = 0; i < processAttestationCircuitInputs.length; i++) {
                const results = await circuits_1.genProofAndPublicSignals('processAttestations', processAttestationCircuitInputs[i]);
                processAttestationProofs.push({
                    proof: results['proof'],
                    publicSignals: results['publicSignals'],
                    outputBlindedUserState: results['publicSignals'][0],
                    outputBlindedHashChain: results['publicSignals'][1],
                    inputBlindedUserState: results['publicSignals'][2],
                });
            }
            const finalProofResults = await circuits_1.genProofAndPublicSignals('userStateTransition', finalTransitionCircuitInputs);
            return {
                startTransitionProof: {
                    proof: startTransitionresults['proof'],
                    publicSignals: startTransitionresults['publicSignals'],
                    blindedUserState: startTransitionresults['publicSignals'][0],
                    blindedHashChain: startTransitionresults['publicSignals'][1],
                    globalStateTreeRoot: startTransitionresults['publicSignals'][2],
                },
                processAttestationProofs: processAttestationProofs,
                finalTransitionProof: {
                    proof: finalProofResults['proof'],
                    publicSignals: finalProofResults['publicSignals'],
                    newGlobalStateTreeLeaf: finalProofResults['publicSignals'][0],
                    epochKeyNullifiers: finalProofResults['publicSignals'].slice(1, 1 + testLocal_1.numEpochKeyNoncePerEpoch),
                    transitionedFromEpoch: finalProofResults['publicSignals'][1 + testLocal_1.numEpochKeyNoncePerEpoch],
                    blindedUserStates: finalProofResults['publicSignals'].slice(2 + testLocal_1.numEpochKeyNoncePerEpoch, 4 + testLocal_1.numEpochKeyNoncePerEpoch),
                    fromGSTRoot: finalProofResults['publicSignals'][4 + testLocal_1.numEpochKeyNoncePerEpoch],
                    blindedHashChains: finalProofResults['publicSignals'].slice(5 + testLocal_1.numEpochKeyNoncePerEpoch, 5 + 2 * testLocal_1.numEpochKeyNoncePerEpoch),
                    fromEpochTree: finalProofResults['publicSignals'][5 + 2 * testLocal_1.numEpochKeyNoncePerEpoch],
                }
            };
        };
        /*
         * Update transition data including latest transition epoch, GST leaf index and user state tree leaves.
         */
        this.transition = (latestStateLeaves) => {
            assert_1.default(this.hasSignedUp, "User has not signed up yet");
            const fromEpoch = this.latestTransitionedEpoch;
            const transitionToEpoch = this.unirepState.currentEpoch;
            const transitionToGSTIndex = this.unirepState.getNumGSTLeaves(transitionToEpoch);
            assert_1.default(fromEpoch < transitionToEpoch, "Can not transition to same epoch");
            this.latestTransitionedEpoch = transitionToEpoch;
            this.latestGSTLeafIndex = transitionToGSTIndex;
            // Update user state leaves
            this.latestUserStateLeaves = latestStateLeaves.slice();
        };
        this.genProveReputationProof = async (attesterId, epkNonce, minRep, proveGraffiti, graffitiPreImage, nonceList) => {
            assert_1.default(this.hasSignedUp, "User has not signed up yet");
            assert_1.default(attesterId > BigInt(0), `attesterId must be greater than zero`);
            assert_1.default(attesterId < BigInt(2 ** this.userStateTreeDepth), `attesterId exceeds total number of attesters`);
            if (nonceList == undefined)
                nonceList = new Array(this.unirepState.maxReputationBudget).fill(BigInt(-1));
            assert_1.default(nonceList.length == this.unirepState.maxReputationBudget, `Length of nonce list should be ${this.unirepState.maxReputationBudget}`);
            const epoch = this.latestTransitionedEpoch;
            const epochKey = utils_1.genEpochKey(this.id.identityNullifier, epoch, epkNonce);
            const rep = this.getRepByAttester(attesterId);
            const posRep = rep.posRep;
            const negRep = rep.negRep;
            const graffiti = rep.graffiti;
            const signUp = rep.signUp;
            const userStateTree = await this.genUserStateTree();
            const GSTree = this.unirepState.genGSTree(epoch);
            const GSTreeProof = GSTree.genMerklePath(this.latestGSTLeafIndex);
            const GSTreeRoot = GSTree.root;
            const USTPathElements = await userStateTree.getMerkleProof(attesterId);
            const selectors = [];
            const nonceExist = {};
            let repNullifiersAmount = 0;
            for (let i = 0; i < this.unirepState.maxReputationBudget; i++) {
                if (nonceList[i] != BigInt(-1)) {
                    assert_1.default(nonceExist[nonceList[i].toString()] == undefined, "cannot submit duplicated nonce to compute reputation nullifiers");
                    repNullifiersAmount++;
                    selectors[i] = BigInt(1);
                    nonceExist[nonceList[i].toString()] = 1;
                }
                else {
                    selectors[i] = BigInt(0);
                }
            }
            // check if the nullifiers are submitted before
            let nonceStarter = -1;
            if (repNullifiersAmount > 0) {
                // find valid nonce starter
                for (let n = 0; n < Number(posRep) - Number(negRep); n++) {
                    const reputationNullifier = utils_1.genReputationNullifier(this.id.identityNullifier, epoch, n, attesterId);
                    if (!this.unirepState.nullifierExist(reputationNullifier)) {
                        nonceStarter = n;
                        break;
                    }
                }
                assert_1.default(nonceStarter != -1, "All nullifiers are spent");
                assert_1.default((nonceStarter + repNullifiersAmount) <= Number(posRep) - Number(negRep), "Not enough reputation to spend");
            }
            const circuitInputs = crypto_1.stringifyBigInts({
                epoch: epoch,
                epoch_key_nonce: epkNonce,
                epoch_key: epochKey,
                identity_pk: this.id.keypair.pubKey,
                identity_nullifier: this.id.identityNullifier,
                identity_trapdoor: this.id.identityTrapdoor,
                user_tree_root: userStateTree.getRootHash(),
                GST_path_index: GSTreeProof.indices,
                GST_path_elements: GSTreeProof.pathElements,
                GST_root: GSTreeRoot,
                attester_id: attesterId,
                pos_rep: posRep,
                neg_rep: negRep,
                graffiti: graffiti,
                sign_up: signUp,
                UST_path_elements: USTPathElements,
                rep_nullifiers_amount: repNullifiersAmount,
                selectors: selectors,
                rep_nonce: nonceList,
                min_rep: minRep,
                prove_graffiti: proveGraffiti,
                graffiti_pre_image: graffitiPreImage
            });
            const results = await circuits_1.genProofAndPublicSignals('proveReputation', circuitInputs);
            return {
                proof: results['proof'],
                publicSignals: results['publicSignals'],
                reputationNullifiers: results['publicSignals'].slice(0, testLocal_1.maxReputationBudget),
                epoch: results['publicSignals'][testLocal_1.maxReputationBudget],
                epochKey: results['publicSignals'][testLocal_1.maxReputationBudget + 1],
                globalStatetreeRoot: results['publicSignals'][testLocal_1.maxReputationBudget + 2],
                attesterId: results['publicSignals'][testLocal_1.maxReputationBudget + 3],
                proveReputationAmount: results['publicSignals'][testLocal_1.maxReputationBudget + 4],
                minRep: results['publicSignals'][testLocal_1.maxReputationBudget + 5],
                proveGraffiti: results['publicSignals'][testLocal_1.maxReputationBudget + 6],
                graffitiPreImage: results['publicSignals'][testLocal_1.maxReputationBudget + 7],
            };
        };
        this.genUserSignUpProof = async (attesterId) => {
            assert_1.default(this.hasSignedUp, "User has not signed up yet");
            assert_1.default(attesterId > BigInt(0), `attesterId must be greater than zero`);
            assert_1.default(attesterId < BigInt(2 ** this.userStateTreeDepth), `attesterId exceeds total number of attesters`);
            const epoch = this.latestTransitionedEpoch;
            const nonce = 0; // fixed epk nonce
            const epochKey = utils_1.genEpochKey(this.id.identityNullifier, epoch, nonce);
            const rep = this.getRepByAttester(attesterId);
            const posRep = rep.posRep;
            const negRep = rep.negRep;
            const graffiti = rep.graffiti;
            const signUp = rep.signUp;
            const userStateTree = await this.genUserStateTree();
            const GSTree = this.unirepState.genGSTree(epoch);
            const GSTreeProof = GSTree.genMerklePath(this.latestGSTLeafIndex);
            const GSTreeRoot = GSTree.root;
            const USTPathElements = await userStateTree.getMerkleProof(attesterId);
            const circuitInputs = crypto_1.stringifyBigInts({
                epoch: epoch,
                epoch_key: epochKey,
                identity_pk: this.id.keypair.pubKey,
                identity_nullifier: this.id.identityNullifier,
                identity_trapdoor: this.id.identityTrapdoor,
                user_tree_root: userStateTree.getRootHash(),
                GST_path_index: GSTreeProof.indices,
                GST_path_elements: GSTreeProof.pathElements,
                GST_root: GSTreeRoot,
                attester_id: attesterId,
                pos_rep: posRep,
                neg_rep: negRep,
                graffiti: graffiti,
                sign_up: signUp,
                UST_path_elements: USTPathElements,
            });
            const results = await circuits_1.genProofAndPublicSignals('proveUserSignUp', circuitInputs);
            return {
                proof: results['proof'],
                publicSignals: results['publicSignals'],
                epoch: results['publicSignals'][0],
                epochKey: results['publicSignals'][1],
                globalStateTreeRoot: results['publicSignals'][2],
                attesterId: results['publicSignals'][3],
            };
        };
        assert_1.default(_unirepState !== undefined, "UnirepState is undefined");
        this.unirepState = _unirepState;
        this.userStateTreeDepth = this.unirepState.userStateTreeDepth;
        this.numEpochKeyNoncePerEpoch = this.unirepState.numEpochKeyNoncePerEpoch;
        this.numAttestationsPerProof = testLocal_1.numAttestationsPerProof;
        this.id = _id;
        this.commitment = _commitment;
        if (_hasSignedUp) {
            assert_1.default(_latestTransitionedEpoch !== undefined, "User has signed up but missing latestTransitionedEpoch");
            assert_1.default(_latestGSTLeafIndex !== undefined, "User has signed up but missing latestTransitionedEpoch");
            this.latestTransitionedEpoch = _latestTransitionedEpoch;
            this.latestGSTLeafIndex = _latestGSTLeafIndex;
            if (_latestUserStateLeaves !== undefined)
                this.latestUserStateLeaves = _latestUserStateLeaves;
            else
                this.latestUserStateLeaves = [];
            this.hasSignedUp = _hasSignedUp;
        }
        else {
            this.latestTransitionedEpoch = 0;
            this.latestGSTLeafIndex = 0;
            this.latestUserStateLeaves = [];
        }
    }
}
exports.UserState = UserState;
