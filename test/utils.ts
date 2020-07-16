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

const genStubEPKProof = (isValid: Boolean) => {
    let firstElement;
    if(isValid) {
        firstElement = 1;
    } else {
        firstElement = 0;
    }
    return [firstElement, 2, 3, 4, 5, 6, 7, 8]
}

export {
    SimpleContractJSON,
    genEpochKey,
    genStubEPKProof,
    linkLibrary,
}