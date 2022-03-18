"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureSubparser = exports.userSignUp = void 0;
const base64url_1 = __importDefault(require("base64url"));
const crypto_1 = require("@unirep/crypto");
const defaults_1 = require("./defaults");
const prefix_1 = require("./prefix");
const core_1 = require("../core");
const configureSubparser = (subparsers) => {
    const parser = subparsers.add_parser('userSignUp', { add_help: true });
    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${defaults_1.DEFAULT_ETH_PROVIDER}`,
    });
    parser.add_argument('-c', '--identity-commitment', {
        required: true,
        type: 'str',
        help: 'The user\'s identity commitment (in hex representation)',
    });
    parser.add_argument('-x', '--contract', {
        required: true,
        type: 'str',
        help: 'The Unirep contract address',
    });
    parser.add_argument('-d', '--eth-privkey', {
        action: 'store',
        type: 'str',
        help: 'The user\'s Ethereum private key',
    });
};
exports.configureSubparser = configureSubparser;
const userSignUp = async (args) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : defaults_1.DEFAULT_ETH_PROVIDER;
    // Unirep contract
    const unirepContract = new core_1.UnirepContract(args.contract, ethProvider);
    // Connect a signer
    await unirepContract.unlock(args.eth_privkey);
    // Parse identity commitment
    const encodedCommitment = args.identity_commitment.slice(prefix_1.identityCommitmentPrefix.length);
    const decodedCommitment = base64url_1.default.decode(encodedCommitment);
    const commitment = (0, crypto_1.add0x)(decodedCommitment);
    // Submit the user sign up transaction
    const tx = await unirepContract.userSignUp(commitment);
    const epoch = await unirepContract.currentEpoch();
    console.log('Transaction hash:', tx === null || tx === void 0 ? void 0 : tx.hash);
    console.log('Sign up epoch:', epoch.toString());
};
exports.userSignUp = userSignUp;
