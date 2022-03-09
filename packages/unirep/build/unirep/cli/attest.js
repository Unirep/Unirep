"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureSubparser = exports.attest = void 0;
const ethers_1 = require("ethers");
const crypto_1 = require("@unirep/crypto");
const defaults_1 = require("./defaults");
const core_1 = require("../core");
const configureSubparser = (subparsers) => {
    const parser = subparsers.add_parser('attest', { add_help: true });
    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${defaults_1.DEFAULT_ETH_PROVIDER}`,
    });
    parser.add_argument('-toi', '--to-proof-index', {
        required: true,
        type: 'int',
        help: 'The proof index of the receiver\'s epoch key ',
    });
    parser.add_argument('-fromi', '--from-proof-index', {
        type: 'int',
        help: 'The proof index of the sender\'s epoch key ',
    });
    parser.add_argument('-epk', '--epoch-key', {
        required: true,
        type: 'str',
        help: 'The user\'s epoch key to attest to (in hex representation)',
    });
    parser.add_argument('-pr', '--pos-rep', {
        type: 'int',
        help: 'Score of positive reputation to give to the user',
    });
    parser.add_argument('-nr', '--neg-rep', {
        type: 'int',
        help: 'Score of negative reputation to give to the user',
    });
    parser.add_argument('-gf', '--graffiti', {
        action: 'store',
        type: 'str',
        help: 'Graffiti for the reputation given to the user (in hex representation)',
    });
    parser.add_argument('-s', '--sign-up', {
        action: 'store',
        type: 'int',
        help: 'Whether to set sign up flag to the user',
    });
    parser.add_argument('-x', '--contract', {
        required: true,
        type: 'str',
        help: 'The Unirep contract address',
    });
    parser.add_argument('-d', '--eth-privkey', {
        action: 'store',
        type: 'str',
        help: 'The attester\'s Ethereum private key',
    });
};
exports.configureSubparser = configureSubparser;
const attest = async (args) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : defaults_1.DEFAULT_ETH_PROVIDER;
    // Unirep contract
    const unirepContract = new core_1.UnirepContract(args.contract, ethProvider);
    // Connect a signer
    await unirepContract.unlock(args.eth_privkey);
    // Parse input
    const index = args.to_proof_index;
    const fromIndex = args.from_proof_index != undefined ? args.from_proof_index : 0;
    const epochKey = args.epoch_key;
    const posRep = args.pos_rep != undefined ? args.pos_rep : 0;
    const negRep = args.neg_rep != undefined ? args.neg_rep : 0;
    const graffiti = args.graffiti != undefined ? BigInt((0, crypto_1.add0x)(args.graffiti)) : BigInt(0);
    const signUp = args.sign_up != undefined ? args.sign_up : 0;
    const ethAddr = ethers_1.ethers.utils.computeAddress(args.eth_privkey);
    const attesterId = await unirepContract.attesters(ethAddr);
    const attestation = new core_1.Attestation(BigInt(attesterId.toString()), BigInt(posRep), BigInt(negRep), graffiti, BigInt(signUp));
    console.log(`Attesting to epoch key ${epochKey} with pos rep ${posRep}, neg rep ${negRep}, graffiti ${graffiti.toString(16)} and sign up flag ${signUp}`);
    // Submit attestation
    const tx = await unirepContract.submitAttestation(attestation, epochKey, index, fromIndex);
    console.log('Transaction hash:', tx === null || tx === void 0 ? void 0 : tx.hash);
};
exports.attest = attest;
