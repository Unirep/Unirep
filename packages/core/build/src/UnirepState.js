"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnirepState = exports.Attestation = void 0;
const assert_1 = __importDefault(require("assert"));
const ethers_1 = require("ethers");
const crypto_1 = require("@unirep/crypto");
const utils_1 = require("./utils");
class Attestation {
    constructor(_attesterId, _posRep, _negRep, _graffiti, _signUp) {
        this.hash = () => {
            return (0, crypto_1.hash5)([
                ethers_1.BigNumber.from(this.attesterId).toBigInt(),
                ethers_1.BigNumber.from(this.posRep).toBigInt(),
                ethers_1.BigNumber.from(this.negRep).toBigInt(),
                ethers_1.BigNumber.from(this.graffiti).toBigInt(),
                ethers_1.BigNumber.from(this.signUp).toBigInt(),
            ]);
        };
        this.toJSON = (space = 0) => {
            return JSON.stringify({
                attesterId: this.attesterId.toString(),
                posRep: this.posRep.toString(),
                negRep: this.negRep.toString(),
                graffiti: this.graffiti.toString(),
                signUp: this.signUp.toString(),
            }, null, space);
        };
        this.attesterId = _attesterId;
        this.posRep = _posRep;
        this.negRep = _negRep;
        this.graffiti = _graffiti;
        this.signUp = _signUp;
    }
}
exports.Attestation = Attestation;
class UnirepState {
    constructor(_setting, _currentEpoch, _latestBlock, _GSTLeaves, _epochTreeLeaves, _epochKeyToAttestationsMap, _nullifiers) {
        this.currentEpoch = 1;
        this.epochTreeRoot = {};
        this.GSTLeaves = {};
        this.epochTreeLeaves = {};
        this.nullifiers = {};
        this.globalStateTree = {};
        this.epochTree = {};
        this.userNum = 0;
        this.latestProcessedBlock = 0;
        this.sealedEpochKey = {};
        this.epochKeyInEpoch = {};
        this.epochKeyToAttestationsMap = {};
        this.epochGSTRootMap = {};
        this.toJSON = (space = 0) => {
            const epochKeys = this.getEpochKeys(this.currentEpoch);
            const attestationsMapToString = {};
            for (const key of epochKeys) {
                attestationsMapToString[key] = this.epochKeyToAttestationsMap[key].map((n) => n.toJSON());
            }
            const epochTreeLeavesToString = {};
            for (let index in this.epochTreeLeaves) {
                epochTreeLeavesToString[index] = this.epochTreeLeaves[index].map((l) => `${l.epochKey.toString()}: ${l.hashchainResult.toString()}`);
            }
            return JSON.stringify({
                settings: {
                    globalStateTreeDepth: this.setting.globalStateTreeDepth,
                    userStateTreeDepth: this.setting.userStateTreeDepth,
                    epochTreeDepth: this.setting.epochTreeDepth,
                    attestingFee: this.setting.attestingFee.toString(),
                    epochLength: this.setting.epochLength,
                    numEpochKeyNoncePerEpoch: this.setting.numEpochKeyNoncePerEpoch,
                    maxReputationBudget: this.setting.maxReputationBudget,
                    defaultGSTLeaf: this.defaultGSTLeaf.toString(),
                },
                currentEpoch: this.currentEpoch,
                latestProcessedBlock: this.latestProcessedBlock,
                GSTLeaves: Object((0, crypto_1.stringifyBigInts)(this.GSTLeaves)),
                epochTreeLeaves: Object(epochTreeLeavesToString),
                latestEpochKeyToAttestationsMap: attestationsMapToString,
                nullifiers: Object.keys(this.nullifiers),
            }, null, space);
        };
        /*
         * Get the number of GST leaves of given epoch
         */
        this.getNumGSTLeaves = (epoch) => {
            this._checkValidEpoch(epoch);
            return this.GSTLeaves[epoch].length;
        };
        /*
         * Get the attestations of given epoch key
         */
        this.getAttestations = (epochKey) => {
            this._checkEpochKeyRange(epochKey);
            const attestations = this.epochKeyToAttestationsMap[epochKey];
            if (!attestations)
                return [];
            else
                return attestations;
        };
        /*
         * Get all epoch keys of given epoch key
         */
        this.getEpochKeys = (epoch) => {
            this._checkValidEpoch(epoch);
            if (this.epochKeyInEpoch[epoch] == undefined)
                return [];
            return Array.from(this.epochKeyInEpoch[epoch].keys());
        };
        /*
         * Check if given nullifier exists in Unirep State
         */
        this.nullifierExist = (nullifier) => {
            // Nullifier 0 exists because it is reserved
            if (nullifier === BigInt(0))
                return true;
            if (this.nullifiers[nullifier.toString()])
                return true;
            return false;
        };
        /*
         * If one of the nullifiers exist in Unirep state, return true
         */
        this.nullifiersExist = (nullifiers) => {
            let exist = false;
            for (let nullifier of nullifiers) {
                exist = this.nullifierExist(nullifier);
            }
            return exist;
        };
        /*
         * Check if the block has been processed
         */
        this._checkBlockNumber = (blockNumber) => {
            if (blockNumber !== undefined &&
                blockNumber < this.latestProcessedBlock)
                return;
            else
                this.latestProcessedBlock = blockNumber
                    ? blockNumber
                    : this.latestProcessedBlock;
        };
        /*
         * Check if epoch matches current epoch
         */
        this._checkCurrentEpoch = (epoch) => {
            (0, assert_1.default)(epoch === this.currentEpoch, `UnirepState: Epoch (${epoch}) must be the same as the current epoch ${this.currentEpoch}`);
        };
        /*
         * Check if epoch is less than the current epoch
         */
        this._checkValidEpoch = (epoch) => {
            (0, assert_1.default)(epoch <= this.currentEpoch, `UnirepState: Epoch (${epoch}) must be less than the current epoch ${this.currentEpoch}`);
        };
        /*
         * Check if the user number is greater than the capacity
         */
        this._checkMaxUser = () => {
            (0, assert_1.default)(this.userNum < 2 ** this.setting.globalStateTreeDepth, `UnirepState: users number reaches the Unirep capacity, it should be less than ${2 ** this.setting.globalStateTreeDepth}`);
        };
        /*
         * Check if nullifier has been submitted before
         */
        this._checkNullifier = (nullifier) => {
            (0, assert_1.default)(this.nullifierExist(nullifier) === false, `UnirepState: Nullifier ${nullifier.toString()} has been submitted before`);
        };
        /*
         * Check if epoch key is greater than max epoch tree leaf value
         */
        this._checkEpochKeyRange = (epochKey) => {
            (0, assert_1.default)(BigInt(epochKey) < BigInt(2 ** this.setting.epochTreeDepth), `UnirepState: Epoch key (${epochKey}) greater than max leaf value(2**epochTreeDepth)`);
        };
        /*
         * Check if epoch key has been sealed
         */
        this._isEpochKeySealed = (epochKey) => {
            (0, assert_1.default)(this.sealedEpochKey[epochKey] !== true, `UnirepState: Epoch key (${epochKey}) has been sealed`);
        };
        /*
         * Update Unirep global state tree in the given epoch
         */
        this._updateGSTree = (epoch, GSTLeaf) => {
            // Only insert non-zero GST leaf (zero GST leaf means the user has epoch keys left to process)
            if (GSTLeaf <= BigInt(0))
                return;
            this.GSTLeaves[epoch].push(GSTLeaf);
            // update GST when new leaf is inserted
            // keep track of each GST root when verifying proofs
            this.globalStateTree[epoch].insert(GSTLeaf);
            this.epochGSTRootMap[epoch].set(this.globalStateTree[epoch].root.toString(), true);
        };
        /*
         * Computes the global state tree of given epoch
         */
        this.genGSTree = (epoch) => {
            this._checkValidEpoch(epoch);
            return this.globalStateTree[epoch];
        };
        /*
         * Computes the epoch tree of given epoch
         */
        this.genEpochTree = async (epoch) => {
            this._checkValidEpoch(epoch);
            const epochTree = await (0, utils_1.genNewSMT)(this.setting.epochTreeDepth, utils_1.SMT_ONE_LEAF);
            const leaves = this.epochTreeLeaves[epoch];
            if (!leaves)
                return epochTree;
            else {
                for (const leaf of leaves) {
                    await epochTree.update(leaf.epochKey, leaf.hashchainResult);
                }
                return epochTree;
            }
        };
        /*
         * Check if the root is one of the Global state tree roots in the given epoch
         */
        this.GSTRootExists = (GSTRoot, epoch) => {
            this._checkValidEpoch(epoch);
            return this.epochGSTRootMap[epoch].has(GSTRoot.toString());
        };
        /*
         * Check if the root is one of the epoch tree roots in the given epoch
         */
        this.epochTreeRootExists = async (_epochTreeRoot, epoch) => {
            this._checkValidEpoch(epoch);
            if (this.epochTreeRoot[epoch] == undefined) {
                const epochTree = await this.genEpochTree(epoch);
                this.epochTreeRoot[epoch] = epochTree.getRootHash();
            }
            return this.epochTreeRoot[epoch].toString() == _epochTreeRoot.toString();
        };
        /*
         * Add a new state leaf to the list of GST leaves of given epoch.
         */
        this.signUp = async (epoch, idCommitment, attesterId, airdropAmount, blockNumber) => {
            this._checkCurrentEpoch(epoch);
            this._checkBlockNumber(blockNumber);
            this._checkMaxUser();
            let GSTLeaf;
            const USTRoot = await (0, utils_1.computeInitUserStateRoot)(this.setting.userStateTreeDepth, attesterId, airdropAmount);
            GSTLeaf = (0, crypto_1.hashLeftRight)(idCommitment, USTRoot);
            this._updateGSTree(epoch, GSTLeaf);
            this.userNum++;
        };
        /*
         * Add a new attestation to the list of attestations to the epoch key.
         */
        this.addAttestation = (epochKey, attestation, blockNumber) => {
            this._checkBlockNumber(blockNumber);
            this._checkEpochKeyRange(epochKey);
            this._isEpochKeySealed(epochKey);
            const attestations = this.epochKeyToAttestationsMap[epochKey];
            if (!attestations)
                this.epochKeyToAttestationsMap[epochKey] = [];
            this.epochKeyToAttestationsMap[epochKey].push(attestation);
            this.epochKeyInEpoch[this.currentEpoch].set(epochKey, true);
        };
        /*
         * Add reputation nullifiers to the map state
         */
        this.addReputationNullifiers = (nullifier, blockNumber) => {
            this._checkBlockNumber(blockNumber);
            this._checkNullifier(nullifier);
            this.nullifiers[nullifier.toString()] = true;
        };
        /*
         * Add the leaves of epoch tree of given epoch and increment current epoch number
         */
        this.epochTransition = async (epoch, blockNumber) => {
            this._checkCurrentEpoch(epoch);
            this._checkBlockNumber(blockNumber);
            this.epochTree[epoch] = await (0, utils_1.genNewSMT)(this.setting.epochTreeDepth, utils_1.SMT_ONE_LEAF);
            const epochTreeLeaves = [];
            // seal all epoch keys in current epoch
            for (let epochKey of this.epochKeyInEpoch[epoch].keys()) {
                this._checkEpochKeyRange(epochKey);
                this._isEpochKeySealed(epochKey);
                let hashChain = BigInt(0);
                for (let i = 0; i < this.epochKeyToAttestationsMap[epochKey].length; i++) {
                    hashChain = (0, crypto_1.hashLeftRight)(ethers_1.BigNumber.from(this.epochKeyToAttestationsMap[epochKey][i].hash()).toBigInt(), hashChain);
                }
                const sealedHashChainResult = (0, crypto_1.hashLeftRight)(BigInt(1), hashChain);
                const epochTreeLeaf = {
                    epochKey: BigInt(epochKey),
                    hashchainResult: sealedHashChainResult,
                };
                epochTreeLeaves.push(epochTreeLeaf);
                this.sealedEpochKey[epochKey] = true;
            }
            // Add to epoch key hash chain map
            for (let leaf of epochTreeLeaves) {
                await this.epochTree[epoch].update(leaf.epochKey, leaf.hashchainResult);
            }
            this.epochTreeLeaves[epoch] = epochTreeLeaves.slice();
            this.epochTreeRoot[epoch] = this.epochTree[epoch].getRootHash();
            this.currentEpoch++;
            this.GSTLeaves[this.currentEpoch] = [];
            this.epochKeyInEpoch[this.currentEpoch] = new Map();
            this.globalStateTree[this.currentEpoch] = new crypto_1.IncrementalMerkleTree(this.setting.globalStateTreeDepth, this.defaultGSTLeaf, 2);
            this.epochGSTRootMap[this.currentEpoch] = new Map();
        };
        /*
         * Add a new state leaf to the list of GST leaves in the current epoch.
         */
        this.userStateTransition = (fromEpoch, GSTLeaf, nullifiers, blockNumber) => {
            this._checkValidEpoch(fromEpoch);
            this._checkBlockNumber(blockNumber);
            (0, assert_1.default)(nullifiers.length === this.setting.numEpochKeyNoncePerEpoch, `UnirepState: wrong epoch key nullifiers amount. 
            Expect (${this.setting.numEpochKeyNoncePerEpoch}) nullifiers`);
            // Check if all nullifiers are not duplicated then update Unirep state
            for (let nullifier of nullifiers) {
                this._checkNullifier(nullifier);
            }
            // Update Unirep state when all nullifiers are not submitted before
            for (let nullifier of nullifiers) {
                this.nullifiers[nullifier.toString()] = true;
            }
            this._updateGSTree(this.currentEpoch, GSTLeaf);
        };
        this.setting = _setting;
        if (_currentEpoch !== undefined)
            this.currentEpoch = _currentEpoch;
        if (_latestBlock !== undefined)
            this.latestProcessedBlock = _latestBlock;
        this.epochKeyInEpoch[this.currentEpoch] = new Map();
        this.epochTreeRoot[this.currentEpoch] = BigInt(0);
        const emptyUserStateRoot = (0, utils_1.computeEmptyUserStateRoot)(this.setting.userStateTreeDepth);
        this.defaultGSTLeaf = (0, crypto_1.hashLeftRight)(BigInt(0), emptyUserStateRoot);
        if (_GSTLeaves !== undefined) {
            this.GSTLeaves = _GSTLeaves;
            for (let key in this.GSTLeaves) {
                this.globalStateTree[key] = new crypto_1.IncrementalMerkleTree(this.setting.globalStateTreeDepth, this.defaultGSTLeaf, 2);
                this.epochGSTRootMap[key] = new Map();
                this.GSTLeaves[key].map((n) => {
                    this.globalStateTree[key].insert(n);
                    this.epochGSTRootMap[key].set(this.globalStateTree[key].root.toString(), true);
                });
            }
        }
        else {
            this.GSTLeaves[this.currentEpoch] = [];
            this.globalStateTree[this.currentEpoch] = new crypto_1.IncrementalMerkleTree(this.setting.globalStateTreeDepth, this.defaultGSTLeaf, 2);
            this.epochGSTRootMap[this.currentEpoch] = new Map();
        }
        if (_epochTreeLeaves !== undefined) {
            this.epochTreeLeaves = _epochTreeLeaves;
            for (const key in _epochTreeLeaves) {
                for (const leaf of _epochTreeLeaves[key]) {
                    this.sealedEpochKey[leaf.epochKey.toString()] = true;
                }
            }
        }
        if (_epochKeyToAttestationsMap !== undefined) {
            this.epochKeyToAttestationsMap = _epochKeyToAttestationsMap;
            for (const key in this.epochKeyToAttestationsMap) {
                this.epochKeyInEpoch[this.currentEpoch].set(key, true);
            }
        }
        if (_nullifiers != undefined)
            this.nullifiers = _nullifiers;
    }
}
exports.UnirepState = UnirepState;
