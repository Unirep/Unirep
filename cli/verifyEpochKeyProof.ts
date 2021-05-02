import base64url from 'base64url'
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'

import {
    validateEthAddress,
    contractExists,
} from './utils'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'

import { genUnirepStateFromContract } from '../core'
import { add0x } from '../crypto/SMT'

import Unirep from "../artifacts/contracts/Unirep.sol/Unirep.json"
import { epkProofPrefix } from './prefix'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.addParser(
        'verifyEpochKeyProof',
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
        ['-epk', '--epoch-key'],
        {
            required: true,
            type: 'string',
            help: 'The user\'s epoch key (in hex representation)',
        }
    )

    parser.addArgument(
        ['-pf', '--proof'],
        {
            required: true,
            type: 'string',
            help: 'The snark proof of the user\'s epoch key ',
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

const verifyEpochKeyProof = async (args: any) => {

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
    
    const startBlock = (args.start_block) ? args.start_block : DEFAULT_START_BLOCK
    const unirepState = await genUnirepStateFromContract(
        provider,
        unirepAddress,
        startBlock,
    )

    const currentEpoch = unirepState.currentEpoch
    const GSTRoot = unirepState.genGSTree(currentEpoch).root
    const epk = BigInt(add0x(args.epoch_key))
    const decodedProof = base64url.decode(args.proof.slice(epkProofPrefix.length))
    const proof = JSON.parse(decodedProof)
    const publicInput = [
        GSTRoot,
        currentEpoch,
        epk,
    ]
    
    const unirepContract = new ethers.Contract(
        unirepAddress,
        Unirep.abi,
        provider,
    )
    const isProofValid = await unirepContract.verifyEpochKeyValidity(
        publicInput,
        proof,
    )
    if (!isProofValid) {
        console.error('Error: invalid epoch key proof')
        return
    }
    console.log(`Verify epoch key proof with epoch key ${args.epoch_key} succeed`)
}

export {
    verifyEpochKeyProof,
    configureSubparser,
}