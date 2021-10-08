import base64url from 'base64url'
import { ethers } from 'ethers'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'
import { genUnirepStateFromContract, UnirepContract } from '../core'
import { signUpProofPrefix, signUpPublicSignalsPrefix } from './prefix'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'verifyUserSignUpProof',
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
        '-ep', '--epoch',
        {
            action: 'store',
            type: 'int',
            help: 'The latest epoch user transitioned to. Default: current epoch',
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

const verifyUserSignUpProof = async (args: any) => {

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER
    const provider = new ethers.providers.JsonRpcProvider(ethProvider)

    // Unirep contract
    const unirepContract = new UnirepContract(args.contract, ethProvider)

    const startBlock = (args.start_block) ? args.start_block : DEFAULT_START_BLOCK
    const unirepState = await genUnirepStateFromContract(
        provider,
        args.contract,
        startBlock,
    )

    // Parse Inputs
    const decodedProof = base64url.decode(args.proof.slice(signUpProofPrefix.length))
    const decodedPublicSignals = base64url.decode(args.public_signals.slice(signUpPublicSignalsPrefix.length))
    const publicSignals = JSON.parse(decodedPublicSignals)
    const epoch = publicSignals[0]
    const epk = publicSignals[1]
    const GSTRoot = publicSignals[2]
    const attesterId = publicSignals[3]
    const proof = JSON.parse(decodedProof)

    // Check if Global state tree root exists
    const isGSTRootExisted = unirepState.GSTRootExists(GSTRoot, epoch)
    if(!isGSTRootExisted) {
        console.error('Error: invalid global state tree root')
        return
    }

    // Verify the proof on-chain
    const isProofValid = await unirepContract.verifyUserSignUp(
        epoch,
        epk,
        GSTRoot,
        attesterId,
        proof,
    )
    if (!isProofValid) {
        console.error('Error: invalid user sign up proof')
        return
    }

    console.log(`Epoch key of the user: ${epk}`)
    console.log(`Verify user sign up proof from attester ${attesterId} succeed`)
}

export {
    verifyUserSignUpProof,
    configureSubparser,
}