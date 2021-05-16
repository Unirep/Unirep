import base64url from 'base64url'
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { genIdentityCommitment, unSerialiseIdentity } from 'libsemaphore'
import { stringifyBigInts } from 'maci-crypto'

import {
    validateEthAddress,
    contractExists,
} from './utils'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'

import { genEpochKey } from '../core/utils'
import { genUserStateFromContract } from '../core'
import { formatProofForVerifierContract, genVerifyEpochKeyProofAndPublicSignals, verifyEPKProof } from '../circuits/utils'

import Unirep from "../artifacts/contracts/Unirep.sol/Unirep.json"
import { epkProofPrefix, identityPrefix } from './prefix'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.addParser(
        'genEpochKeyAndProof',
        { addHelp: true },
    )

    parser.addArgument(
        ['-e', '--eth-provider'],
        {
            action: 'store',
            type: 'string',
            help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
        }
    )

    parser.addArgument(
        ['-id', '--identity'],
        {
            required: true,
            type: 'string',
            help: 'The (serialized) user\'s identity',
        }
    )

    parser.addArgument(
        ['-n', '--epoch-key-nonce'],
        {
            required: true,
            type: 'int',
            help: 'The epoch key nonce',
        }
    )

    parser.addArgument(
        ['-b', '--start-block'],
        {
            action: 'store',
            type: 'int',
            help: 'The block the Unirep contract is deployed. Default: 0',
        }
    )

    parser.addArgument(
        ['-x', '--contract'],
        {
            required: true,
            type: 'string',
            help: 'The Unirep contract address',
        }
    )
}

const genEpochKeyAndProof = async (args: any) => {

    // Unirep contract
    if (!validateEthAddress(args.contract)) {
        console.error('Error: invalid Unirep contract address')
        return
    }

    const unirepAddress = args.contract

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER

    const provider = new hardhatEthers.providers.JsonRpcProvider(ethProvider)

    if (! await contractExists(provider, unirepAddress)) {
        console.error('Error: there is no contract deployed at the specified address')
        return
    }

    const unirepContract = new ethers.Contract(
        unirepAddress,
        Unirep.abi,
        provider,
    )
    const startBlock = (args.start_block) ? args.start_block : DEFAULT_START_BLOCK

    // Validate epoch key nonce
    const epkNonce = args.epoch_key_nonce
    const numEpochKeyNoncePerEpoch = await unirepContract.numEpochKeyNoncePerEpoch()
    if (epkNonce >= numEpochKeyNoncePerEpoch) {
        console.error('Error: epoch key nonce must be less than max epoch key nonce')
        return
    }

    // Gen epoch key
    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = unSerialiseIdentity(decodedIdentity)
    const commitment = genIdentityCommitment(id)
    const currentEpoch = (await unirepContract.currentEpoch()).toNumber()
    const treeDepths = await unirepContract.treeDepths()
    const epochTreeDepth = treeDepths.epochTreeDepth
    const epk = genEpochKey(id.identityNullifier, currentEpoch, epkNonce, epochTreeDepth).toString(16)

    // Gen epoch key proof
    const userState = await genUserStateFromContract(
        provider,
        unirepAddress,
        startBlock,
        id,
        commitment,
    )
    const circuitInputs = await userState.genVerifyEpochKeyCircuitInputs(epkNonce)
    const results = await genVerifyEpochKeyProofAndPublicSignals(stringifyBigInts(circuitInputs))

    // TODO: Not sure if this validation is necessary
    const isValid = await verifyEPKProof(results['proof'], results['publicSignals'])
    if(!isValid) {
        console.error('Error: epoch key proof generated is not valid!')
        return
    }

    const formattedProof = formatProofForVerifierContract(results["proof"])
    const encodedProof = base64url.encode(JSON.stringify(formattedProof))
    console.log(`Epoch key of epoch ${currentEpoch} and nonce ${epkNonce}: ${epk}`)
    console.log(epkProofPrefix + encodedProof)
}

export {
    genEpochKeyAndProof,
    configureSubparser,
}