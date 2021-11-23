import base64url from 'base64url'
import { ethers } from 'ethers'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { genUnirepStateFromContract, UnirepContract } from '../core'
import { epkProofPrefix, epkPublicSignalsPrefix } from './prefix'


const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'verifyEpochKeyProof',
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
        '-p', '--public-signals',
        {
            required: true,
            type: 'str',
            help: 'The snark public signals of the user\'s epoch key ',
        }
    )

    parser.add_argument(
        '-pf', '--proof',
        {
            required: true,
            type: 'str',
            help: 'The snark proof of the user\'s epoch key ',
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

const verifyEpochKeyProof = async (args: any) => {
    
    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER
    const provider = new ethers.providers.JsonRpcProvider(ethProvider)

    // Unirep contract
    const unirepContract = new UnirepContract(args.contract, ethProvider)
    
    const unirepState = await genUnirepStateFromContract(
        provider,
        args.contract,
    )
    
    const decodedProof = base64url.decode(args.proof.slice(epkProofPrefix.length))
    const decodedPublicSignals = base64url.decode(args.public_signals.slice(epkPublicSignalsPrefix.length))
    const proof = JSON.parse(decodedProof)
    const publicSignals = JSON.parse(decodedPublicSignals)
    const currentEpoch = unirepState.currentEpoch
    const epk = publicSignals[2]
    const inputEpoch = publicSignals[1]
    const GSTRoot = publicSignals[0]
    console.log(`Verifying epoch key ${epk} with GSTRoot ${GSTRoot} in epoch ${inputEpoch}`)
    if(inputEpoch != currentEpoch) {
        console.log(`Warning: the epoch key is expired. Epoch key is in epoch ${inputEpoch}, but the current epoch is ${currentEpoch}`)
    }

    // Check if Global state tree root exists
    const isGSTRootExisted = unirepState.GSTRootExists(GSTRoot, inputEpoch)
    if(!isGSTRootExisted) {
        console.error('Error: invalid global state tree root')
        return
    }
    
    // Verify the proof on-chain
    const isProofValid = await unirepContract.verifyEpochKeyValidity(
        GSTRoot,
        inputEpoch,
        epk,
        proof,
    )
    if (!isProofValid) {
        console.error('Error: invalid epoch key proof')
        return
    }
    console.log(`Verify epoch key proof with epoch key ${epk} succeed`)
}

export {
    verifyEpochKeyProof,
    configureSubparser,
}