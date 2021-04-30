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
import { reputationProofFromAttesterPrefix } from './prefix'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.addParser(
        'verifyReputationProofFromAttester',
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
        ['-ep', '--epoch'],
        {
            action: 'store',
            type: 'int',
            help: 'The latest epoch user transitioned to. Default: current epoch',
        }
    )

    parser.addArgument(
        ['-a', '--attester-id'],
        {
            required: true,
            type: 'string',
            help: 'The attester id (in hex representation)',
        }
    )
    
    parser.addArgument(
        ['-mp', '--min-pos-rep'],
        {
            type: 'int',
            help: 'The minimum positive score the attester given to the user',
        }
    )

    parser.addArgument(
        ['-mn', '--max-neg-rep'],
        {
            type: 'int',
            help: 'The maximum negative score the attester given to the user',
        }
    )

    parser.addArgument(
        ['-md', '--min-rep-diff'],
        {
            type: 'int',
            help: 'The difference between positive and negative scores the attester given to the user',
        }
    )

    parser.addArgument(
        ['-gp', '--graffiti-preimage'],
        {
            type: 'string',
            help: 'The pre-image of the graffiti for the reputation the attester given to the user (in hex representation)',
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

const verifyReputationProofFromAttester = async (args: any) => {

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
    const unirepState = await genUnirepStateFromContract(
        provider,
        unirepAddress,
        startBlock,
    )

    const currentEpoch = unirepState.currentEpoch
    const epoch = args.epoch ? Number(args.epoch) : currentEpoch
    const attesterId = BigInt(add0x(args.attester_id))
    const provePosRep = args.min_pos_rep != null ? BigInt(1) : BigInt(0)
    const proveNegRep = args.max_neg_rep != null ? BigInt(1) : BigInt(0)
    const proveRepDiff = args.min_rep_diff != null ? BigInt(1) : BigInt(0)
    const proveGraffiti = args.graffiti_preimage != null ? BigInt(1) : BigInt(0)
    const minRepDiff = args.min_rep_diff != null ? BigInt(args.min_rep_diff) : BigInt(0)
    const minPosRep = args.min_pos_rep != null ? BigInt(args.min_pos_rep) : BigInt(0)
    const maxNegRep = args.max_neg_rep != null ? BigInt(args.max_neg_rep) : BigInt(0)
    const graffitiPreImage = args.graffiti_preimage != null ? BigInt(add0x(args.graffiti_preimage)) : BigInt(0)
    const decodedProof = base64url.decode(args.proof.slice(reputationProofFromAttesterPrefix.length))
    const proof = JSON.parse(decodedProof)

    // Verify on-chain
    const GSTreeRoot = unirepState.genGSTree(epoch).root
    const nullifierTree = await unirepState.genNullifierTree()
    const nullifierTreeRoot = nullifierTree.getRootHash()
    const publicInput = [epoch,
        GSTreeRoot,
        nullifierTreeRoot,
        attesterId,
        provePosRep,
        proveNegRep,
        proveRepDiff,
        proveGraffiti,
        minRepDiff,
        minPosRep,
        maxNegRep,
        graffitiPreImage]
    const isProofValid = await unirepContract.verifyReputationFromAttester(
        publicInput,
        proof
    )
    if (!isProofValid) {
        console.error('Error: invalid reputation proof')
        return
    }

    console.log(`Verify reputation proof from attester ${attesterId} with min pos rep ${minPosRep}, max neg rep ${maxNegRep} and graffiti pre-image ${args.graffiti_preimage}, succeed`)
}

export {
    verifyReputationProofFromAttester,
    configureSubparser,
}