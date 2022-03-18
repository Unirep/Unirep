"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureSubparser = exports.spendReputation = void 0;
const base64url_1 = __importDefault(require("base64url"));
const contracts_1 = require("@unirep/contracts");
const circuits_1 = require("@unirep/circuits");
const defaults_1 = require("./defaults");
const verifyReputationProof_1 = require("./verifyReputationProof");
const core_1 = require("../core");
const prefix_1 = require("./prefix");
const configureSubparser = (subparsers) => {
    const parser = subparsers.add_parser('spendReputation', { add_help: true });
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
    parser.add_argument('-d', '--eth-privkey', {
        required: true,
        action: 'store',
        type: 'str',
        help: 'The attester\'s Ethereum private key',
    });
};
exports.configureSubparser = configureSubparser;
const spendReputation = async (args) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : defaults_1.DEFAULT_ETH_PROVIDER;
    // Unirep contract
    const unirepContract = new core_1.UnirepContract(args.contract, ethProvider);
    // Connect a signer
    await unirepContract.unlock(args.eth_privkey);
    await (0, verifyReputationProof_1.verifyReputationProof)(args);
    // Parse Inputs
    const decodedProof = base64url_1.default.decode(args.proof.slice(prefix_1.reputationProofPrefix.length));
    const decodedPublicSignals = base64url_1.default.decode(args.public_signals.slice(prefix_1.reputationPublicSignalsPrefix.length));
    const proof = JSON.parse(decodedProof);
    const publicSignals = JSON.parse(decodedPublicSignals);
    const reputationProof = new contracts_1.ReputationProof(publicSignals, (0, circuits_1.formatProofForSnarkjsVerification)(proof));
    console.log(`User spends ${reputationProof.proveReputationAmount} reputation points from attester ${reputationProof.attesterId}`);
    // Submit reputation
    const tx = await unirepContract.spendReputation(reputationProof);
    await tx.wait();
    const proofIndex = await unirepContract.getReputationProofIndex(reputationProof);
    if (tx != undefined) {
        console.log('Transaction hash:', tx === null || tx === void 0 ? void 0 : tx.hash);
        console.log('Proof index:', proofIndex.toNumber());
    }
};
exports.spendReputation = spendReputation;
