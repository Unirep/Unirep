import { ethers } from 'ethers'
import { Unirep, UnirepFactory } from '@unirep/contracts'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { getProvider } from './utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('setAirdropAmount', { add_help: true })

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

    parser.add_argument('-a', '--airdrop', {
        required: true,
        type: 'int',
        help: 'The amount of airdrop positive reputation given by the attester',
    })

    parser.add_argument('-d', '--eth-privkey', {
        action: 'store',
        type: 'str',
        help: "The attester's Ethereum private key",
    })
}

const setAirdropAmount = async (args: any) => {
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

    // Parse input
    const airdropPosRep = args.airdrop
    const attesterId = await unirepContract.attesters(wallet.address)
    console.log(
        `Attester ${attesterId} sets its airdrop amount to ${airdropPosRep}`
    )

    // Submit attestation
    let tx: ethers.ContractTransaction
    try {
        tx = await unirepContract
            .connect(wallet)
            .setAirdropAmount(airdropPosRep)
        await tx.wait()
    } catch (error) {
        console.log('Transaction Error', error)
        return
    }
    console.log('Transaction hash:', tx.hash)
}

export { setAirdropAmount, configureSubparser }
