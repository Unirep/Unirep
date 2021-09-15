import { ethers } from 'ethers'
import { add0x } from '@unirep/crypto'
import { getUnirepContract } from '@unirep/contracts'

import {promptPwd, validateEthSk, validateEthAddress, checkDeployerProviderConnection, contractExists} from './utils'
import { DEFAULT_ETH_PROVIDER } from './defaults'
import { Attestation } from '../core'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'attest',
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
        '-epk', '--epoch-key',
        {
            required: true,
            type: 'str',
            help: 'The user\'s epoch key to attest to (in hex representation)',
        }
    )

    parser.add_argument(
        '-pr', '--pos-rep',
        {
            type: 'int',
            help: 'Score of positive reputation to give to the user',
        }
    )

    parser.add_argument(
        '-nr', '--neg-rep',
        {
            type: 'int',
            help: 'Score of negative reputation to give to the user',
        }
    )

    parser.add_argument(
        '-gf', '--graffiti',
        {
            action: 'store',
            type: 'str',
            help: 'Graffiti for the reputation given to the user (in hex representation)',
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

const attest = async (args: any) => {

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
    const attestingFee = await unirepContract.attestingFee()
    const ethAddr = ethers.utils.computeAddress(args.eth_privkey)
    const attesterId = await unirepContract.attesters(ethAddr)
    if (attesterId.toNumber() == 0) {
        console.error('Error: attester has not registered yet')
        return
    }

    const epk = BigInt(add0x(args.epoch_key))
    const posRep = args.pos_rep ? args.pos_rep : 0
    const negRep = args.neg_rep ? args.neg_rep : 0
    const graffiti = args.graffiti ? BigInt(add0x(args.graffiti)) : BigInt(0)
    const attestation = new Attestation(
        BigInt(attesterId),
        BigInt(posRep),
        BigInt(negRep),
        graffiti,
    )
    console.log(`Attesting to epoch key ${args.epoch_key} with pos rep ${posRep}, neg rep ${negRep} and graffiti ${graffiti.toString(16)}`)
    let tx
    try {
        tx = await unirepContract.submitAttestation(
            attestation,
            epk,
            { value: attestingFee, gasLimit: 1000000 }
        )
    } catch(e) {
        console.error('Error: the transaction failed')
        if (e) {
            console.error(e)
        }
        return
    }

    console.log('Transaction hash:', tx.hash)
}

export {
    attest,
    configureSubparser,
}