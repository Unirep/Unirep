import contract, { Unirep } from '@unirep/contracts'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { getProvider } from './utils'
import { ethers } from 'ethers'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('epochTransition', { add_help: true })

    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
    })

    parser.add_argument('-t', '--is-test', {
        action: 'store_true',
        help: 'Indicate if the provider is a testing environment',
    })

    parser.add_argument('-x', '--contract', {
        required: true,
        type: 'str',
        help: 'The Unirep contract address',
    })

    parser.add_argument('-d', '--eth-privkey', {
        action: 'store',
        type: 'str',
        help: "The deployer's Ethereum private key",
    })
}

const epochTransition = async (args: any) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ?? DEFAULT_ETH_PROVIDER
    const provider = getProvider(ethProvider)

    // Connect a signer
    const wallet = new ethers.Wallet(args.eth_privkey, provider)

    // Unirep contract
    const unirepContract: Unirep = contract.get(args.contract, wallet)

    // Fast-forward to end of epoch if in test environment
    if (args.is_test) {
        const epochLength = (await unirepContract.epochLength()).toNumber()
        await (provider as any).send('evm_increaseTime', [epochLength])
    }

    const currentEpoch = await unirepContract.currentEpoch()
    let tx: ethers.ContractTransaction
    try {
        tx = await unirepContract.connect(wallet).beginEpochTransition()
        await tx.wait()
    } catch (error) {
        console.log('Transaction Error', error)
        return
    }

    console.log('Transaction hash:', tx.hash)
    console.log('End of epoch:', currentEpoch.toString())
}

export { epochTransition, configureSubparser }
