"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnirepState = exports.Attestation = void 0;
const assert_1 = __importDefault(require("assert"));
const crypto_1 = require("@unirep/crypto");
const utils_1 = require("./utils");
class Attestation {
    constructor(_attesterId, _posRep, _negRep, _graffiti, _signUp) {
        this.hash = () => {
            return crypto_1.hash5([
                this.attesterId,
                this.posRep,
                this.negRep,
                this.graffiti,
                this.signUp,
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
        this.epochTreeRoot = {};
        this.GSTLeaves = {};
        this.epochTreeLeaves = {};
        this.nullifiers = {};
        this.globalStateTree = {};
        this.epochTree = {};
        this.latestProcessedBlock = 0;
        this.epochKeyInEpoch = {};
        this.epochKeyToAttestationsMap = {};
        this.epochGSTRootMap = {};
        this.toJSON = (space = 0) => {
            const epochKeys = this.getEpochKeys(this.currentEpoch);
            const attestationsMapToString = {};
            for (const key of epochKeys) {
                attestationsMapToString[key] = this.epochKeyToAttestationsMap[key].map((n) => (n.toJSON()));
            }
            const epochTreeLeavesToString = {};
            const GSTRootsToString = {};
            for (let index in this.epochTreeLeaves) {
                epochTreeLeavesToString[index] = this.epochTreeLeaves[index].map((l) => `${l.epochKey.toString()}: ${l.hashchainResult.toString()}`);
            }
            for (let index in this.epochGSTRootMap) {
                GSTRootsToString[index] = Array.from(this.epochGSTRootMap[index].keys());
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
                    defaultGSTLeaf: this.setting.defaultGSTLeaf.toString(),
                },
                currentEpoch: this.currentEpoch,
                latestProcessedBlock: this.latestProcessedBlock,
                GSTLeaves: Object(crypto_1.stringifyBigInts(this.GSTLeaves)),
                epochTreeLeaves: Object(epochTreeLeavesToString),
                latestEpochKeyToAttestationsMap: attestationsMapToString,
                globalStateTreeRoots: GSTRootsToString,
                nullifiers: Object.keys(this.nullifiers)
            }, null, space);
        };
        /*
         * Get the number of GST leaves of given epoch
         */
        this.getNumGSTLeaves = (epoch) => {
            if (epoch > this.currentEpoch)
                return 0;
            return this.GSTLeaves[epoch].length;
        };
        // /*
        //  * Get the hash chain result of given epoch key
        //  */
        // public getHashchain = (epochKey: string): BigInt => {
        //     const DefaultHashchainResult = SMT_ONE_LEAF
        //     const hashchain = this.epochKeyToHashchainMap[epochKey]
        //     if (!hashchain) return DefaultHashchainResult
        //     else return hashchain
        // }
        /*
         * Get the attestations of given epoch key
         */
        this.getAttestations = (epochKey) => {
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
            if (this.epochKeyInEpoch[epoch] == undefined)
                return [];
            return Array.from(this.epochKeyInEpoch[epoch].keys());
        };
        /*
         * Check if given nullifier exists in Unirep State
         */
        this.nullifierExist = (nullifier) => {
            if (nullifier === BigInt(0)) {
                console.log("Nullifier 0 exists because it is reserved");
                return true;
            }
            return this.nullifiers[nullifier.toString()];
        };
        /*
         * Add a new attestation to the list of attestations to the epoch key.
         */
        this.addAttestation = (epochKey, attestation, blockNumber) => {
            if (blockNumber !== undefined && blockNumber < this.latestProcessedBlock)
                return;
            else
                this.latestProcessedBlock = blockNumber ? blockNumber : this.latestProcessedBlock;
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
            if (blockNumber !== undefined && blockNumber < this.latestProcessedBlock)
                return;
            else
                this.latestProcessedBlock = blockNumber ? blockNumber : this.latestProcessedBlock;
            if (nullifier > BigInt(0)) {
                this.nullifiers[nullifier.toString()] = true;
            }
        };
        /*
         * Computes the global state tree of given epoch
         */
        this.genGSTree = (epoch) => {
            return this.globalStateTree[epoch];
        };
        /*
         * Computes the epoch tree of given epoch
         */
        this.genEpochTree = async (epoch) => {
            const epochTree = await utils_1.genNewSMT(this.setting.epochTreeDepth, utils_1.SMT_ONE_LEAF);
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
         * Add a new state leaf to the list of GST leaves of given epoch.
         */
        this.signUp = (epoch, GSTLeaf, blockNumber) => {
            assert_1.default(epoch == this.currentEpoch, `Epoch(${epoch}) must be the same as current epoch`);
            if (blockNumber !== undefined && blockNumber < this.latestProcessedBlock)
                return;
            else
                this.latestProcessedBlock = blockNumber ? blockNumber : this.latestProcessedBlock;
            // Note that we do not insert a state leaf to any state tree here. This
            // is because we want to keep the state minimal, and only compute what
            // is necessary when it is needed. This may change if we run into
            // severe performance issues, but it is currently worth the tradeoff.
            this.GSTLeaves[epoch].push(GSTLeaf);
            // update GST when new leaf is inserted
            // keep track of each GST root when verifying proofs
            this.globalStateTree[epoch].insert(GSTLeaf);
            this.epochGSTRootMap[epoch].set(this.globalStateTree[epoch].root.toString(), true);
        };
        /*
         * Add the leaves of epoch tree of given epoch and increment current epoch number
         */
        this.epochTransition = async (epoch, blockNumber) => {
            assert_1.default(epoch == this.currentEpoch, `Epoch(${epoch}) must be the same as current epoch`);
            if (blockNumber !== undefined && blockNumber < this.latestProcessedBlock)
                return;
            else
                this.latestProcessedBlock = blockNumber ? blockNumber : this.latestProcessedBlock;
            this.epochTree[epoch] = await utils_1.genNewSMT(this.setting.epochTreeDepth, utils_1.SMT_ONE_LEAF);
            const epochTreeLeaves = [];
            // seal all epoch keys in current epoch
            for (let epochKey of this.epochKeyInEpoch[epoch].keys()) {
                let hashChain = BigInt(0);
                for (let i = 0; i < this.epochKeyToAttestationsMap[epochKey].length; i++) {
                    hashChain = crypto_1.hashLeftRight(this.epochKeyToAttestationsMap[epochKey][i].hash(), hashChain);
                }
                const sealedHashChainResult = crypto_1.hashLeftRight(BigInt(1), hashChain);
                const epochTreeLeaf = {
                    epochKey: BigInt(epochKey),
                    hashchainResult: sealedHashChainResult
                };
                epochTreeLeaves.push(epochTreeLeaf);
            }
            // Add to epoch key hash chain map
            for (let leaf of epochTreeLeaves) {
                assert_1.default(leaf.epochKey < BigInt(2 ** this.setting.epochTreeDepth), `Epoch key(${leaf.epochKey}) greater than max leaf value(2**epochTreeDepth)`);
                // if (this.epochKeyToHashchainMap[leaf.epochKey.toString()] !== undefined) console.log(`The epoch key(${leaf.epochKey}) is seen before`)
                // else this.epochKeyToHashchainMap[leaf.epochKey.toString()] = leaf.hashchainResult
                await this.epochTree[epoch].update(leaf.epochKey, leaf.hashchainResult);
            }
            this.epochTreeLeaves[epoch] = epochTreeLeaves.slice();
            this.epochTreeRoot[epoch] = this.epochTree[epoch].getRootHash();
            this.currentEpoch++;
            this.GSTLeaves[this.currentEpoch] = [];
            this.epochKeyInEpoch[this.currentEpoch] = new Map();
            this.globalStateTree[this.currentEpoch] = new crypto_1.IncrementalQuinTree(this.setting.globalStateTreeDepth, this.setting.defaultGSTLeaf, 2);
            this.epochGSTRootMap[this.currentEpoch] = new Map();
        };
        /*
         * Add a new state leaf to the list of GST leaves of given epoch.
         */
        this.userStateTransition = (epoch, GSTLeaf, nullifiers, blockNumber) => {
            assert_1.default(epoch == this.currentEpoch, `Epoch(${epoch}) must be the same as current epoch`);
            if (blockNumber !== undefined && blockNumber < this.latestProcessedBlock)
                return;
            else
                this.latestProcessedBlock = blockNumber ? blockNumber : this.latestProcessedBlock;
            // Check if all nullifiers are not duplicated then update Unirep state
            for (let nullifier of nullifiers) {
                if (nullifier > BigInt(0)) {
                    if (this.nullifiers[nullifier.toString()])
                        return;
                }
            }
            // Update Unirep state when all nullifiers are not submitted before
            for (let nullifier of nullifiers) {
                if (nullifier > BigInt(0))
                    this.nullifiers[nullifier.toString()] = true;
            }
            // Only insert non-zero GST leaf (zero GST leaf means the user has epoch keys left to process)
            if (GSTLeaf > BigInt(0)) {
                this.GSTLeaves[epoch].push(GSTLeaf);
                this.globalStateTree[epoch].insert(GSTLeaf);
                this.epochGSTRootMap[epoch].set(this.globalStateTree[epoch].root.toString(), true);
            }
        };
        /*
         * Check if the root is one of the Global state tree roots in the given epoch
         */
        this.GSTRootExists = (GSTRoot, epoch) => {
            return this.epochGSTRootMap[epoch].has(GSTRoot.toString());
        };
        /*
         * Check if the root is one of the epoch tree roots in the given epoch
         */
        this.epochTreeRootExists = async (_epochTreeRoot, epoch) => {
            if (this.epochTreeRoot[epoch] == undefined) {
                const epochTree = await this.genEpochTree(epoch);
                this.epochTreeRoot[epoch] = epochTree.getRootHash();
            }
            return this.epochTreeRoot[epoch].toString() == _epochTreeRoot.toString();
        };
        this.setting = _setting;
        if (_currentEpoch !== undefined)
            this.currentEpoch = _currentEpoch;
        else
            this.currentEpoch = 1;
        if (_latestBlock !== undefined)
            this.latestProcessedBlock = _latestBlock;
        this.epochKeyInEpoch[this.currentEpoch] = new Map();
        this.epochTreeRoot[this.currentEpoch] = BigInt(0);
        if (_GSTLeaves !== undefined) {
            this.GSTLeaves = _GSTLeaves;
            for (let key in this.GSTLeaves) {
                this.globalStateTree[key] = new crypto_1.IncrementalQuinTree(this.setting.globalStateTreeDepth, this.setting.defaultGSTLeaf, 2);
                this.epochGSTRootMap[key] = new Map();
                this.GSTLeaves[key].map(n => {
                    this.globalStateTree[key].insert(n);
                    this.epochGSTRootMap[key].set(this.globalStateTree[key].root.toString(), true);
                });
            }
        }
        else {
            this.GSTLeaves[this.currentEpoch] = [];
            this.globalStateTree[this.currentEpoch] = new crypto_1.IncrementalQuinTree(this.setting.globalStateTreeDepth, this.setting.defaultGSTLeaf, 2);
            this.epochGSTRootMap[this.currentEpoch] = new Map();
        }
        if (_epochTreeLeaves !== undefined)
            this.epochTreeLeaves = _epochTreeLeaves;
        else
            this.epochTreeLeaves = {};
        if (_epochKeyToAttestationsMap !== undefined) {
            this.epochKeyToAttestationsMap = _epochKeyToAttestationsMap;
            for (const key in this.epochKeyToAttestationsMap) {
                this.epochKeyInEpoch[this.currentEpoch].set(key, true);
            }
        }
        else
            this.epochKeyToAttestationsMap = {};
        if (_nullifiers != undefined)
            this.nullifiers = _nullifiers;
        else
            this.nullifiers = {};
    }
}
exports.UnirepState = UnirepState;
