import * as ethers from 'ethers'
import Keyv from "keyv"
import { deployContract, link } from "ethereum-waffle"
import { BigNumber as smtBN, SparseMerkleTreeImpl, add0x, bufToHexString, hexStrToBuf } from '../crypto/SMT'
import { SnarkBigInt, hash5, hashLeftRight } from '../crypto/crypto'
import { attestingFee, circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitNullifierTreeDepth, circuitUserStateTreeDepth, epochLength, epochTreeDepth, globalStateTreeDepth, maxEpochKeyNonce, maxUsers, nullifierTreeDepth, userStateTreeDepth} from '../config/testLocal'

import Unirep from "../artifacts/Unirep.json"
import PoseidonT3 from "../artifacts/PoseidonT3.json"
import PoseidonT6 from "../artifacts/PoseidonT6.json"
import EpochKeyValidityVerifier from "../artifacts/EpochKeyValidityVerifier.json"
import NewUserStateVerifier from "../artifacts/NewUserStateVerifier.json"
import ReputationVerifier from "../artifacts/ReputationVerifier.json"

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

const deployUnirep = async (
    deployer: ethers.Wallet,
    deployEnv: string = "contract"): Promise<ethers.Contract> => {
    let _userStateTreeDepth, _globalStateTreeDepth, _epochTreeDepth, _nullifierTreeDepth
    if (deployEnv === 'contract') {
        _userStateTreeDepth = userStateTreeDepth
        _globalStateTreeDepth = globalStateTreeDepth
        _epochTreeDepth = epochTreeDepth
        _nullifierTreeDepth = nullifierTreeDepth
    } else if (deployEnv === 'circuit') {
        _userStateTreeDepth = circuitUserStateTreeDepth
        _globalStateTreeDepth = circuitGlobalStateTreeDepth
        _epochTreeDepth = circuitEpochTreeDepth
        _nullifierTreeDepth = circuitNullifierTreeDepth
    } else {
        throw new Error('Only contract and circuit testing env are supported')
    }

    let PoseidonT3Contract, PoseidonT6Contract
    let EpochKeyValidityVerifierContract, NewUserStateVerifierContract, ReputationVerifierContract

    console.log('Deploying PoseidonT3')
    PoseidonT3Contract = (await deployContract(
        deployer,
        PoseidonT3
    ))
    console.log('Deploying PoseidonT6')
    PoseidonT6Contract = (await deployContract(
        deployer,
        PoseidonT6,
        [],
        {
            gasLimit: 9000000,
        }
    ))

    console.log('Deploying EpochKeyValidityVerifier')
    EpochKeyValidityVerifierContract = (await deployContract(
        deployer,
        EpochKeyValidityVerifier
    ))

    console.log('Deploying NewUserStateVerifier')
    NewUserStateVerifierContract = (await deployContract(
        deployer,
        NewUserStateVerifier
    ))

    console.log('Deploying ReputationVerifier')
    ReputationVerifierContract = (await deployContract(
        deployer,
        ReputationVerifier
    ))

    console.log('Deploying Unirep')
    // Link the library code if it has not been linked yet
    const notLinkedYet = Unirep.bytecode.indexOf("$") > 0
    if (notLinkedYet) {
        // Link the Unirep contract to PoseidonT3 contract
        linkLibrary(Unirep, 'contracts/Poseidon.sol:PoseidonT3', PoseidonT3Contract.address)
        // Link the Unirep contract to PoseidonT6 contract
        linkLibrary(Unirep, 'contracts/Poseidon.sol:PoseidonT6', PoseidonT6Contract.address)
    }

    const f = new ethers.ContractFactory(Unirep.abi, Unirep.bytecode, deployer)
    const c = await (f.deploy(
        {
            globalStateTreeDepth: _globalStateTreeDepth,
            userStateTreeDepth: _userStateTreeDepth,
            nullifierTreeDepth: _nullifierTreeDepth,
            epochTreeDepth: _epochTreeDepth
        },
        {
            maxUsers,
            maxEpochKeyNonce
        },
        EpochKeyValidityVerifierContract.address,
        NewUserStateVerifierContract.address,
        ReputationVerifierContract.address,
        epochLength,
        attestingFee,
        {
            gasLimit: 9000000,
        }
    ))

    // Print out deployment info if the contract is been deployed the first time
    if (notLinkedYet) {
        console.log("-----------------------------------------------------------------")
        console.log("Bytecode size of Unirep:", Math.floor(Unirep.bytecode.length / 2), "bytes")
        let receipt = await c.provider.getTransactionReceipt(c.deployTransaction.hash)
        console.log("Gas cost of deploying Unirep:", receipt.gasUsed.toString())
        console.log("-----------------------------------------------------------------")
    }

    return c
}

const genEpochKey = (identityNullifier: SnarkBigInt, epoch: number, nonce: number, _epochTreeDepth: number = epochTreeDepth): SnarkBigInt => {
    const values: any[] = [
        identityNullifier,
        epoch,
        nonce,
        BigInt(0),
        BigInt(0),
    ]
    let epochKey = hash5(values)
    // Adjust epoch key size according to epoch tree depth
    const epochKeyModed = BigInt(epochKey) % BigInt(2 ** _epochTreeDepth)
    return epochKeyModed
}

