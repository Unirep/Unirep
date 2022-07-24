import base64url from 'base64url'
import { SignUpProof, Unirep, UnirepFactory } from '@unirep/contracts'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { signUpProofPrefix, signUpPublicSignalsPrefix } from './prefix'
import { getProvider, genUnirepState } from './utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('verifyUserSignUpProof', {
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

const verifyUserSignUpProof = async (args: any) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ?? DEFAULT_ETH_PROVIDER
    const provider = getProvider(ethProvider)

    // Unirep contract
    const unirepContract: Unirep = UnirepFactory.connect(
        args.contract,
        provider
    )

    const unirepState = await genUnirepState(provider, args.contract)

    // Parse Inputs
    const decodedProof = base64url.decode(
        args.proof.slice(signUpProofPrefix.length)
    )
    const decodedPublicSignals = base64url.decode(
        args.public_signals.slice(signUpPublicSignalsPrefix.length)
    )
    const publicSignals = JSON.parse(decodedPublicSignals)
    const proof = JSON.parse(decodedProof)

    // Verify the proof on-chain
    const signUpProof = new SignUpProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof),
        defaultProver
    )

    // Check if Global state tree root exists
    const isGSTRootExisted = await unirepState.GSTRootExists(
        BigInt(signUpProof.globalStateTree.toString()),
        +signUpProof.epoch.toString()
    )
    if (!isGSTRootExisted) {
        console.error('Error: invalid global state tree root')
        return
    }
    const isProofValid = await unirepContract.verifyUserSignUp(
        signUpProof.publicSignals,
        signUpProof.proof
    )
    if (!isProofValid) {
        console.error('Error: invalid user sign up proof')
        return
    }

    console.log(`Epoch key of the user: ${signUpProof.epochKey.toString()}`)
    console.log(
        `Verify user sign up proof from attester ${signUpProof.attesterId.toString()} succeed`
    )
}

export { verifyUserSignUpProof, configureSubparser }
