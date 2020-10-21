import { Contract, providers } from 'ethers'

import {
    validateEthAddress,
    contractExists,
} from './utils'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'

import Unirep from "../artifacts/Unirep.json"
import { genUnirepStateFromContract, genUserStateFromContract } from '../core'
import { add0x } from '../crypto/SMT'
import { formatProofForVerifierContract } from '../test/circuits/utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.addParser(
        'verifyReputationProof',
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
            required: true,
            type: 'int',
            help: 'The minimum positive score the attester given to the user',
        }
    )

    parser.addArgument(
        ['-mn', '--max-neg-rep'],
        {
            required: true,
            type: 'int',
            help: 'The maximum negative score the attester given to the user',
        }
    )

    parser.addArgument(
        ['-gp', '--graffiti-preimage'],
        {
            required: true,
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

const verifyReputationProof = async (args: any) => {

    // Unirep contract
    if (!validateEthAddress(args.contract)) {
        console.error('Error: invalid Unirep contract address')
        return
    }

    const unirepAddress = args.contract

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER

    const provider = new providers.JsonRpcProvider(ethProvider)

    if (! await contractExists(provider, unirepAddress)) {
        console.error('Error: there is no contract deployed at the specified address')
        return
    }

    const unirepContract = new Contract(
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
    const attesterId = BigInt(add0x(args.attester_id))
    const minPosRep = args.min_pos_rep
    const maxNegRep = args.max_neg_rep
    const graffitiPreImage = BigInt(add0x(args.graffiti_preimage))
    const proof = JSON.parse(args.proof)

    // Verify on-chain
    const GSTreeRoot = unirepState.genGSTree(currentEpoch).root
    const isProofValid = await unirepContract.verifyReputation(
        GSTreeRoot,
        attesterId,
        minPosRep,
        maxNegRep,
        graffitiPreImage,
        formatProofForVerifierContract(proof),
    )
    if (!isProofValid) {
        console.error('Error: invalid reputation proof')
        return
    }

    console.log(`Verify reputation proof from attester ${attesterId} with min pos rep ${minPosRep}, max neg rep ${maxNegRep} and graffiti pre-image ${args.graffiti_preimage}, succeed`)
}

export {
    verifyReputationProof,
    configureSubparser,
}