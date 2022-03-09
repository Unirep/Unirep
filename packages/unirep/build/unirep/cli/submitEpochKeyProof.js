"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureSubparser = exports.submitEpochKeyProof = void 0;
const base64url_1 = __importDefault(require("base64url"));
const circuits_1 = require("@unirep/circuits");
const contracts_1 = require("@unirep/contracts");
const defaults_1 = require("./defaults");
const core_1 = require("../core");
const prefix_1 = require("./prefix");
const configureSubparser = (subparsers) => {
    const parser = subparsers.add_parser('submitEpochKeyProof', { add_help: true });
    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${defaults_1.DEFAULT_ETH_PROVIDER}`,
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
const submitEpochKeyProof = async (args) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : defaults_1.DEFAULT_ETH_PROVIDER;
    // Unirep contract
    const unirepContract = new core_1.UnirepContract(args.contract, ethProvider);
    const currentEpoch = Number(await unirepContract.currentEpoch());
    const decodedProof = base64url_1.default.decode(args.proof.slice(prefix_1.epkProofPrefix.length));
    const decodedPublicSignals = base64url_1.default.decode(args.public_signals.slice(prefix_1.epkPublicSignalsPrefix.length));
    const proof = JSON.parse(decodedProof);
    const publicSignals = JSON.parse(decodedPublicSignals);
    const epochKeyProof = new contracts_1.EpochKeyProof(publicSignals, (0, circuits_1.formatProofForSnarkjsVerification)(proof));
    const inputEpoch = epochKeyProof.epoch;
    console.log(`Submit epoch key ${epochKeyProof.epochKey} with GSTRoot ${epochKeyProof.globalStateTree} in epoch ${inputEpoch}`);
    if (inputEpoch != currentEpoch) {
        console.log(`Warning: the epoch key is expired. Epoch key is in epoch ${inputEpoch}, but the current epoch is ${currentEpoch}`);
    }
    // Connect a signer
    await unirepContract.unlock(args.eth_privkey);
    // Submit epoch key proof
    const tx = await unirepContract.submitEpochKeyProof(epochKeyProof);
    const proofIndex = await unirepContract.getEpochKeyProofIndex(epochKeyProof);
    if (tx != undefined) {
        await tx.wait();
        console.log('Transaction hash:', tx === null || tx === void 0 ? void 0 : tx.hash);
        console.log('Proof index: ', proofIndex.toNumber());
    }
};
exports.submitEpochKeyProof = submitEpochKeyProof;
