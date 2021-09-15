import base64url from 'base64url'
import { ethers } from 'ethers'
import { add0x } from '@unirep/crypto'
import { getUnirepContract } from '@unirep/contracts'

import { promptPwd, validateEthSk, validateEthAddress, checkDeployerProviderConnection, contractExists } from './utils'
import { DEFAULT_ETH_PROVIDER } from './defaults'
import { identityCommitmentPrefix } from './prefix'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'userSignUp',
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
        '-c', '--identity-commitment',
        {
            required: true,
            type: 'str',
            help: 'The user\'s identity commitment (in hex representation)',
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

const userSignUp = async (args: any) => {

    // Unirep contract
    if (!validateEthAddress(args.contract)) {
        console.error('Error: invalid Unirep contract address')
        return
    }

    const unirepAddress = args.contract

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER

    let ethSk
    // The deployer's Ethereum private key
    // The user may either enter it as a command-line option or via the
    // standard input
    if (args.prompt_for_eth_privkey) {
        ethSk = await promptPwd('Your Ethereum private key')
    } else {
        ethSk = args.eth_privkey
    }

    if (!validateEthSk(ethSk)) {
        console.error('Error: invalid Ethereum private key')
        return
    }

    if (! (await checkDeployerProviderConnection(ethSk, ethProvider))) {
        console.error('Error: unable to connect to the Ethereum provider at', ethProvider)
        return
    }

    const provider = new ethers.providers.JsonRpcProvider(ethProvider)
    const wallet = new ethers.Wallet(ethSk, provider)

    if (! await contractExists(provider, unirepAddress)) {
        console.error('Error: there is no contract deployed at the specified address')
        return
    }

    const unirepContract = await getUnirepContract(unirepAddress, wallet)

    const encodedCommitment = args.identity_commitment.slice(identityCommitmentPrefix.length)
    const decodedCommitment = base64url.decode(encodedCommitment)
    const commitment = add0x(decodedCommitment)

    let tx
    try {
        tx = await unirepContract.userSignUp(
            commitment,
            { gasLimit: 1000000 }
        )

    } catch(e) {
        console.error('Error: the transaction failed')
        if (e) {
            console.error(e)
        }
        return
    }

    const receipt = await tx.wait()
    const epoch = unirepContract.interface.parseLog(receipt.logs[1]).args._epoch
    console.log('Transaction hash:', tx.hash)
    console.log('Sign up epoch:', epoch.toString())
}

export {
    userSignUp,
    configureSubparser,
}