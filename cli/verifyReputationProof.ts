import base64url from 'base64url'
import { ethers } from 'ethers'
import { add0x } from '@unirep/crypto'
import { getUnirepContract } from '@unirep/contracts'

import { validateEthAddress, contractExists } from './utils'
import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'
import { genUnirepStateFromContract } from '../core'
import { reputationProofPrefix, reputationNullifierPrefix } from './prefix'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'verifyReputationProof',
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
        '-a', '--attester-id',
        {
            required: true,
            type: 'str',
            help: 'The attester id (in hex representation)',
        }
    )
    
    parser.add_argument(
        '-r', '--reputation-nullifier',
        {
            type: 'int',
            help: 'The number of reputation nullifiers to prove',
        }
    )
    
    parser.add_argument(
        '-mr', '--min-rep',
        {
            type: 'int',
            help: 'The minimum positive score minus negative score the attester given to the user',
        }
    )


    parser.add_argument(
        '-gp', '--graffiti-preimage',
        {
            type: 'str',
            help: 'The pre-image of the graffiti for the reputation the attester given to the user (in hex representation)',
        }
    )

    parser.add_argument(
        '-epk', '--epoch-key',
        {
            required: true,
            type: 'str',
            help: 'The user\'s epoch key (in hex representation)',
        }
    )

    parser.add_argument(
        '-n', '--nullifiers',
        {
            required: true,
            type: 'str',
            help: 'The reputation nullifiers of the proof ',
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

const verifyReputationProof = async (args: any) => {

    // Unirep contract
    if (!validateEthAddress(args.contract)) {
        console.error('Error: invalid Unirep contract address')
        return
    }

    const unirepAddress = args.contract

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER

    const provider = new ethers.providers.JsonRpcProvider(ethProvider)

    if (! await contractExists(provider, unirepAddress)) {
        console.error('Error: there is no contract deployed at the specified address')
        return
    }

    const unirepContract = await getUnirepContract(unirepAddress, provider)

    const startBlock = (args.start_block) ? args.start_block : DEFAULT_START_BLOCK
    const unirepState = await genUnirepStateFromContract(
        provider,
        unirepAddress,
        startBlock,
    )

    const currentEpoch = unirepState.currentEpoch
    const epoch = args.epoch ? Number(args.epoch) : currentEpoch
    const attesterId = BigInt(add0x(args.attester_id))
    const epk = BigInt(add0x(args.epoch_key))
    const proveGraffiti = args.graffiti_preimage != null ? BigInt(1) : BigInt(0)
    const minRep = args.min_rep != null ? BigInt(args.min_rep) : BigInt(0)
    const repNullifiersAmount = args.reputaiton_nullifier != null ? args.reputaiton_nullifier : 0
    const graffitiPreImage = args.graffiti_preimage != null ? BigInt(add0x(args.graffiti_preimage)) : BigInt(0)
    const decodedProof = base64url.decode(args.proof.slice(reputationProofPrefix.length))
    const decodedNullifiers = base64url.decode(args.nullifiers.slice(reputationNullifierPrefix.length))
    const outputNullifiers = JSON.parse(decodedNullifiers)
    const proof = JSON.parse(decodedProof)

    // Verify on-chain
    const GSTreeRoot = unirepState.genGSTree(epoch).root

    const isProofValid = await unirepContract.verifyReputation(
        outputNullifiers,
        epoch,
        epk,
        GSTreeRoot,
        attesterId,
        repNullifiersAmount,
        minRep,
        proveGraffiti,
        graffitiPreImage,
        proof,
    )
    if (!isProofValid) {
        console.error('Error: invalid reputation proof')
        return
    }

    console.log(`Verify reputation proof from attester ${attesterId} with min rep ${minRep}, reputation nullifiers amount ${repNullifiersAmount} and graffiti pre-image ${args.graffiti_preimage}, succeed`)
}

export {
    verifyReputationProof,
    configureSubparser,
}