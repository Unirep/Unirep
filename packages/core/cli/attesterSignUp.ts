import { ethers } from 'ethers'
import { Unirep, UnirepFactory } from '@unirep/contracts'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { getProvider } from './utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('attesterSignUp', { add_help: true })

    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
    })

    parser.add_argument('-x', '--contract', {
        required: true,
        type: 'str',
        help: 'The Unirep contract address',
    })

    parser.add_argument('-d', '--eth-privkey', {
        action: 'store',
        type: 'str',
        help: "The attester's Ethereum private key",
    })
}

const attesterSignUp = async (args: any) => {
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

    // Submit the user sign up transaction
    let tx: ethers.ContractTransaction
    try {
        tx = await unirepContract.connect(wallet).attesterSignUp()
        await tx.wait()
    } catch (error) {
        console.log('Transaction Error', error)
        return
    }

    const ethAddr = ethers.utils.computeAddress(args.eth_privkey)
    const attesterId = await unirepContract.attesters(ethAddr)
    if (attesterId.toNumber() == 0) {
        console.error('Error: sign up succeeded but has no attester id!')
    }
    console.log('Transaction hash:', tx.hash)
    console.log('Attester sign up with attester id:', attesterId.toNumber())
}

export { attesterSignUp, configureSubparser }
