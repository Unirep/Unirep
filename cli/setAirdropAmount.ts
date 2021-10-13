import { ethers } from 'ethers'
import { add0x } from '@unirep/crypto'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { Attestation, UnirepContract } from '../core'
import { verifyEpochKeyProof } from './verifyEpochKeyProof'
import { epkProofPrefix, epkPublicSignalsPrefix } from './prefix'
import base64url from 'base64url'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'setAirdropAmount',
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

    parser.add_argument(
        '-a', '--airdrop',
        {
            required: true,
            type: 'int',
            help: 'The amount of airdrop positive reputation given by the attester'
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

const setAirdropAmount = async (args: any) => {

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER

    // Unirep contract
    const unirepContract = new UnirepContract(args.contract, ethProvider)

    // Connect a signer
    await unirepContract.unlock(args.eth_privkey)

    // Parse input
    const airdropPosRep = args.airdrop
    const attesterId = await unirepContract.getAttesterId()
    console.log(`Attester ${attesterId} sets its airdrop amount to ${airdropPosRep}`)

    // Submit attestation
    const tx = await unirepContract.setAirdropAmount(airdropPosRep)
    if (tx != undefined) console.log('Transaction hash:', tx?.hash)
}

export {
    setAirdropAmount,
    configureSubparser,
}