"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEthSk = exports.validateEthAddress = exports.genJsonRpcDeployer = exports.promptPwd = exports.contractExists = exports.checkDeployerProviderConnection = void 0;
const prompt_async_1 = __importDefault(require("prompt-async"));
const ethers_1 = require("ethers");
prompt_async_1.default.colors = false;
prompt_async_1.default.message = '';
class JSONRPCDeployer {
    constructor(privateKey, providerUrl, options) {
        this.provider = new ethers_1.ethers.providers.JsonRpcProvider(providerUrl);
        this.signer = new ethers_1.ethers.Wallet(privateKey, this.provider);
        this.options = options;
    }
    async deploy(abi, bytecode, ...args) {
        const factory = new ethers_1.ethers.ContractFactory(abi, bytecode, this.signer);
        return await factory.deploy(...args);
    }
}
const genJsonRpcDeployer = (privateKey, url) => {
    return new JSONRPCDeployer(privateKey, url);
};
exports.genJsonRpcDeployer = genJsonRpcDeployer;
const promptPwd = async (name) => {
    prompt_async_1.default.start();
    const input = await prompt_async_1.default.get([
        {
            name,
            hidden: true,
        }
    ]);
    return input[name];
};
exports.promptPwd = promptPwd;
const checkDeployerProviderConnection = async (sk, ethProvider) => {
    const deployer = genJsonRpcDeployer(sk, ethProvider);
    try {
        await deployer.provider.getBlockNumber();
    }
    catch (_a) {
        return false;
    }
    return true;
};
exports.checkDeployerProviderConnection = checkDeployerProviderConnection;
const validateEthSk = (sk) => {
    try {
        new ethers_1.ethers.Wallet(sk);
    }
    catch (_a) {
        return false;
    }
    return true;
};
exports.validateEthSk = validateEthSk;
const validateEthAddress = (address) => {
    return address.match(/^0x[a-fA-F0-9]{40}$/) != null;
};
exports.validateEthAddress = validateEthAddress;
const contractExists = async (provider, address) => {
    const code = await provider.getCode(address);
    return code.length > 2;
};
exports.contractExists = contractExists;
