import { DEFAULT_ETH_PROVIDER } from './defaults'
import { UnirepContract } from '../core'
import { verifyUserSignUpProof } from './verifyUserSignUpProof'
import { signUpProofPrefix, signUpPublicSignalsPrefix } from './prefix'
import base64url from 'base64url'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'giveAirdrop',
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
        '-p', '--public-signals',
        {
            required: true,
            type: 'str',
            help: 'The snark public signals of the user\'s epoch key ',
        }
    )

    parser.add_argument(
        '-pf', '--proof',
        {
            required: true,
            type: 'str',
            help: 'The snark proof of the user\'s epoch key ',
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

const giveAirdrop = async (args: any) => {

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER

    // Unirep contract
    const unirepContract = new UnirepContract(args.contract, ethProvider)

    // Connect a signer
    await unirepContract.unlock(args.eth_privkey)

    await verifyUserSignUpProof(args)
    
    // Parse input
    const decodedProof = base64url.decode(args.proof.slice(signUpProofPrefix.length))
    const decodedPublicSignals = base64url.decode(args.public_signals.slice(signUpPublicSignalsPrefix.length))
    const publicSignals = JSON.parse(decodedPublicSignals)
    const epoch = publicSignals[0]
    const epk = publicSignals[1]
    const GSTRoot = publicSignals[2]
    const attesterId = publicSignals[3]
    const proof = JSON.parse(decodedProof)
    console.log(`Airdrop to epoch key ${epk} in attester ID ${attesterId}`)

    // Submit attestation
    const tx = await unirepContract.airdropEpochKey(epoch, epk, GSTRoot, attesterId, proof)
    const proofIndex = await unirepContract.getSignUpProofIndex([epoch, epk, GSTRoot, attesterId, proof])
    if(tx != undefined){
        console.log('Transaction hash:', tx?.hash)
        console.log('Proof index:', proofIndex.toNumber())
    }
}

export {
    giveAirdrop,
    configureSubparser,
}