import { DEFAULT_ETH_PROVIDER } from './defaults'
import { UnirepContract } from '../core/UnirepContract'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'epochTransition',
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
        '-t', '--is-test',
        {
            action: 'store_true',
            help: 'Indicate if the provider is a testing environment',
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

    const privkeyGroup = parser.add_mutually_exclusive_group({ required: true })

    privkeyGroup.add_argument(
        '-dp', '--prompt-for-eth-privkey',
        {
            action: 'store_true',
            help: 'Whether to prompt for the user\'s Ethereum private key and ignore -d / --eth-privkey',
        }
    )

    privkeyGroup.add_argument(
        '-d', '--eth-privkey',
        {
            action: 'store',
            type: 'str',
            help: 'The deployer\'s Ethereum private key',
        }
    )
}

const epochTransition = async (args: any) => {

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER

    // Unirep contract
    const unirepContract = new UnirepContract(args.contract, ethProvider)

    // Connect a signer
    await unirepContract.unlock(args.eth_privkey)

    // Fast-forward to end of epoch if in test environment
    if (args.is_test) {
        await unirepContract.fastForward()
    }

    const currentEpoch = await unirepContract.currentEpoch()
    const tx = await unirepContract.epochTransition()

    console.log('Transaction hash:', tx?.hash)
    console.log('End of epoch:', currentEpoch.toString())
}

export {
    epochTransition,
    configureSubparser,
}