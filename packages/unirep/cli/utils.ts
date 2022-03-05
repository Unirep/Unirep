import { ethers } from 'ethers'

class JSONRPCDeployer {

    provider: ethers.providers.Provider
    signer: ethers.Signer
    options: any

    constructor(privateKey: string, providerUrl: string, options?: any) {
        this.provider = new ethers.providers.JsonRpcProvider(providerUrl)
        this.signer = new ethers.Wallet(privateKey, this.provider)
        this.options = options
    }

    async deploy(abi: any, bytecode: any, ...args): Promise<ethers.Contract> {
        const factory = new ethers.ContractFactory(abi, bytecode, this.signer)
        return await factory.deploy(...args)
    }
}

const genJsonRpcDeployer = (
    privateKey: string,
    url: string,
) => {

    return new JSONRPCDeployer(
        privateKey,
        url,
    )
}

const checkDeployerProviderConnection = async (
    sk: string,
    ethProvider: string,
) => {

    const deployer = genJsonRpcDeployer(sk, ethProvider)
    try {
        await deployer.provider.getBlockNumber()
    } catch {
        return false
    }

    return true
}

const validateEthSk = (sk: string): boolean => {
    try {
        new ethers.Wallet(sk)
    } catch {
        return false
    }
    return true
}

const validateEthAddress = (address: string) => {
    return address.match(/^0x[a-fA-F0-9]{40}$/) != null
}

const contractExists = async (
    provider: ethers.providers.Provider,
    address: string,
) => {
    const code = await provider.getCode(address)
    return code.length > 2
}

export {
    checkDeployerProviderConnection,
    contractExists,
    genJsonRpcDeployer,
    validateEthAddress,
    validateEthSk,
}