import { ethers } from 'ethers'
import base64url from 'base64url'
import { Unirep, UnirepFactory } from '@unirep/contracts'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { identityCommitmentPrefix } from './prefix'
import { getProvider } from './utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('userSignUp', { add_help: true })

    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
    })

    parser.add_argument('-c', '--identity-commitment', {
        required: true,
        type: 'str',
        help: "The user's identity commitment (in hex representation)",
    })

    parser.add_argument('-x', '--contract', {
        required: true,
        type: 'str',
        help: 'The Unirep contract address',
    })

    parser.add_argument('-d', '--eth-privkey', {
        action: 'store',
        type: 'str',
        help: "The user's Ethereum private key",
    })
}

const userSignUp = async (args: any) => {
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

    // Connect a signer
    const wallet = new ethers.Wallet(args.eth_privkey, provider)

    // Parse identity commitment
    const encodedCommitment = args.identity_commitment.slice(
        identityCommitmentPrefix.length
    )
    const decodedCommitment = base64url.decode(encodedCommitment)
    const commitment = decodedCommitment

    // Submit the user sign up transaction
    let tx: ethers.ContractTransaction
    try {
        tx = await unirepContract.connect(wallet).userSignUp(BigInt(commitment))
        await tx.wait()
    } catch (error) {
        console.log('Transaction Error', error)
        return
    }
    const epoch = await unirepContract.currentEpoch()

    console.log('Transaction hash:', tx.hash)
    console.log('Sign up epoch:', epoch.toString())
}

export { userSignUp, configureSubparser }
