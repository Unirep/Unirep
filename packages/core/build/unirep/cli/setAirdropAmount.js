"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureSubparser = exports.setAirdropAmount = void 0;
const defaults_1 = require("./defaults");
const core_1 = require("../core");
const configureSubparser = (subparsers) => {
    const parser = subparsers.add_parser('setAirdropAmount', { add_help: true });
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
    parser.add_argument('-a', '--airdrop', {
        required: true,
        type: 'int',
        help: 'The amount of airdrop positive reputation given by the attester'
    });
    parser.add_argument('-d', '--eth-privkey', {
        action: 'store',
        type: 'str',
        help: 'The attester\'s Ethereum private key',
    });
};
exports.configureSubparser = configureSubparser;
const setAirdropAmount = async (args) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : defaults_1.DEFAULT_ETH_PROVIDER;
    // Unirep contract
    const unirepContract = new core_1.UnirepContract(args.contract, ethProvider);
    // Connect a signer
    await unirepContract.unlock(args.eth_privkey);
    // Parse input
    const airdropPosRep = args.airdrop;
    const attesterId = await unirepContract.getAttesterId();
    console.log(`Attester ${attesterId} sets its airdrop amount to ${airdropPosRep}`);
    // Submit attestation
    const tx = await unirepContract.setAirdropAmount(airdropPosRep);
    if (tx != undefined)
        console.log('Transaction hash:', tx === null || tx === void 0 ? void 0 : tx.hash);
};
exports.setAirdropAmount = setAirdropAmount;
