import base64url from 'base64url'
import { BigNumberish, ethers } from 'ethers'
import { unSerialiseIdentity } from '@unirep/crypto'
import { Circuit, verifyProof } from '@unirep/circuits'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { genUserStateFromContract, UnirepContract } from '../core'
import { identityPrefix } from './prefix'
import { UserTransitionProof } from '@unirep/contracts'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'userStateTransition',
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
        '-id', '--identity',
        {
            required: true,
            type: 'str',
            help: 'The (serialized) user\'s identity',
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
        '-d', '--eth-privkey',
        {
            action: 'store',
            type: 'str',
            help: 'The user\'s Ethereum private key',
        }
    )
}

const userStateTransition = async (args: any) => {

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER
    const provider = new ethers.providers.JsonRpcProvider(ethProvider)

    // Unirep contract
    const unirepContract = new UnirepContract(args.contract, ethProvider)

    // Connect a signer
    await unirepContract.unlock(args.eth_privkey)

    // Parse inputs
    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = unSerialiseIdentity(decodedIdentity)

    // Generate user state transition proofs
    const userState = await genUserStateFromContract(
        provider,
        args.contract,
        id,
    )
    const {
        startTransitionProof,
        processAttestationProofs,
        finalTransitionProof
    } = await userState.genUserStateTransitionProofs()

    // Start user state transition proof
    let isValid = await verifyProof(Circuit.startTransition, startTransitionProof.proof, startTransitionProof.publicSignals)
    if (!isValid) {
        console.error('Error: start state transition proof generated is not valid!')
    }
    let tx = await unirepContract.startUserStateTransition(
        startTransitionProof.blindedUserState,
        startTransitionProof.blindedHashChain,
        startTransitionProof.globalStateTreeRoot,
        startTransitionProof.proof,
    )
    console.log('Transaction hash:', tx?.hash)
    await tx.wait()

    // process attestations proof
    for (let i = 0; i < processAttestationProofs.length; i++) {
        const isValid = await verifyProof(Circuit.processAttestations, processAttestationProofs[i].proof, processAttestationProofs[i].publicSignals)
        if (!isValid) {
            console.error('Error: process attestations proof generated is not valid!')
        }

        tx = await unirepContract.processAttestations(
            processAttestationProofs[i].outputBlindedUserState,
            processAttestationProofs[i].outputBlindedHashChain,
            processAttestationProofs[i].inputBlindedUserState,
            processAttestationProofs[i].proof,
        )
        console.log('Transaction hash:', tx?.hash)
        await tx.wait()
    }

    // Record all proof indexes
    const proofIndexes: BigInt[] = []
    const proofIndex = await unirepContract.getStartTransitionProofIndex(
        startTransitionProof.blindedUserState,
        startTransitionProof.blindedHashChain,
        startTransitionProof.globalStateTreeRoot,
        startTransitionProof.proof,
    )
    proofIndexes.push(BigInt(proofIndex))
    for (let i = 0; i < processAttestationProofs.length; i++) {
        const proofIndex = await unirepContract.getProcessAttestationsProofIndex(
            processAttestationProofs[i].outputBlindedUserState,
            processAttestationProofs[i].outputBlindedHashChain,
            processAttestationProofs[i].inputBlindedUserState,
            processAttestationProofs[i].proof,
        )
        proofIndexes.push(BigInt(proofIndex))
    }

    // update user state proof
    isValid = await verifyProof(Circuit.userStateTransition, finalTransitionProof.proof, finalTransitionProof.publicSignals)
    if (!isValid) {
        console.error('Error: user state transition proof generated is not valid!')
    }

    const fromEpoch = finalTransitionProof.transitionedFromEpoch
    const epkNullifiers = userState.getEpochKeyNullifiers(fromEpoch)

    // Verify nullifiers outputted by circuit are the same as the ones computed off-chain
    for (let i = 0; i < epkNullifiers.length; i++) {
        const outputNullifier = finalTransitionProof.epochKeyNullifiers[i]
        if (outputNullifier != epkNullifiers[i]) {
            console.error(`Error: nullifier outputted by circuit(${outputNullifier}) does not match the ${i}-th computed attestation nullifier(${epkNullifiers[i]})`)
        }
    }

    // Check if Global state tree root and epoch tree root exist
    const GSTRoot = finalTransitionProof.fromGSTRoot
    const inputEpoch = finalTransitionProof.transitionedFromEpoch
    const epochTreeRoot= finalTransitionProof.fromEpochTree
    const isGSTRootExisted = userState.GSTRootExists(GSTRoot, inputEpoch)
    const isEpochTreeExisted = await userState.epochTreeRootExists(epochTreeRoot, inputEpoch)
    if(!isGSTRootExisted) {
        console.error('Error: invalid global state tree root')
        return
    }
    if(!isEpochTreeExisted){
        console.error('Error: invalid epoch tree root')
        return
    }
    // Check if nullifiers submitted before
    for (const nullifier of epkNullifiers) {
        if(userState.nullifierExist(nullifier)){
            console.error('Error: nullifier submitted before')
            return
        }
    }

    // Submit the user state transition transaction
    const USTProof = new UserTransitionProof(
        finalTransitionProof.publicSignals,
        finalTransitionProof.proof
    )
    tx = await unirepContract.updateUserStateRoot(USTProof,proofIndexes as BigNumberish[])
    if(tx != undefined) {
        await tx.wait()
        console.log('Transaction hash:', tx?.hash)
        const currentEpoch = await unirepContract.currentEpoch()
        console.log(`User transitioned from epoch ${fromEpoch} to epoch ${currentEpoch}`)
    }
}

export {
    userStateTransition,
    configureSubparser,
}