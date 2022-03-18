"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureSubparser = exports.attesterSignUp = void 0;
const ethers_1 = require("ethers");
const defaults_1 = require("./defaults");
const core_1 = require("../core");
const configureSubparser = (subparsers) => {
    const parser = subparsers.add_parser('attesterSignUp', { add_help: true });
    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${defaults_1.DEFAULT_ETH_PROVIDER}`,
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
const attesterSignUp = async (args) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : defaults_1.DEFAULT_ETH_PROVIDER;
    // Unirep contract
    const unirepContract = new core_1.UnirepContract(args.contract, ethProvider);
    // Connect a signer
    const ehtSk = await unirepContract.unlock(args.eth_privkey);
    // Submit the user sign up transaction
    const tx = await unirepContract.attesterSignUp();
    await tx.wait();
    const ethAddr = ethers_1.ethers.utils.computeAddress(ehtSk);
    const attesterId = await unirepContract.attesters(ethAddr);
    if (attesterId.toNumber() == 0) {
        console.error('Error: sign up succeeded but has no attester id!');
    }
    console.log('Transaction hash:', tx === null || tx === void 0 ? void 0 : tx.hash);
    console.log('Attester sign up with attester id:', attesterId.toNumber());
};
exports.attesterSignUp = attesterSignUp;
