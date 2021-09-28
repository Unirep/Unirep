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
    constructor(_globalStateTreeDepth, _userStateTreeDepth, _epochTreeDepth, _attestingFee, _epochLength, _numEpochKeyNoncePerEpoch, _maxReputationBudget) {
        this.epochTreeRoot = {};
        this.GSTLeaves = {};
        this.epochTreeLeaves = {};
        this.nullifiers = {};
        this.globalStateTree = {};
        this.epochTree = {};
        this.epochKeyToHashchainMap = {};
        this.epochKeyToAttestationsMap = {};
        this.blindedUserStateMap = {};
        this.blindedHashChainMap = {};
        this.epochGSTRootMap = {};
        this.toJSON = (space = 0) => {
            let latestEpochTreeLeaves;
            let latestEpothTreeRoot;
            if (this.currentEpoch == 1) {
                latestEpochTreeLeaves = [];
                latestEpothTreeRoot = BigInt(0).toString();
            }
            else {
                latestEpochTreeLeaves = this.epochTreeLeaves[this.currentEpoch - 1].map((l) => `${l.epochKey.toString()}: ${l.hashchainResult.toString()}`);
                latestEpothTreeRoot = this.epochTreeRoot[this.currentEpoch - 1].toString();
            }
            return JSON.stringify({
                settings: {
                    globalStateTreeDepth: this.globalStateTreeDepth,
                    userStateTreeDepth: this.userStateTreeDepth,
                    epochTreeDepth: this.epochTreeDepth,
                    attestingFee: this.attestingFee.toString(),
                    epochLength: this.epochLength,
                    numEpochKeyNoncePerEpoch: this.numEpochKeyNoncePerEpoch,
                    maxReputationBudget: this.maxReputationBudget,
                    defaultGSTLeaf: this.defaultGSTLeaf.toString(),
                },
                currentEpoch: this.currentEpoch,
                latestEpochGSTLeaves: this.GSTLeaves[this.currentEpoch].map((l) => l.toString()),
                latestEpochTreeLeaves: latestEpochTreeLeaves,
                latestEpochTreeRoot: latestEpothTreeRoot,
                globalStateTreeRoots: Array.from(this.epochGSTRootMap[this.currentEpoch].keys()),
                nullifiers: this.nullifiers
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
        /*
         * Get the hash chain result of given epoch key
         */
        this.getHashchain = (epochKey) => {
            const DefaultHashchainResult = utils_1.SMT_ONE_LEAF;
            const hashchain = this.epochKeyToHashchainMap[epochKey];
            if (!hashchain)
                return DefaultHashchainResult;
            else
                return hashchain;
        };
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
        this.addAttestation = (epochKey, attestation) => {
            const attestations = this.epochKeyToAttestationsMap[epochKey];
            if (!attestations)
                this.epochKeyToAttestationsMap[epochKey] = [];
            this.epochKeyToAttestationsMap[epochKey].push(attestation);
        };
        /*
        * Add reputation nullifiers to the map state
        */
        this.addReputationNullifiers = (nullifier) => {
            if (nullifier > BigInt(0)) {
                this.nullifiers[nullifier.toString()] = true;
            }
        };
        /*
        * Add blinded user state to the map state
        */
        this.addBlindedUserState = (blindedUserState) => {
            this.blindedUserStateMap[blindedUserState.toString()] = true;
        };
        /*
        * Add blinded hash chain to the map state
        */
        this.addBlindedHashChain = (blindedHashChain) => {
            this.blindedHashChainMap[blindedHashChain.toString()] = true;
        };
        /*
         * Check if given blinded user state exists in Unirep State
         */
        this.blindedUserStateExist = (blindedUserState) => {
            return this.blindedUserStateMap[blindedUserState.toString()];
        };
        /*
         * Check if given blinded hash chain exists in Unirep State
         */
        this.blindedHashChainExist = (blindedHashChain) => {
            return this.blindedHashChainMap[blindedHashChain.toString()];
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
        this.genEpochTree = (epoch) => {
            return this.epochTree[epoch];
        };
        /*
         * Add a new state leaf to the list of GST leaves of given epoch.
         */
        this.signUp = (epoch, GSTLeaf) => {
            assert_1.default(epoch == this.currentEpoch, `Epoch(${epoch}) must be the same as current epoch`);
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
        this.epochTransition = async (epoch, epochTreeLeaves) => {
            assert_1.default(epoch == this.currentEpoch, `Epoch(${epoch}) must be the same as current epoch`);
            this.epochTree[epoch] = await utils_1.genNewSMT(this.epochTreeDepth, utils_1.SMT_ONE_LEAF);
            // Add to epoch key hash chain map
            for (let leaf of epochTreeLeaves) {
                assert_1.default(leaf.epochKey < BigInt(2 ** this.epochTreeDepth), `Epoch key(${leaf.epochKey}) greater than max leaf value(2**epochTreeDepth)`);
                if (this.epochKeyToHashchainMap[leaf.epochKey.toString()] !== undefined)
                    console.log(`The epoch key(${leaf.epochKey}) is seen before`);
                else
                    this.epochKeyToHashchainMap[leaf.epochKey.toString()] = leaf.hashchainResult;
                await this.epochTree[epoch].update(leaf.epochKey, leaf.hashchainResult);
            }
            this.epochTreeLeaves[epoch] = epochTreeLeaves.slice();
            this.epochTreeRoot[epoch] = this.epochTree[epoch].getRootHash();
            this.currentEpoch++;
            this.GSTLeaves[this.currentEpoch] = [];
            this.globalStateTree[this.currentEpoch] = new crypto_1.IncrementalQuinTree(this.globalStateTreeDepth, this.defaultGSTLeaf, 2);
            this.epochGSTRootMap[this.currentEpoch] = new Map();
        };
        /*
         * Add a new state leaf to the list of GST leaves of given epoch.
         */
        this.userStateTransition = (epoch, GSTLeaf, nullifiers) => {
            assert_1.default(epoch == this.currentEpoch, `Epoch(${epoch}) must be the same as current epoch`);
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
        this.epochTreeRootExists = (_epochTreeRoot, epoch) => {
            return this.epochTreeRoot[epoch].toString() == _epochTreeRoot.toString();
        };
        this.globalStateTreeDepth = _globalStateTreeDepth;
        this.userStateTreeDepth = _userStateTreeDepth;
        this.epochTreeDepth = _epochTreeDepth;
        this.attestingFee = _attestingFee;
        this.epochLength = _epochLength;
        this.numEpochKeyNoncePerEpoch = _numEpochKeyNoncePerEpoch;
        this.maxReputationBudget = _maxReputationBudget;
        this.currentEpoch = 1;
        this.GSTLeaves[this.currentEpoch] = [];
        this.epochTreeRoot[this.currentEpoch] = BigInt(0);
        const emptyUserStateRoot = utils_1.computeEmptyUserStateRoot(_userStateTreeDepth);
        this.defaultGSTLeaf = crypto_1.hashLeftRight(BigInt(0), emptyUserStateRoot);
        this.globalStateTree[this.currentEpoch] = new crypto_1.IncrementalQuinTree(this.globalStateTreeDepth, this.defaultGSTLeaf, 2);
        this.epochGSTRootMap[this.currentEpoch] = new Map();
    }
}
exports.UnirepState = UnirepState;
