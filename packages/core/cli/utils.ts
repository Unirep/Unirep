import { ethers, providers } from 'ethers'

const getProvider = (url: string): ethers.providers.Provider => {
    const provider = url.startsWith('http')
        ? new ethers.providers.JsonRpcProvider(url)
        : new ethers.providers.WebSocketProvider(url)

    return provider
}

class JSONRPCDeployer {
    provider: ethers.providers.Provider
    signer: ethers.Signer
    options: any

    constructor(
        privateKey: string,
        provider: ethers.providers.Provider,
        options?: any
    ) {
        this.provider = provider
        this.signer = new ethers.Wallet(privateKey, provider)
        this.options = options
    }

    async deploy(abi: any, bytecode: any, ...args): Promise<ethers.Contract> {
        const factory = new ethers.ContractFactory(abi, bytecode, this.signer)
        return await factory.deploy(...args)
    }
}

const genJsonRpcDeployer = (
    privateKey: string,
    provider: ethers.providers.Provider
) => {
    return new JSONRPCDeployer(privateKey, provider)
}

const checkDeployerProviderConnection = async (
    sk: string,
    provider: ethers.providers.Provider
) => {
    const deployer = genJsonRpcDeployer(sk, provider)
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
    address: string
) => {
    const code = await provider.getCode(address)
    return code.length > 2
}

export {
    getProvider,
    checkDeployerProviderConnection,
    contractExists,
    genJsonRpcDeployer,
    validateEthAddress,
    validateEthSk,
}
