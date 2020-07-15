import * as ethers from 'ethers'
import { link } from "ethereum-waffle"
import { SnarkBigInt, bigInt } from '../crypto/crypto'

// Copy contract json type from ethereum-waffle
interface SimpleContractJSON {
    abi: any[];
    bytecode: string;
}

const linkLibrary = (contractJson: SimpleContractJSON, libraryName: string, libraryAddress: string) => {
    let linkableContract = {
        evm: {
            bytecode: {
                object: contractJson.bytecode,
            }
        }
    }
    link(linkableContract, libraryName, libraryAddress)
    contractJson.bytecode = linkableContract.evm.bytecode.object
}

const genEpochKey = (identityNullifier: SnarkBigInt, epoch: number, nonce: number): string => {
    return ethers.utils.solidityKeccak256(["uint256", "uint256", "uint256"], [identityNullifier.toString(), epoch, nonce])
}

export {
    SimpleContractJSON,
    genEpochKey,
    linkLibrary,
}