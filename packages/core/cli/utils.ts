import { ethers, providers } from 'ethers'
import { Unirep, abi } from '@unirep/contracts'
import { DB, SQLiteConnector } from 'anondb/node'
import { schema } from '../src/schema'
import { UserState, Synchronizer } from '../src'
import { ZkIdentity } from '@unirep/crypto'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

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

/**
 * Retrieves and parses on-chain Unirep contract data to create an off-chain
 * representation as a UnirepState object.
 * @param provider An Ethereum provider
 * @param address The address of the Unirep contract
 * @param _db An optional DB object
 */
const genUnirepState = async (
    provider: ethers.providers.Provider,
    address: string,
    _db?: DB
) => {
    const unirepContract = (new ethers.Contract(address, abi, provider)) as Unirep
    let synchronizer: Synchronizer
    let db: DB = _db ?? (await SQLiteConnector.create(schema, ':memory:'))
    synchronizer = new Synchronizer(db, defaultProver, unirepContract)
    await synchronizer.start()
    await synchronizer.waitForSync()
    return synchronizer
}

/**
 * This function works mostly the same as genUnirepState,
 * except that it also updates the user's state during events processing.
 * @param provider An Ethereum provider
 * @param address The address of the Unirep contract
 * @param userIdentity The semaphore identity of the user
 * @param _db An optional DB object
 */
const genUserState = async (
    provider: ethers.providers.Provider,
    address: string,
    userIdentity: ZkIdentity,
    _db?: DB
) => {
    const unirepContract = (new ethers.Contract(address, abi, provider)) as Unirep
    let db: DB = _db ?? (await SQLiteConnector.create(schema, ':memory:'))
    const userState = new UserState(
        db,
        defaultProver,
        unirepContract,
        userIdentity
    )
    await userState.start()
    await userState.waitForSync()
    return userState
}

export {
    getProvider,
    checkDeployerProviderConnection,
    contractExists,
    genJsonRpcDeployer,
    validateEthAddress,
    validateEthSk,
    genUserState,
    genUnirepState,
}
