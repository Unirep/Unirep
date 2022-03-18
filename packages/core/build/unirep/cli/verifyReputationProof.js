"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureSubparser = exports.verifyReputationProof = void 0;
const base64url_1 = __importDefault(require("base64url"));
const ethers_1 = require("ethers");
const defaults_1 = require("./defaults");
const core_1 = require("../core");
const prefix_1 = require("./prefix");
const testLocal_1 = require("../config/testLocal");
const contracts_1 = require("@unirep/contracts");
const circuits_1 = require("@unirep/circuits");
const configureSubparser = (subparsers) => {
    const parser = subparsers.add_parser('verifyReputationProof', { add_help: true });
    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${defaults_1.DEFAULT_ETH_PROVIDER}`,
    });
    parser.add_argument('-ep', '--epoch', {
        action: 'store',
        type: 'int',
        help: 'The latest epoch user transitioned to. Default: current epoch',
    });
    parser.add_argument('-p', '--public-signals', {
        required: true,
        type: 'str',
        help: 'The snark public signals of the user\'s epoch key ',
    });
    parser.add_argument('-pf', '--proof', {
        required: true,
        type: 'str',
        help: 'The snark proof of the user\'s epoch key ',
    });
    parser.add_argument('-x', '--contract', {
        required: true,
        type: 'str',
        help: 'The Unirep contract address',
    });
};
exports.configureSubparser = configureSubparser;
const verifyReputationProof = async (args) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : defaults_1.DEFAULT_ETH_PROVIDER;
    const provider = new ethers_1.ethers.providers.JsonRpcProvider(ethProvider);
    // Unirep contract
    const unirepContract = new core_1.UnirepContract(args.contract, ethProvider);
    const unirepState = await (0, core_1.genUnirepStateFromContract)(provider, args.contract);
    // Parse Inputs
    const decodedProof = base64url_1.default.decode(args.proof.slice(prefix_1.reputationProofPrefix.length));
    const decodedPublicSignals = base64url_1.default.decode(args.public_signals.slice(prefix_1.reputationPublicSignalsPrefix.length));
    const publicSignals = JSON.parse(decodedPublicSignals);
    const outputNullifiers = publicSignals.slice(0, testLocal_1.maxReputationBudget);
    const epoch = publicSignals[testLocal_1.maxReputationBudget];
    const epk = publicSignals[testLocal_1.maxReputationBudget + 1];
    const GSTRoot = publicSignals[testLocal_1.maxReputationBudget + 2];
    const attesterId = publicSignals[testLocal_1.maxReputationBudget + 3];
    const repNullifiersAmount = publicSignals[testLocal_1.maxReputationBudget + 4];
    const minRep = publicSignals[testLocal_1.maxReputationBudget + 5];
    const proveGraffiti = publicSignals[testLocal_1.maxReputationBudget + 6];
    const graffitiPreImage = publicSignals[testLocal_1.maxReputationBudget + 7];
    const proof = JSON.parse(decodedProof);
    // Check if Global state tree root exists
    const isGSTRootExisted = unirepState.GSTRootExists(GSTRoot, epoch);
    if (!isGSTRootExisted) {
        console.error('Error: invalid global state tree root');
        return;
    }
    // Verify the proof on-chain
    const reputationProof = new contracts_1.ReputationProof(publicSignals, (0, circuits_1.formatProofForSnarkjsVerification)(proof));
    const isProofValid = await unirepContract.verifyReputation(reputationProof);
    if (!isProofValid) {
        console.error('Error: invalid reputation proof');
        return;
    }
    console.log(`Epoch key of the user: ${epk}`);
    console.log(`Verify reputation proof from attester ${attesterId} with min rep ${minRep}, reputation nullifiers amount ${repNullifiersAmount} and graffiti pre-image ${args.graffiti_preimage}, succeed`);
};
exports.verifyReputationProof = verifyReputationProof;
