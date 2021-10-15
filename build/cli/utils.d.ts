import { ethers } from 'ethers';
declare class JSONRPCDeployer {
    provider: ethers.providers.Provider;
    signer: ethers.Signer;
    options: any;
    constructor(privateKey: string, providerUrl: string, options?: any);
    deploy(abi: any, bytecode: any, ...args: any[]): Promise<ethers.Contract>;
}
declare const genJsonRpcDeployer: (privateKey: string, url: string) => JSONRPCDeployer;
declare const promptPwd: (name: string) => Promise<any>;
declare const checkDeployerProviderConnection: (sk: string, ethProvider: string) => Promise<boolean>;
declare const validateEthSk: (sk: string) => boolean;
declare const validateEthAddress: (address: string) => boolean;
declare const contractExists: (provider: ethers.providers.Provider, address: string) => Promise<boolean>;
export { checkDeployerProviderConnection, contractExists, promptPwd, genJsonRpcDeployer, validateEthAddress, validateEthSk, };
