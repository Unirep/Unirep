import { ethers } from 'ethers'
import { Unirep, UnirepFactory, Attestation } from '@unirep/contracts'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { getProvider } from './utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('attest', { add_help: true })

    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
    })

    parser.add_argument('-epk', '--epoch-key', {
        required: true,
        type: 'str',
        help: "The user's epoch key to attest to (in hex representation)",
    })

    parser.add_argument('-pr', '--pos-rep', {
        type: 'int',
        help: 'Score of positive reputation to give to the user',
    })

    parser.add_argument('-nr', '--neg-rep', {
        type: 'int',
        help: 'Score of negative reputation to give to the user',
    })

    parser.add_argument('-gf', '--graffiti', {
        action: 'store',
        type: 'str',
        help: 'Graffiti for the reputation given to the user (in hex representation)',
    })

    parser.add_argument('-s', '--sign-up', {
        action: 'store',
        type: 'int',
        help: 'Whether to set sign up flag to the user',
    })

    parser.add_argument('-x', '--contract', {
        required: true,
        type: 'str',
        help: 'The Unirep contract address',
    })

    parser.add_argument('-d', '--eth-privkey', {
        required: true,
        action: 'store',
        type: 'str',
        help: "The attester's Ethereum private key",
    })
}

const attest = async (args: any) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ?? DEFAULT_ETH_PROVIDER
    const provider = getProvider(ethProvider)

    // Unirep contract
    const unirepContract: Unirep = UnirepFactory.connect(
        args.contract,
        provider
    )
    const attestingFee = (await unirepContract.config()).attestingFee

    // Connect a signer
    const wallet = new ethers.Wallet(args.eth_privkey, provider)

    // Parse input
    const epochKey = args.epoch_key
    const posRep = args.pos_rep ?? 0
    const negRep = args.neg_rep ?? 0
    const graffiti = args.graffiti ?? BigInt(0)
    const signUp = args.sign_up ?? 0
    const ethAddr = ethers.utils.computeAddress(args.eth_privkey)
    const attesterId = await unirepContract.attesters(ethAddr)
    const attestation = new Attestation(
        BigInt(attesterId.toString()),
        BigInt(posRep),
        BigInt(negRep),
        graffiti,
        BigInt(signUp)
    )
    console.log(
        `Attesting to epoch key ${epochKey} with pos rep ${posRep}, neg rep ${negRep}, graffiti ${graffiti.toString(
            16
        )} and sign up flag ${signUp}`
    )

    // Submit attestation
    let tx: ethers.ContractTransaction
    try {
        tx = await unirepContract
            .connect(wallet)
            .submitAttestation(attestation, epochKey, {
                value: attestingFee,
            })
        await tx.wait()
    } catch (error) {
        console.log('Transaction Error', error)
        return
    }
    console.log('Transaction hash:', tx.hash)
}

export { attest, configureSubparser }
