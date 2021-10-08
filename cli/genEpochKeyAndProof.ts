import base64url from 'base64url'
import { ethers } from 'ethers'
import { genIdentityCommitment, unSerialiseIdentity } from '@unirep/crypto'
import { formatProofForVerifierContract, verifyProof } from '@unirep/circuits'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'
import { genUserStateFromContract, genEpochKey, UnirepContract } from '../core'
import { epkProofPrefix, epkPublicSignalsPrefix, identityPrefix } from './prefix'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'genEpochKeyAndProof',
        { add_help: true },
    )

    parser.add_argument(
        '-e', '--eth-provider',
        {
            action: 'store',
            type: 'str',
            help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
        }
    )

    parser.add_argument(
        '-id', '--identity',
        {
            required: true,
            type: 'str',
            help: 'The (serialized) user\'s identity',
        }
    )

    parser.add_argument(
        '-n', '--epoch-key-nonce',
        {
            required: true,
            type: 'int',
            help: 'The epoch key nonce',
        }
    )

    parser.add_argument(
        '-b', '--start-block',
        {
            action: 'store',
            type: 'int',
            help: 'The block the Unirep contract is deployed. Default: 0',
        }
    )

    parser.add_argument(
        '-x', '--contract',
        {
            required: true,
            type: 'str',
            help: 'The Unirep contract address',
        }
    )
}

const genEpochKeyAndProof = async (args: any) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER
    const provider = new ethers.providers.JsonRpcProvider(ethProvider)

    // Unirep contract
    const unirepContract = new UnirepContract(args.contract, ethProvider)
    
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
    const currentEpoch = await unirepContract.currentEpoch()
    const treeDepths = await unirepContract.treeDepths()
    const epochTreeDepth = treeDepths.epochTreeDepth
    const epk = genEpochKey(id.identityNullifier, currentEpoch, epkNonce, epochTreeDepth).toString()

    // Gen epoch key proof
    const userState = await genUserStateFromContract(
        provider,
        args.contract,
        startBlock,
        id,
        commitment,
    )
    console.log(userState.toJSON(4))
    const results = await userState.genVerifyEpochKeyProof(epkNonce)

    // TODO: Not sure if this validation is necessary
    const isValid = await verifyProof('verifyEpochKey', results.proof, results.publicSignals)
    if(!isValid) {
        console.error('Error: epoch key proof generated is not valid!')
        return
    }

    const formattedProof = formatProofForVerifierContract(results.proof)
    const encodedProof = base64url.encode(JSON.stringify(formattedProof))
    const encodedPublicSignals = base64url.encode(JSON.stringify(results.publicSignals))
    console.log(`Epoch key of epoch ${currentEpoch} and nonce ${epkNonce}: ${epk}`)
    console.log(epkProofPrefix + encodedProof)
    console.log(epkPublicSignalsPrefix + encodedPublicSignals)
    process.exit(0)
}

export {
    genEpochKeyAndProof,
    configureSubparser,
}