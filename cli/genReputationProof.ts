import { providers } from 'ethers'
import { genIdentityCommitment, unSerialiseIdentity } from 'libsemaphore'

import {
    validateEthAddress,
    contractExists,
} from './utils'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'

import { genUserStateFromContract } from '../core'
import { genVerifyReputationProofAndPublicSignals, verifyProveReputationProof } from '../test/circuits/utils'
import { stringifyBigInts } from 'maci-crypto'
import { add0x } from '../crypto/SMT'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.addParser(
        'genReputationProof',
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

const genReputationProof = async (args: any) => {

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

    const startBlock = (args.start_block) ? args.start_block : DEFAULT_START_BLOCK

    const id = unSerialiseIdentity(args.identity)
    const commitment = genIdentityCommitment(id)

    // Gen reputation proof
    const userState = await genUserStateFromContract(
        provider,
        unirepAddress,
        startBlock,
        id,
        commitment,
    )
    const attesterId = BigInt(add0x(args.attester_id))
    const minPosRep = args.min_pos_rep
    const maxNegRep = args.max_neg_rep
    const graffitiPreImage = BigInt(add0x(args.graffiti_preimage))
    const circuitInputs = await userState.genProveReputationCircuitInputs(attesterId, minPosRep, maxNegRep, graffitiPreImage)
    const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
    console.log("ok")

    // TODO: Not sure if this validation is necessary
    const isValid = await verifyProveReputationProof(results['proof'], results['publicSignals'])
    if(!isValid) {
        console.error('Error: reputation proof generated is not valid!')
    }
    
    const proof = results["proof"]
    console.log(`Proof of reputation from attester ${attesterId}: ${JSON.stringify(JSON.stringify(proof))}`)  // stringify twice to escape double quote
}

export {
    genReputationProof,
    configureSubparser,
}