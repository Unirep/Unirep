import base64url from 'base64url'
import { ZkIdentity, Strategy } from '@unirep/crypto'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import {
    identityPrefix,
    signUpProofPrefix,
    signUpPublicSignalsPrefix,
} from './prefix'
import { getProvider, genUserState } from './utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('genUserSignUpProof', {
        add_help: true,
    })

    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
    })

    parser.add_argument('-id', '--identity', {
        required: true,
        type: 'str',
        help: "The (serialized) user's identity",
    })

    parser.add_argument('-a', '--attester-id', {
        required: true,
        type: 'str',
        help: 'The attester id (in hex representation)',
    })

    parser.add_argument('-x', '--contract', {
        required: true,
        type: 'str',
        help: 'The Unirep contract address',
    })
}

const genUserSignUpProof = async (args: any) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ?? DEFAULT_ETH_PROVIDER
    const provider = getProvider(ethProvider)

    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = new ZkIdentity(Strategy.SERIALIZED, decodedIdentity)

    // Gen user sign up proof
    const userState = await genUserState(provider, args.contract, id)
    const attesterId = BigInt(args.attester_id)
    const formattedProof = await userState.genUserSignUpProof(attesterId)

    // TODO: Not sure if this validation is necessary
    const isValid = await formattedProof.verify()
    if (!isValid) {
        console.error('Error: user sign up proof generated is not valid!')
        return
    }

    const encodedProof = base64url.encode(JSON.stringify(formattedProof.proof))
    const encodedPublicSignals = base64url.encode(
        JSON.stringify(formattedProof.publicSignals)
    )
    console.log(
        `Proof of user sign up from attester ${formattedProof.attesterId}:`
    )
    console.log(`Epoch key of the user: ${formattedProof.epochKey.toString()}`)
    console.log(signUpProofPrefix + encodedProof)
    console.log(signUpPublicSignalsPrefix + encodedPublicSignals)
}

export { genUserSignUpProof, configureSubparser }
