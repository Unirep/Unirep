import base64url from 'base64url'
import { ZkIdentity, Strategy } from '@unirep/crypto'
import {
    Circuit,
    formatProofForVerifierContract,
    verifyProof,
} from '@unirep/circuits'
import { Unirep, UnirepFactory } from '@unirep/contracts'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { genReputationNullifier, genUserState } from '../src'
import {
    identityPrefix,
    reputationPublicSignalsPrefix,
    reputationProofPrefix,
} from './prefix'
import { getProvider } from './utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('genReputationProof', {
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

    parser.add_argument('-a', '--attester-id', {
        required: true,
        type: 'str',
        help: 'The attester id (in hex representation)',
    })

    parser.add_argument('-r', '--reputation-nullifier', {
        type: 'int',
        help: 'The number of reputation nullifiers to prove',
    })

    parser.add_argument('-mr', '--min-rep', {
        type: 'int',
        help: 'The minimum positive score minus negative score the attester given to the user',
    })

    parser.add_argument('-gp', '--graffiti-preimage', {
        type: 'str',
        help: 'The pre-image of the graffiti for the reputation the attester given to the user (in hex representation)',
    })

    parser.add_argument('-x', '--contract', {
        required: true,
        type: 'str',
        help: 'The Unirep contract address',
    })
}

const genReputationProof = async (args: any) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ?? DEFAULT_ETH_PROVIDER
    const provider = getProvider(ethProvider)

    // User Identity
    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = new ZkIdentity(Strategy.SERIALIZED, decodedIdentity)

    // Gen User State
    const userState = await genUserState(provider, args.contract, id)

    // Unirep contract
    const unirepContract: Unirep = UnirepFactory.connect(
        args.contract,
        provider
    )
    const maxReputationBudget = await unirepContract.maxReputationBudget()

    // Proving content
    const epoch = userState.getUnirepStateCurrentEpoch()
    const attesterId = BigInt(args.attester_id)
    const epkNonce = args.epoch_key_nonce
    const proveGraffiti = args.graffiti_preimage != null ? BigInt(1) : BigInt(0)
    const minRep = args.min_rep != null ? args.min_rep : 0
    const repNullifiersAmount =
        args.reputation_nullifier != null ? args.reputation_nullifier : 0
    const nonceList: bigint[] = []
    const rep = userState.getRepByAttester(attesterId)
    let nonceStarter: number = -1
    if (repNullifiersAmount > 0) {
        // find valid nonce starter
        for (let n = 0; n < Number(rep.posRep) - Number(rep.negRep); n++) {
            const reputationNullifier = genReputationNullifier(
                id.identityNullifier,
                epoch,
                n,
                attesterId
            )
            if (!userState.nullifierExist(reputationNullifier)) {
                nonceStarter = n
                break
            }
        }
        if (nonceStarter == -1) {
            console.error('Error: All nullifiers are spent')
        }
        if (
            nonceStarter + repNullifiersAmount >
            Number(rep.posRep) - Number(rep.negRep)
        ) {
            console.error('Error: Not enough reputation to spend')
        }
        for (let i = 0; i < repNullifiersAmount; i++) {
            nonceList.push(BigInt(nonceStarter + i))
        }
    }

    for (let i = repNullifiersAmount; i < maxReputationBudget; i++) {
        nonceList.push(BigInt(-1))
    }
    const graffitiPreImage =
        args.graffiti_preimage != null
            ? BigInt(args.graffiti_preimage)
            : BigInt(0)
    const results = await userState.genProveReputationProof(
        attesterId,
        epkNonce,
        minRep,
        proveGraffiti,
        graffitiPreImage,
        nonceList
    )

    console.log('repnullifier amount', repNullifiersAmount)

    // TODO: Not sure if this validation is necessary
    const isValid = await verifyProof(
        Circuit.proveReputation,
        results.proof,
        results.publicSignals
    )
    if (!isValid) {
        console.error('Error: reputation proof generated is not valid!')
    }

    const formattedProof = formatProofForVerifierContract(results.proof)
    const encodedProof = base64url.encode(JSON.stringify(formattedProof))
    const encodedPublicSignals = base64url.encode(
        JSON.stringify(results.publicSignals)
    )
    console.log(`Proof of reputation from attester ${results.attesterId}:`)
    console.log(`Epoch key of the user: ${BigInt(results.epochKey).toString()}`)
    console.log(reputationProofPrefix + encodedProof)
    console.log(reputationPublicSignalsPrefix + encodedPublicSignals)
}

export { genReputationProof, configureSubparser }