const computeAttestationHash = (attestation: any): SnarkBigInt => {
    return hash5([
        attestation['attesterId'],
        attestation['posRep'],
        attestation['negRep'],
        attestation['graffiti'],
        attestation['overwriteGraffiti'],
    ])
}

const computeNullifier = (identityNullifier: SnarkBigInt, attesterId: number, epoch: number, _nullifierTreeDepth: number = nullifierTreeDepth): SnarkBigInt => {
    let nullifier = hash5([identityNullifier, BigInt(attesterId), BigInt(epoch), BigInt(0), BigInt(0)])
    const nullifierModed = BigInt(nullifier) % BigInt(2 ** _nullifierTreeDepth)
    return nullifierModed
}

const genNoAttestationNullifierKey = (identityNullifier: SnarkBigInt, epoch: number, nonce: number, _nullifierTreeDepth: number = nullifierTreeDepth): SnarkBigInt => {
    let nullifier = hash5([identityNullifier, BigInt(epoch), BigInt(nonce), BigInt(0), BigInt(0)])
    // Adjust epoch key size according to epoch tree depth
    const nullifierModed = BigInt(nullifier) % BigInt(2 ** _nullifierTreeDepth)
    return nullifierModed
}

const genNoAttestationNullifierValue = (): string => {
    let value = hashLeftRight(BigInt(1), BigInt(0))
    return toCompleteHexString(value.toString(16), 32)
}

const toCompleteHexString = (str: string, len?: number): string => {
    str = add0x(str)
    if (len) str = ethers.utils.hexZeroPad(str, len)
    return str
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

const bufToBigInt = (buf: Buffer): SnarkBigInt => {
    return BigInt(bufToHexString(buf))
}

const bigIntToBuf = (bn: SnarkBigInt): Buffer => {
    return hexStrToBuf(toCompleteHexString(bn.toString(16), 32))
}

const SMT_ZERO_LEAF = bigIntToBuf(hashLeftRight(BigInt(0), BigInt(0)))
const SMT_ONE_LEAF = bigIntToBuf(hashLeftRight(BigInt(1), BigInt(0)))

const getNewSMT = async (treeDepth: number, defaultLeafHash?: BigInt, rootHash?: Buffer): Promise<SparseMerkleTreeImpl> => {
    const keyv = new Keyv();
    return SparseMerkleTreeImpl.create(
        keyv,
        // The current SparseMerkleTreeImpl has different tree depth implementation.
        // It has tree depth of 1 with a single root node while in this case tree depth is 0 in OneTimeSparseMerkleTree contract.
        // So we increment the tree depth passed into SparseMerkleTreeImpl by 1.
        treeDepth + 1,
        defaultLeafHash,
        rootHash
    )
}

const genNewEpochTree = async (deployEnv: string = "contract"): Promise<SparseMerkleTreeImpl> => {
    let _epochTreeDepth
    if (deployEnv === 'contract') {
        _epochTreeDepth = epochTreeDepth
    } else if (deployEnv === 'circuit') {
        _epochTreeDepth = circuitEpochTreeDepth
    } else {
        throw new Error('Only contract and circuit testing env are supported')
    }
    return getNewSMT(_epochTreeDepth)
}

const genNewNullifierTree = async (deployEnv: string = "contract"): Promise<SparseMerkleTreeImpl> => {
    let _nullifierTreeDepth
    if (deployEnv === 'contract') {
        _nullifierTreeDepth = nullifierTreeDepth
    } else if (deployEnv === 'circuit') {
        _nullifierTreeDepth = circuitNullifierTreeDepth
    } else {
        throw new Error('Only contract and circuit testing env are supported')
    }
    const nullifierTree = await getNewSMT(_nullifierTreeDepth)
    // Reserve leaf 0
    const result = await nullifierTree.update(new smtBN(0), SMT_ONE_LEAF, true)
    if (result != true) throw new Error('Reserve nullifier tree leaf 0 failed')
    return nullifierTree
}

const genNewUserStateTree = async (deployEnv: string = "contract"): Promise<SparseMerkleTreeImpl> => {
    let _userStateTreeDepth
    if (deployEnv === 'contract') {
        _userStateTreeDepth = userStateTreeDepth
    } else if (deployEnv === 'circuit') {
        _userStateTreeDepth = circuitUserStateTreeDepth
    } else {
        throw new Error('Only contract and circuit testing env are supported')
    }

    const defaultUserStateLeaf = hash5([BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)])
    return getNewSMT(_userStateTreeDepth, defaultUserStateLeaf)
}

export {
    SMT_ONE_LEAF,
    SMT_ZERO_LEAF,
    SimpleContractJSON,
    bigIntToBuf,
    bufToBigInt,
    deployUnirep,
    computeAttestationHash,
    computeNullifier,
    genEpochKey,
    genNoAttestationNullifierKey,
    genNoAttestationNullifierValue,
    genStubEPKProof,
    genNewEpochTree,
    genNewNullifierTree,
    genNewUserStateTree,
    getNewSMT,
    linkLibrary,
    smtBN,
    toCompleteHexString,
}