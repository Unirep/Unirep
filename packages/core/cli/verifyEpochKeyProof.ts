import base64url from 'base64url'
import { EpochKeyProof, Unirep, UnirepFactory } from '@unirep/contracts'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { epkProofPrefix, epkPublicSignalsPrefix } from './prefix'
import { getProvider, genUnirepState } from './utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('verifyEpochKeyProof', {
        add_help: true,
    })

    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
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

const verifyEpochKeyProof = async (args: any) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ?? DEFAULT_ETH_PROVIDER
    const provider = getProvider(ethProvider)

    // Unirep contract
    const unirepContract: Unirep = UnirepFactory.connect(
        args.contract,
        provider
    )

    const unirepState = await genUnirepState(provider, args.contract)

    const decodedProof = base64url.decode(
        args.proof.slice(epkProofPrefix.length)
    )
    const decodedPublicSignals = base64url.decode(
        args.public_signals.slice(epkPublicSignalsPrefix.length)
    )
    const proof = JSON.parse(decodedProof)
    const publicSignals = JSON.parse(decodedPublicSignals)
    const currentEpoch = (await unirepState.loadCurrentEpoch()).number
    const epk = publicSignals[0]
    const inputEpoch = Number(publicSignals[2])
    const GSTRoot = publicSignals[1]
    console.log(
        `Verifying epoch key ${epk} with GSTRoot ${GSTRoot} in epoch ${inputEpoch}`
    )
    if (inputEpoch != currentEpoch) {
        console.log(
            `Warning: the epoch key is expired. Epoch key is in epoch ${inputEpoch}, but the current epoch is ${currentEpoch}`
        )
    }

    // Check if Global state tree root exists
    const isGSTRootExisted = await unirepState.GSTRootExists(
        GSTRoot,
        inputEpoch
    )
    if (!isGSTRootExisted) {
        console.error('Error: invalid global state tree root')
        return
    }

    // Verify the proof on-chain
    const epkProof: EpochKeyProof = new EpochKeyProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof),
        defaultProver
    )
    const isProofValid = await unirepContract.verifyEpochKeyValidity(
        epkProof.publicSignals,
        epkProof.proof
    )
    if (!isProofValid) {
        console.error('Error: invalid epoch key proof')
        return
    }
    console.log(`Verify epoch key proof with epoch key ${epk} succeed`)
}

export { verifyEpochKeyProof, configureSubparser }
