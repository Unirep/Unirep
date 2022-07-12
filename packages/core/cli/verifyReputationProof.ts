import base64url from 'base64url'
import { ethers } from 'ethers'
import { ReputationProof, Unirep, abi } from '@unirep/contracts'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { reputationProofPrefix, reputationPublicSignalsPrefix } from './prefix'
import { getProvider, genUnirepState } from './utils'
import {
    formatProofForSnarkjsVerification,
    MAX_REPUTATION_BUDGET,
} from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('verifyReputationProof', {
        add_help: true,
    })

    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
    })

    parser.add_argument('-ep', '--epoch', {
        action: 'store',
        type: 'int',
        help: 'The latest epoch user transitioned to. Default: current epoch',
    })

    parser.add_argument('-p', '--public-signals', {
        required: true,
        type: 'str',
        help: "The snark public signals of the user's epoch key ",
    })

    parser.add_argument('-pf', '--proof', {
        required: true,
        type: 'str',
        help: "The snark proof of the user's epoch key ",
    })

    parser.add_argument('-x', '--contract', {
        required: true,
        type: 'str',
        help: 'The Unirep contract address',
    })
}

const verifyReputationProof = async (args: any) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ?? DEFAULT_ETH_PROVIDER
    const provider = getProvider(ethProvider)

    // Unirep contract
    const unirepContract = (new ethers.Contract(args.contract, abi, provider)) as Unirep
    const unirepState = await genUnirepState(provider, args.contract)

    // Parse Inputs
    const decodedProof = base64url.decode(
        args.proof.slice(reputationProofPrefix.length)
    )
    const decodedPublicSignals = base64url.decode(
        args.public_signals.slice(reputationPublicSignalsPrefix.length)
    )
    const publicSignals = JSON.parse(decodedPublicSignals)
    const outputNullifiers = publicSignals.slice(0, MAX_REPUTATION_BUDGET)
    const epoch = Number(publicSignals[MAX_REPUTATION_BUDGET])
    const epk = publicSignals[MAX_REPUTATION_BUDGET + 1]
    const GSTRoot = publicSignals[MAX_REPUTATION_BUDGET + 2]
    const attesterId = publicSignals[MAX_REPUTATION_BUDGET + 3]
    const repNullifiersAmount = publicSignals[MAX_REPUTATION_BUDGET + 4]
    const minRep = publicSignals[MAX_REPUTATION_BUDGET + 5]
    const proveGraffiti = publicSignals[MAX_REPUTATION_BUDGET + 6]
    const graffitiPreImage = publicSignals[MAX_REPUTATION_BUDGET + 7]
    const proof = JSON.parse(decodedProof)

    // Check if Global state tree root exists
    const isGSTRootExisted = await unirepState.GSTRootExists(GSTRoot, epoch)
    if (!isGSTRootExisted) {
        console.error('Error: invalid global state tree root')
        return
    }

    // Verify the proof on-chain
    const reputationProof = new ReputationProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof),
        defaultProver
    )
    const isProofValid = await unirepContract.verifyReputation(
        reputationProof.publicSignals,
        reputationProof.proof
    )
    if (!isProofValid) {
        console.error('Error: invalid reputation proof')
        return
    }

    console.log(`Epoch key of the user: ${epk}`)
    console.log(
        `Verify reputation proof from attester ${attesterId} with min rep ${minRep}, reputation nullifiers amount ${repNullifiersAmount} and graffiti pre-image ${args.graffiti_preimage}, succeed`
    )
}

export { verifyReputationProof, configureSubparser }
