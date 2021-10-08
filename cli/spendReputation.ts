import base64url from 'base64url'
import { ethers } from 'ethers'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'
import { verifyReputationProof } from './verifyReputationProof'
import { genUnirepStateFromContract, UnirepContract } from '../core'
import { reputationProofPrefix, reputationPublicSignalsPrefix } from './prefix'
import { maxReputationBudget } from '../config/testLocal'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'spendReputation',
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
        '-ep', '--epoch',
        {
            action: 'store',
            type: 'int',
            help: 'The latest epoch user transitioned to. Default: current epoch',
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
        '-b', '--start-block',
        {
            action: 'store',
            type: 'int',
            help: 'The block the Unirep contract is deployed. Default: 0',
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

const spendReputation = async (args: any) => {

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER
    const provider = new ethers.providers.JsonRpcProvider(ethProvider)

    // Unirep contract
    const unirepContract = new UnirepContract(args.contract, ethProvider)

    // Connect a signer
    await unirepContract.unlock(args.eth_privkey)

    await verifyReputationProof(args)

    // Parse Inputs
    const decodedProof = base64url.decode(args.proof.slice(reputationProofPrefix.length))
    const decodedPublicSignals = base64url.decode(args.public_signals.slice(reputationPublicSignalsPrefix.length))
    const publicSignals = JSON.parse(decodedPublicSignals)
    const outputNullifiers = publicSignals.slice(0, maxReputationBudget)
    const epoch = publicSignals[maxReputationBudget]
    const epk = publicSignals[maxReputationBudget + 1]
    const GSTRoot = publicSignals[maxReputationBudget + 2]
    const attesterId = publicSignals[maxReputationBudget + 3]
    const repNullifiersAmount = publicSignals[maxReputationBudget + 4]
    const minRep = publicSignals[maxReputationBudget + 5]
    const proveGraffiti = publicSignals[maxReputationBudget + 6]
    const graffitiPreImage = publicSignals[maxReputationBudget + 7]
    const proof = JSON.parse(decodedProof)

    console.log(`User spends ${repNullifiersAmount} reputation points from attester ${attesterId}`)

    // Submit reputation
    const tx = await unirepContract.spendReputation(outputNullifiers,
        epoch,
        epk,
        GSTRoot,
        attesterId,
        repNullifiersAmount,
        minRep,
        proveGraffiti,
        graffitiPreImage,
        proof
    )
    if(tx != undefined) console.log('Transaction hash:', tx?.hash)
}

export {
    spendReputation,
    configureSubparser,
}