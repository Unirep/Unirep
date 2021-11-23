import base64url from 'base64url'
import { ethers } from 'ethers'
import { genIdentityCommitment, unSerialiseIdentity, add0x } from '@unirep/crypto'
import { formatProofForVerifierContract, verifyProof } from '@unirep/circuits'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'
import { genUserStateFromContract } from '../core'
import { identityPrefix, signUpProofPrefix, signUpPublicSignalsPrefix } from './prefix'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'genUserSignUpProof',
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
        '-a', '--attester-id',
        {
            required: true,
            type: 'str',
            help: 'The attester id (in hex representation)',
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

const genUserSignUpProof = async (args: any) => {

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER
    const provider = new ethers.providers.JsonRpcProvider(ethProvider)

    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = unSerialiseIdentity(decodedIdentity)
    const commitment = genIdentityCommitment(id)

    // Gen user sign up proof
    const userState = await genUserStateFromContract(
        provider,
        args.contract,
        id,
        commitment,
    )
    const attesterId = BigInt(add0x(args.attester_id))
    const results = await userState.genUserSignUpProof(attesterId)

    // TODO: Not sure if this validation is necessary
    const isValid = await verifyProof('proveUserSignUp',results.proof, results.publicSignals)
    if(!isValid) {
        console.error('Error: user sign up proof generated is not valid!')
        return
    }
    
    const formattedProof = formatProofForVerifierContract(results.proof)
    const encodedProof = base64url.encode(JSON.stringify(formattedProof))
    const encodedPublicSignals = base64url.encode(JSON.stringify(results.publicSignals))
    console.log(`Proof of user sign up from attester ${results.attesterId}:`)
    console.log(`Epoch key of the user: ${BigInt(results.epochKey).toString()}`)
    console.log(signUpProofPrefix + encodedProof)
    console.log(signUpPublicSignalsPrefix + encodedPublicSignals)
}

export {
    genUserSignUpProof,
    configureSubparser,
}