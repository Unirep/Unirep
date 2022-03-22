import base64url from 'base64url'
import { ReputationProof, Unirep, UnirepFactory } from '@unirep/contracts'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { genUnirepStateFromContract } from '../src'
import { reputationProofPrefix, reputationPublicSignalsPrefix } from './prefix'
import { maxReputationBudget } from '../config/testLocal'
import { getProvider } from './utils'

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
    const ethProvider = args.eth_provider
        ? args.eth_provider
        : DEFAULT_ETH_PROVIDER
    const provider = getProvider(ethProvider)

    // Unirep contract
    const unirepContract: Unirep = UnirepFactory.connect(
        args.contract,
        provider
    )

    const unirepState = await genUnirepStateFromContract(
        provider,
        args.contract
    )

    // Parse Inputs
    const decodedProof = base64url.decode(
        args.proof.slice(reputationProofPrefix.length)
    )
    const decodedPublicSignals = base64url.decode(
        args.public_signals.slice(reputationPublicSignalsPrefix.length)
    )
    const publicSignals = JSON.parse(decodedPublicSignals)
    const outputNullifiers = publicSignals.slice(0, maxReputationBudget)
    const epoch = publicSignals[maxReputationBudget]
    const epk = publicSignals[maxReputationBudget + 1]
    const GSTRoot = publicSignals[maxReputationBudget + 2]
    const attesterId = publicSignals[maxReputationBudget + 3]
    const repNullifiersAmount = publicSignals[maxReputationBudget + 4]
    const minRep = publicSignals[maxReputationBudget + 5]
    const proveGraffiti = publicSignals[maxReputationBudget + 6]
    const graffitiPreImage = publicSignals[maxReputationBudget + 7]
    const proof = JSON.parse(decodedProof)

    // Check if Global state tree root exists
    const isGSTRootExisted = unirepState.GSTRootExists(GSTRoot, epoch)
    if (!isGSTRootExisted) {
        console.error('Error: invalid global state tree root')
        return
    }

    // Verify the proof on-chain
    const reputationProof = new ReputationProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof)
    )
    const isProofValid = await unirepContract.verifyReputation(reputationProof)
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
