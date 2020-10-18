import prompt from 'prompt-async'
import { Contract, ContractFactory, Signer, Wallet, providers } from 'ethers'

prompt.colors = false
prompt.message = ''

class JSONRPCDeployer {

    provider: providers.Provider
    signer: Signer
    options: any

    constructor(privateKey: string, providerUrl: string, options?: any) {
        this.provider = new providers.JsonRpcProvider(providerUrl)
        this.signer = new Wallet(privateKey, this.provider)
        this.options = options
    }

    async deploy(abi: any, bytecode: any, ...args): Promise<Contract> {
        const factory = new ContractFactory(abi, bytecode, this.signer)
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

const promptPwd = async (name: string) => {
    prompt.start()
    const input = await prompt.get([
        {
            name,
            hidden: true,
        }
    ])

    return input[name]
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
        new Wallet(sk)
    } catch {
        return false
    }
    return true
}

const validateEthAddress = (address: string) => {
    return address.match(/^0x[a-fA-F0-9]{40}$/) != null
}

const contractExists = async (
    provider: providers.Provider,
    address: string,
) => {
    const code = await provider.getCode(address)
    return code.length > 2
}

export {
    checkDeployerProviderConnection,
    contractExists,
    promptPwd,
    genJsonRpcDeployer,
    validateEthAddress,
    validateEthSk,
}