"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureSubparser = exports.genReputationProof = void 0;
const base64url_1 = __importDefault(require("base64url"));
const ethers_1 = require("ethers");
const crypto_1 = require("@unirep/crypto");
const circuits_1 = require("@unirep/circuits");
const defaults_1 = require("./defaults");
const core_1 = require("../core");
const prefix_1 = require("./prefix");
const configureSubparser = (subparsers) => {
    const parser = subparsers.add_parser('genReputationProof', { add_help: true });
    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${defaults_1.DEFAULT_ETH_PROVIDER}`,
    });
    parser.add_argument('-id', '--identity', {
        required: true,
        type: 'str',
        help: 'The (serialized) user\'s identity',
    });
    parser.add_argument('-n', '--epoch-key-nonce', {
        required: true,
        type: 'int',
        help: 'The epoch key nonce',
    });
    parser.add_argument('-a', '--attester-id', {
        required: true,
        type: 'str',
        help: 'The attester id (in hex representation)',
    });
    parser.add_argument('-r', '--reputation-nullifier', {
        type: 'int',
        help: 'The number of reputation nullifiers to prove',
    });
    parser.add_argument('-mr', '--min-rep', {
        type: 'int',
        help: 'The minimum positive score minus negative score the attester given to the user',
    });
    parser.add_argument('-gp', '--graffiti-preimage', {
        type: 'str',
        help: 'The pre-image of the graffiti for the reputation the attester given to the user (in hex representation)',
    });
    parser.add_argument('-x', '--contract', {
        required: true,
        type: 'str',
        help: 'The Unirep contract address',
    });
};
exports.configureSubparser = configureSubparser;
const genReputationProof = async (args) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : defaults_1.DEFAULT_ETH_PROVIDER;
    const provider = new ethers_1.ethers.providers.JsonRpcProvider(ethProvider);
    // User Identity
    const encodedIdentity = args.identity.slice(prefix_1.identityPrefix.length);
    const decodedIdentity = base64url_1.default.decode(encodedIdentity);
    const id = (0, crypto_1.unSerialiseIdentity)(decodedIdentity);
    // Gen User State
    const userState = await (0, core_1.genUserStateFromContract)(provider, args.contract, id);
    // Proving content
    const epoch = userState.getUnirepStateCurrentEpoch();
    const attesterId = BigInt((0, crypto_1.add0x)(args.attester_id));
    const epkNonce = args.epoch_key_nonce;
    const proveGraffiti = args.graffiti_preimage != null ? BigInt(1) : BigInt(0);
    const minRep = args.min_rep != null ? args.min_rep : 0;
    const repNullifiersAmount = args.reputation_nullifier != null ? args.reputation_nullifier : 0;
    const nonceList = [];
    const rep = userState.getRepByAttester(attesterId);
    let nonceStarter = -1;
    if (repNullifiersAmount > 0) {
        // find valid nonce starter
        for (let n = 0; n < Number(rep.posRep) - Number(rep.negRep); n++) {
            const reputationNullifier = (0, core_1.genReputationNullifier)(id.getNullifier(), epoch, n, attesterId);
            if (!userState.nullifierExist(reputationNullifier)) {
                nonceStarter = n;
                break;
            }
        }
        if (nonceStarter == -1) {
            console.error('Error: All nullifiers are spent');
        }
        if ((nonceStarter + repNullifiersAmount) > Number(rep.posRep) - Number(rep.negRep)) {
            console.error('Error: Not enough reputation to spend');
        }
        for (let i = 0; i < repNullifiersAmount; i++) {
            nonceList.push(BigInt(nonceStarter + i));
        }
    }
    for (let i = repNullifiersAmount; i < core_1.maxReputationBudget; i++) {
        nonceList.push(BigInt(-1));
    }
    const graffitiPreImage = args.graffiti_preimage != null ? BigInt((0, crypto_1.add0x)(args.graffiti_preimage)) : BigInt(0);
    const results = await userState.genProveReputationProof(attesterId, epkNonce, minRep, proveGraffiti, graffitiPreImage, nonceList);
    console.log('repnullifier amount', repNullifiersAmount);
    // TODO: Not sure if this validation is necessary
    const isValid = await (0, circuits_1.verifyProof)(circuits_1.Circuit.proveReputation, results.proof, results.publicSignals);
    if (!isValid) {
        console.error('Error: reputation proof generated is not valid!');
    }
    const formattedProof = (0, circuits_1.formatProofForVerifierContract)(results.proof);
    const encodedProof = base64url_1.default.encode(JSON.stringify(formattedProof));
    const encodedPublicSignals = base64url_1.default.encode(JSON.stringify(results.publicSignals));
    console.log(`Proof of reputation from attester ${results.attesterId}:`);
    console.log(`Epoch key of the user: ${BigInt(results.epochKey).toString()}`);
    console.log(prefix_1.reputationProofPrefix + encodedProof);
    console.log(prefix_1.reputationPublicSignalsPrefix + encodedPublicSignals);
};
exports.genReputationProof = genReputationProof;
