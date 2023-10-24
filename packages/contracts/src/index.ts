import { Unirep, Unirep__factory as UnirepFactory } from '../typechain'
import { ethers } from 'ethers'

/**
 * Get Unirep smart contract from a given address
 * @param address The address if the Unirep contract
 * @param signerOrProvider The signer or provider that will connect to the Unirep smart contract
 * @returns The Unirep smart contract
 */
export const getUnirepContract = (
    address: string,
    signerOrProvider: ethers.Signer | ethers.Provider
): Unirep => {
    return UnirepFactory.connect(address, signerOrProvider)
}
export { Unirep, UnirepFactory }

/**
 * Generate attester sign up signature
 * @param unirepAddress The address of UniRep smart contract
 * @param attester The address of the attester
 * @param epochLength Epoch length specified by the attester
 * @param chainId The current chain id of the UniRep smart contract
 * @returns An sign up signature for the attester
 */
export const genSignature = async (
    unirepAddress: string,
    attester: ethers.Signer | ethers.Wallet,
    epochLength: number,
    chainId: bigint | number
): Promise<string> => {
    const attesterAddress = await attester.getAddress()
    const message = ethers.solidityPackedKeccak256(
        ['address', 'address', 'uint256', 'uint256'],
        [unirepAddress, attesterAddress, epochLength, chainId]
    )
    return attester.signMessage(ethers.getBytes(message))
}
