import base64url from 'base64url'
import { SignUpProof, Unirep, UnirepFactory } from '@unirep/contracts'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { verifyUserSignUpProof } from './verifyUserSignUpProof'
import { signUpProofPrefix, signUpPublicSignalsPrefix } from './prefix'
import { getProvider } from './utils'
import { ethers } from 'ethers'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'giveAirdrop',
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
        '-p', '--public-signals',
        {
            required: true,
            type: 'str',
            help: 'The snark public signals of the user\'s epoch key ',
        }
    )

    parser.add_argument(
        '-pf', '--proof',
        {
            required: true,
            type: 'str',
            help: 'The snark proof of the user\'s epoch key ',
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

    parser.add_argument(
        '-d', '--eth-privkey',
        {
            action: 'store',
            type: 'str',
            help: 'The attester\'s Ethereum private key',
        }
    )
}

const giveAirdrop = async (args: any) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER
    const provider = getProvider(ethProvider)

    // Unirep contract
    const unirepContract: Unirep = UnirepFactory.connect(args.contract, provider)
    const attestingFee = await unirepContract.attestingFee()

    // Connect a signer
    const wallet = new ethers.Wallet(args.eth_privkey, provider)

    await verifyUserSignUpProof(args)

    // Parse input
    const decodedProof = base64url.decode(args.proof.slice(signUpProofPrefix.length))
    const proof = JSON.parse(decodedProof)
    const decodedPublicSignals = base64url.decode(args.public_signals.slice(signUpPublicSignalsPrefix.length))
    const publicSignals = JSON.parse(decodedPublicSignals)
    const userSignUpProof = new SignUpProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof)
    )

    console.log(`Airdrop to epoch key ${userSignUpProof.epochKey} in attester ID ${userSignUpProof.attesterId}`)

    // Submit attestation
    let tx: ethers.ContractTransaction
    try {
        tx = await unirepContract
            .connect(wallet)
            .airdropEpochKey(userSignUpProof,
                { value: attestingFee })
        await tx.wait()
    } catch (error) {
        console.log('Transaction Error', error)
        return
    }
    const hashProof = await unirepContract.hashSignUpProof(userSignUpProof)
    const proofIndex = await unirepContract.getProofIndex(hashProof)

    console.log('Transaction hash:', tx.hash)
    console.log('Proof index:', proofIndex.toNumber())
}

export {
    giveAirdrop,
    configureSubparser,
}