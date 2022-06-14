import base64url from 'base64url'
import { ethers } from 'ethers'
import { ZkIdentity, Strategy } from '@unirep/crypto'
import {
    Circuit,
    formatProofForVerifierContract,
    verifyProof,
} from '@unirep/circuits'
import { ProcessAttestationsProof, StartTransitionProof, Unirep, UnirepFactory, UserTransitionProof } from '@unirep/contracts'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { genUserState } from '../src'
import { identityPrefix } from './prefix'
import { getProvider } from './utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser('userStateTransition', {
        add_help: true,
    })

    parser.add_argument('-e', '--eth-provider', {
        action: 'store',
        type: 'str',
        help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
    })

    parser.add_argument('-id', '--identity', {
        required: true,
        type: 'str',
        help: "The (serialized) user's identity",
    })

    parser.add_argument('-x', '--contract', {
        required: true,
        type: 'str',
        help: 'The Unirep contract address',
    })

    parser.add_argument('-d', '--eth-privkey', {
        action: 'store',
        type: 'str',
        help: "The user's Ethereum private key",
    })
}

const userStateTransition = async (args: any) => {
    // Ethereum provider
    const ethProvider = args.eth_provider ?? DEFAULT_ETH_PROVIDER
    const provider = getProvider(ethProvider)

    // Unirep contract
    const unirepContract: Unirep = UnirepFactory.connect(
        args.contract,
        provider
    )

    // Connect a signer
    const wallet = new ethers.Wallet(args.eth_privkey, provider)

    // Parse inputs
    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = new ZkIdentity(Strategy.SERIALIZED, decodedIdentity)

    // Generate user state transition proofs
    const userState = await genUserState(provider, args.contract, id)
    const {
        startTransitionProof,
        processAttestationProofs,
        finalTransitionProof,
    } = await userState.genUserStateTransitionProofs()

    // Record all proof indexes
    const proofIndexes: ethers.BigNumber[] = []

    // Start user state transition proof
    {
        const input = new StartTransitionProof(
            startTransitionProof.publicSignals,
            startTransitionProof.proof
        )
        const isValid = await input.verify()
        if (!isValid) {
            console.error(
                'Error: start state transition proof generated is not valid!'
            )
        }

        let tx: ethers.ContractTransaction
        try {
            tx = await unirepContract
                .connect(wallet)
                .startUserStateTransition(
                    input.publicSignals,
                    input.proof
                )
            await tx.wait()
        } catch (error) {
            console.log('Transaction Error', error)
            return
        }
        console.log('Transaction hash:', tx.hash)

        const proofHash = await unirepContract.hashProof(
            input.publicSignals,
            input.proof
        )
        const proofIndex = await unirepContract.getProofIndex(proofHash)
        proofIndexes.push(proofIndex)
    }

    // process attestations proof
    for (let i = 0; i < processAttestationProofs.length; i++) {
        const input = new ProcessAttestationsProof(
            processAttestationProofs[i].publicSignals,
            processAttestationProofs[i].proof
        )
        const isValid = await input.verify()
        if (!isValid) {
            console.error(
                'Error: process attestations proof generated is not valid!'
            )
        }

        let tx: ethers.ContractTransaction
        try {
            tx = await unirepContract
                .connect(wallet)
                .processAttestations(
                    input.publicSignals,
                    input.proof,
                )
            await tx.wait()
        } catch (error) {
            console.log('Transaction Error', error)
            return
        }
        console.log('Transaction hash:', tx.hash)

        const proofHash = await unirepContract.hashProof(
            input.publicSignals,
            input.proof
        )
        const proofIndex = await unirepContract.getProofIndex(proofHash)
        proofIndexes.push(proofIndex)
    }


    // update user state proof
    const input = new UserTransitionProof(
        finalTransitionProof.publicSignals,
        finalTransitionProof.proof
    )
    const isValid = await input.verify()
    if (!isValid) {
        console.error(
            'Error: user state transition proof generated is not valid!'
        )
    }

    const fromEpoch = Number(input.transitionFromEpoch)
    const epkNullifiers = userState.getEpochKeyNullifiers(fromEpoch)

    // Verify nullifiers outputted by circuit are the same as the ones computed off-chain
    for (let i = 0; i < epkNullifiers.length; i++) {
        const outputNullifier = BigInt(input.epkNullifiers[i].toString())
        if (outputNullifier != epkNullifiers[i]) {
            console.error(
                `Error: nullifier outputted by circuit(${outputNullifier}) does not match the ${i}-th computed attestation nullifier(${epkNullifiers[i]})`
            )
        }
    }

    // Check if Global state tree root and epoch tree root exist
    const GSTRoot = input.fromGlobalStateTree.toString()
    const epochTreeRoot = input.fromEpochTree.toString()
    const isGSTRootExisted = userState.GSTRootExists(GSTRoot, fromEpoch)
    const isEpochTreeExisted = await userState.epochTreeRootExists(
        epochTreeRoot,
        fromEpoch
    )
    if (!isGSTRootExisted) {
        console.error('Error: invalid global state tree root')
        return
    }
    if (!isEpochTreeExisted) {
        console.error('Error: invalid epoch tree root')
        return
    }
    // Check if nullifiers submitted before
    for (const nullifier of epkNullifiers) {
        if (userState.nullifierExist(nullifier)) {
            console.error('Error: nullifier submitted before')
            return
        }
    }

    // Submit the user state transition transaction
    let tx: ethers.ContractTransaction
    try {
        tx = await unirepContract
            .connect(wallet)
            .updateUserStateRoot(input.publicSignals, input.proof, proofIndexes)
        await tx.wait()
    } catch (error) {
        console.log('Transaction Error', error)
        return
    }

    console.log('Transaction hash:', tx?.hash)
    const currentEpoch = await unirepContract.currentEpoch()
    console.log(
        `User transitioned from epoch ${fromEpoch} to epoch ${currentEpoch}`
    )
}

export { userStateTransition, configureSubparser }
