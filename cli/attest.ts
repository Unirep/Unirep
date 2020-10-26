import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'

import {
    promptPwd,
    validateEthSk,
    validateEthAddress,
    checkDeployerProviderConnection,
    contractExists,
} from './utils'

import { DEFAULT_ETH_PROVIDER } from './defaults'

import { add0x } from '../crypto/SMT'
import { Attestation } from '../core'

import Unirep from "../artifacts/contracts/Unirep.sol/Unirep.json"

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.addParser(
        'attest',
        { addHelp: true },
    )

    parser.addArgument(
        ['-e', '--eth-provider'],
        {
            action: 'store',
            type: 'string',
            help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
        }
    )

    parser.addArgument(
        ['-epk', '--epoch-key'],
        {
            required: true,
            type: 'string',
            help: 'The user\'s epoch key to attest to (in hex representation)',
        }
    )

    parser.addArgument(
        ['-pr', '--pos-rep'],
        {
            required: true,
            type: 'int',
            help: 'Score of positive reputation to give to the user',
        }
    )

    parser.addArgument(
        ['-nr', '--neg-rep'],
        {
            required: true,
            type: 'int',
            help: 'Score of negative reputation to give to the user',
        }
    )

    parser.addArgument(
        ['-gf', '--graffiti'],
        {
            action: 'store',
            type: 'string',
            help: 'Graffiti for the reputation given to the user (in hex representation)',
        }
    )

    parser.addArgument(
        ['-x', '--contract'],
        {
            required: true,
            type: 'string',
            help: 'The Unirep contract address',
        }
    )

    const privkeyGroup = parser.addMutuallyExclusiveGroup({ required: true })

    privkeyGroup.addArgument(
        ['-dp', '--prompt-for-eth-privkey'],
        {
            action: 'storeTrue',
            help: 'Whether to prompt for the user\'s Ethereum private key and ignore -d / --eth-privkey',
        }
    )

    privkeyGroup.addArgument(
        ['-d', '--eth-privkey'],
        {
            action: 'store',
            type: 'string',
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

    const provider = new hardhatEthers.providers.JsonRpcProvider(ethProvider)
    const wallet = new ethers.Wallet(ethSk, provider)

    if (! await contractExists(provider, unirepAddress)) {
        console.error('Error: there is no contract deployed at the specified address')
        return
    }

    const unirepContract = new ethers.Contract(
        unirepAddress,
        Unirep.abi,
        wallet,
    )
    const attestingFee = await unirepContract.attestingFee()
    const ethAddr = ethers.utils.computeAddress(args.eth_privkey)
    const attesterId = await unirepContract.attesters(ethAddr)
    if (attesterId.toNumber() == 0) {
        console.error('Error: attester has not registered yet')
        return
    }

    const epk = BigInt(add0x(args.epoch_key))
    const graffiti = args.graffiti ? BigInt(add0x(args.graffiti)) : BigInt(0)
    const overwriteGraffiti = args.graffiti ? true : false
    const attestation = new Attestation(
        BigInt(attesterId),
        BigInt(args.pos_rep),
        BigInt(args.neg_rep),
        graffiti,
        overwriteGraffiti,
    )
    console.log(`Attesting to epoch key ${args.epoch_key} with pos rep ${args.pos_rep}, neg rep ${args.neg_rep} and graffiti ${graffiti.toString(16)} (overwrite graffit: ${overwriteGraffiti})`)
    let tx
    try {
        tx = await unirepContract.submitAttestation(
            attestation,
            epk,
            { value: attestingFee, gasLimit: 1000000 }
        )
    } catch(e) {
        console.error('Error: the transaction failed')
        if (e.message) {
            console.error(e.message)
        }
        return
    }

    console.log('Transaction hash:', tx.hash)
}

export {
    attest,
    configureSubparser,
}