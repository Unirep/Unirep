import base64url from 'base64url'
import { ethers } from 'ethers'
import { genIdentityCommitment, unSerialiseIdentity, add0x } from '@unirep/crypto'
import { formatProofForVerifierContract, verifyProof } from '@unirep/circuits'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'
import { genUserStateFromContract } from '../core'
import { identityPrefix, reputationPublicSignalsPrefix, reputationProofPrefix } from './prefix'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'genReputationProof',
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

const genReputationProof = async (args: any) => {

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER
    const provider = new ethers.providers.JsonRpcProvider(ethProvider)
    
    const startBlock = (args.start_block) ? args.start_block : DEFAULT_START_BLOCK

    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = unSerialiseIdentity(decodedIdentity)
    const commitment = genIdentityCommitment(id)

    // Gen reputation proof
    const userState = await genUserStateFromContract(
        provider,
        args.contract,
        startBlock,
        id,
        commitment,
    )
    const attesterId = BigInt(add0x(args.attester_id))
    const epkNonce = args.epoch_key_nonce
    // Proving content
    const proveGraffiti = args.graffiti_preimage != null ? BigInt(1) : BigInt(0)
    const minRep = args.min_rep != null ? BigInt(args.min_rep) : BigInt(0)
    const repNullifiersAmount = args.reputaiton_nullifier != null ? args.reputaiton_nullifier : 0
    const graffitiPreImage = args.graffiti_preimage != null ? BigInt(add0x(args.graffiti_preimage)) : BigInt(0)
    const results = await userState.genProveReputationProof(attesterId, repNullifiersAmount, epkNonce, minRep, proveGraffiti, graffitiPreImage)

    // TODO: Not sure if this validation is necessary
    const isValid = await verifyProof('proveReputation',results.proof, results.publicSignals)
    if(!isValid) {
        console.error('Error: reputation proof generated is not valid!')
        return
    }
    
    const formattedProof = formatProofForVerifierContract(results.proof)
    const encodedProof = base64url.encode(JSON.stringify(formattedProof))
    const encodedPublicSignals = base64url.encode(JSON.stringify(results.publicSignals))
    console.log(`Proof of reputation from attester ${results.attesterId}:`)
    console.log(`Epoch key of the user: ${BigInt(results.epochKey).toString()}`)
    console.log(reputationProofPrefix + encodedProof)
    console.log(reputationPublicSignalsPrefix + encodedPublicSignals)
    process.exit(0)
}

export {
    genReputationProof,
    configureSubparser,
}