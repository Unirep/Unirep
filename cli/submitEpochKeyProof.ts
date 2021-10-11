import base64url from 'base64url'
import { ethers } from 'ethers'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'
import { genUnirepStateFromContract, UnirepContract } from '../core'
import { epkProofPrefix, epkPublicSignalsPrefix } from './prefix'


const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'submitEpochKeyProof',
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

    const privkeyGroup = parser.add_mutually_exclusive_group({ required: true })

    privkeyGroup.add_argument(
        '-dp', '--prompt-for-eth-privkey',
        {
            action: 'store_true',
            help: 'Whether to prompt for the user\'s Ethereum private key and ignore -d / --eth-privkey',
        }
    )

    privkeyGroup.add_argument(
        '-d', '--eth-privkey',
        {
            action: 'store',
            type: 'str',
            help: 'The deployer\'s Ethereum private key',
        }
    )
}

const submitEpochKeyProof = async (args: any) => {
    
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
    
    const decodedProof = base64url.decode(args.proof.slice(epkProofPrefix.length))
    const decodedPublicSignals = base64url.decode(args.public_signals.slice(epkPublicSignalsPrefix.length))
    const proof = JSON.parse(decodedProof)
    const publicSignals = JSON.parse(decodedPublicSignals)
    const currentEpoch = unirepState.currentEpoch
    const epk = publicSignals[2]
    const inputEpoch = publicSignals[1]
    const GSTRoot = publicSignals[0]
    const epkProofData = publicSignals.concat([proof])
    console.log(`Submit epoch key ${epk} with GSTRoot ${GSTRoot} in epoch ${inputEpoch}`)
    if(inputEpoch != currentEpoch) {
        console.log(`Warning: the epoch key is expired. Epoch key is in epoch ${inputEpoch}, but the current epoch is ${currentEpoch}`)
    }

    // Connect a signer
    await unirepContract.unlock(args.eth_privkey)

    // Submit epoch key proof
    const tx = await unirepContract.submitEpochKeyProof(epkProofData)
    const proofIndex = await unirepContract.getEpochKeyProofIndex(epkProofData)
    if(tx != undefined){
        console.log('Transaction hash:', tx?.hash)
        console.log('Proof index: ', proofIndex.toNumber())
    }
}

export {
    submitEpochKeyProof,
    configureSubparser,
}