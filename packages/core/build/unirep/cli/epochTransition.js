"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureSubparser = exports.epochTransition = void 0;
const defaults_1 = require("./defaults");
const core_1 = require("../core");
const configureSubparser = (subparsers) => {
    const parser = subparsers.add_parser('epochTransition', { add_help: true });
    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${defaults_1.DEFAULT_ETH_PROVIDER}`,
    });
    parser.add_argument('-t', '--is-test', {
        action: 'store_true',
        help: 'Indicate if the provider is a testing environment',
    });
    parser.add_argument('-x', '--contract', {
        required: true,
        type: 'str',
        help: 'The Unirep contract address',
    });
    parser.add_argument('-d', '--eth-privkey', {
        action: 'store',
        type: 'str',
        help: 'The deployer\'s Ethereum private key',
    });
};
exports.configureSubparser = configureSubparser;
const epochTransition = async (args) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : defaults_1.DEFAULT_ETH_PROVIDER;
    // Unirep contract
    const unirepContract = new core_1.UnirepContract(args.contract, ethProvider);
    // Connect a signer
    await unirepContract.unlock(args.eth_privkey);
    // Fast-forward to end of epoch if in test environment
    if (args.is_test) {
        await unirepContract.fastForward();
    }
    const currentEpoch = await unirepContract.currentEpoch();
    const tx = await unirepContract.epochTransition();
    if (tx != undefined) {
        console.log('Transaction hash:', tx.hash);
        console.log('End of epoch:', currentEpoch.toString());
    }
};
exports.epochTransition = epochTransition;
