"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureSubparser = exports.deploy = void 0;
const ethers_1 = require("ethers");
const contracts_1 = require("@unirep/contracts");
const testLocal_1 = require("../config/testLocal");
const defaults_1 = require("./defaults");
const utils_1 = require("./utils");
const configureSubparser = (subparsers) => {
    const deployParser = subparsers.add_parser('deploy', { add_help: true });
    deployParser.add_argument('-d', '--deployer-privkey', {
        action: 'store',
        type: 'str',
        help: 'The deployer\'s Ethereum private key',
    });
    deployParser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${defaults_1.DEFAULT_ETH_PROVIDER}`,
    });
    deployParser.add_argument('-l', '--epoch-length', {
        action: 'store',
        type: 'int',
        help: 'The length of an epoch in seconds. Default: 30',
    });
    deployParser.add_argument('-f', '--attesting-fee', {
        action: 'store',
        type: 'str',
        help: 'The fee to make an attestation. Default: 0.01 eth (i.e., 10 * 16)',
    });
};
exports.configureSubparser = configureSubparser;
const deploy = async (args) => {
    // The deployer's Ethereum private key
    // They may either enter it as a command-line option or via the
    // standard input
    const deployerPrivkey = args.deployer_privkey;
    if (!(0, utils_1.validateEthSk)(deployerPrivkey)) {
        console.error('Error: invalid Ethereum private key');
        return;
    }
    // Max epoch key nonce
    const _numEpochKeyNoncePerEpoch = defaults_1.DEFAULT_MAX_EPOCH_KEY_NONCE;
    // Max reputation budget
    const _maxReputationBudget = testLocal_1.maxReputationBudget;
    // Epoch length
    const _epochLength = (args.epoch_length != undefined) ? args.epoch_length : defaults_1.DEFAULT_EPOCH_LENGTH;
    // Attesting fee
    const _attestingFee = (args.attesting_fee != undefined) ? ethers_1.ethers.BigNumber.from(args.attesting_fee) : defaults_1.DEFAULT_ATTESTING_FEE;
    const settings = {
        maxUsers: testLocal_1.maxUsers,
        maxAttesters: testLocal_1.maxAttesters,
        numEpochKeyNoncePerEpoch: _numEpochKeyNoncePerEpoch,
        maxReputationBudget: _maxReputationBudget,
        epochLength: _epochLength,
        attestingFee: _attestingFee
    };
    const treeDepths = {
        "userStateTreeDepth": testLocal_1.circuitUserStateTreeDepth,
        "globalStateTreeDepth": testLocal_1.circuitGlobalStateTreeDepth,
        "epochTreeDepth": testLocal_1.circuitEpochTreeDepth,
    };
    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : defaults_1.DEFAULT_ETH_PROVIDER;
    if (!(await (0, utils_1.checkDeployerProviderConnection)(deployerPrivkey, ethProvider))) {
        console.error('Error: unable to connect to the Ethereum provider at', ethProvider);
        return;
    }
    const deployer = (0, utils_1.genJsonRpcDeployer)(deployerPrivkey, ethProvider);
    debugger;
    const contract = await (0, contracts_1.deployUnirep)(deployer.signer, treeDepths, settings);
    console.log('Unirep:', contract.address);
};
exports.deploy = deploy;
