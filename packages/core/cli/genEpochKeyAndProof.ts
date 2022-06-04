import base64url from 'base64url'
import { Strategy, ZkIdentity } from '@unirep/crypto'
import circuit, { CircuitName } from '@unirep/circuits'
import contract, { Unirep } from '@unirep/contracts'

import { DEFAULT_ETH_PROVIDER, DEFAULT_ZK_PATH } from './defaults'
import { genUserState, UnirepProtocol } from '../src'
import {
    epkProofPrefix,
    epkPublicSignalsPrefix,
    identityPrefix,
} from './prefix'
import { getProvider } from './utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('genEpochKeyAndProof', {
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

    parser.add_argument('-n', '--epoch-key-nonce', {
        required: true,
        type: 'int',
        help: 'The epoch key nonce',
    })

    parser.add_argument('-x', '--contract', {
        required: true,
        type: 'str',
        help: 'The Unirep contract address',
    })
}

const genEpochKeyAndProof = async (args: any) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ?? DEFAULT_ETH_PROVIDER
    const provider = getProvider(ethProvider)

    // Unirep contract
    const unirepContract: Unirep = contract.get(args.contract, provider)
    const numEpochKeyNoncePerEpoch =
        await unirepContract.numEpochKeyNoncePerEpoch()

    // Validate epoch key nonce
    const epkNonce = args.epoch_key_nonce
    if (epkNonce >= numEpochKeyNoncePerEpoch) {
        console.error(
            'Error: epoch key nonce must be less than max epoch key nonce'
        )
        return
    }

    // Gen epoch key
    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = new ZkIdentity(Strategy.SERIALIZED, decodedIdentity)

    // Gen User State
    const protocol = new UnirepProtocol(DEFAULT_ZK_PATH)
    const userState = await genUserState(protocol, provider, args.contract, id)
    const results = await userState.genVerifyEpochKeyProof(epkNonce)
    const currentEpoch = userState.currentEpoch
    const epk = protocol
        .genEpochKey(id.identityNullifier, currentEpoch, epkNonce)
        .toString()

    // TODO: Not sure if this validation is necessary
    const isValid = await circuit.verifyProof(
        DEFAULT_ZK_PATH,
        CircuitName.verifyEpochKey,
        results.proof,
        results.publicSignals
    )
    if (!isValid) {
        console.error('Error: epoch key proof generated is not valid!')
        return
    }

    const formattedProof = circuit.formatProofForVerifierContract(results.proof)
    const encodedProof = base64url.encode(JSON.stringify(formattedProof))
    const encodedPublicSignals = base64url.encode(
        JSON.stringify(results.publicSignals)
    )
    console.log(
        `Epoch key of epoch ${currentEpoch} and nonce ${epkNonce}: ${epk}`
    )
    console.log(epkProofPrefix + encodedProof)
    console.log(epkPublicSignalsPrefix + encodedPublicSignals)
}

export { genEpochKeyAndProof, configureSubparser }
