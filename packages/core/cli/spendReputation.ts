import base64url from 'base64url'
import { ReputationProof, Unirep, UnirepFactory } from '@unirep/contracts'
import { formatProofForSnarkjsVerification } from '@unirep/circuits'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { verifyReputationProof } from './verifyReputationProof'
import { reputationProofPrefix, reputationPublicSignalsPrefix } from './prefix'
import { getProvider } from './utils'
import { ethers } from 'ethers'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('spendReputation', { add_help: true })

    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
    })

    parser.add_argument('-ep', '--epoch', {
        action: 'store',
        type: 'int',
        help: 'The latest epoch user transitioned to. Default: current epoch',
    })

    parser.add_argument('-p', '--public-signals', {
        required: true,
        type: 'str',
        help: "The snark public signals of the user's epoch key ",
    })

    parser.add_argument('-pf', '--proof', {
        required: true,
        type: 'str',
        help: "The snark proof of the user's epoch key ",
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

const spendReputation = async (args: any) => {
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

    await verifyReputationProof(args)

    // Parse Inputs
    const decodedProof = base64url.decode(
        args.proof.slice(reputationProofPrefix.length)
    )
    const decodedPublicSignals = base64url.decode(
        args.public_signals.slice(reputationPublicSignalsPrefix.length)
    )
    const proof = JSON.parse(decodedProof)
    const publicSignals = JSON.parse(decodedPublicSignals)
    const reputationProof = new ReputationProof(
        publicSignals,
        formatProofForSnarkjsVerification(proof),
        defaultProver
    )

    console.log(
        `User spends ${reputationProof.proveReputationAmount} reputation points from attester ${reputationProof.attesterId}`
    )

    // Submit reputation
    let tx: ethers.ContractTransaction
    try {
        tx = await unirepContract
            .connect(wallet)
            .spendReputation(
                reputationProof.publicSignals,
                reputationProof.proof,
                {
                    value: attestingFee,
                }
            )
        await tx.wait()
    } catch (error) {
        console.log('Transaction Error', error)
        return
    }

    const proofIndex = await unirepContract.getProofIndex(
        reputationProof.hash()
    )
    console.log('Transaction hash:', tx?.hash)
    console.log('Proof index:', proofIndex.toNumber())
}

export { spendReputation, configureSubparser }
