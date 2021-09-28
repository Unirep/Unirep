import { ethers } from 'ethers'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { UnirepContract } from '../core'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'attesterSignUp',
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

const attesterSignUp = async (args: any) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER

    // Unirep contract
    const unirepContract = new UnirepContract(args.contract, ethProvider)

    // Connect a signer
    const ehtSk = await unirepContract.unlock(args.eth_privkey)

    // Submit the user sign up transaction
    const tx = await unirepContract.attesterSignUp()

    const ethAddr = ethers.utils.computeAddress(ehtSk)
    const attesterId = await unirepContract.attesters(ethAddr)
    if (attesterId.toNumber() == 0) {
        console.error('Error: sign up succeeded but has no attester id!')
    }
    console.log('Transaction hash:', tx?.hash)
    console.log('Attester sign up with attester id:', attesterId.toNumber())
}

export {
    attesterSignUp,
    configureSubparser,
}