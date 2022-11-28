export * from './config'

import { Unirep, Unirep__factory as UnirepFactory } from '../typechain'
import { ethers } from 'ethers'

/**
 * Get Unirep smart contract from a given address
 * @param address The address if the Unirep contract
 * @param signerOrProvider The signer or provider that connect to the Unirep smart contract
 * @returns The Unirep smart contract
 */
export const getUnirepContract = (
    address: string,
    signerOrProvider: ethers.Signer | ethers.providers.Provider
): Unirep => {
    return UnirepFactory.connect(address, signerOrProvider)
}
export { Unirep, UnirepFactory }
