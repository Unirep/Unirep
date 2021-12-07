import base64url from 'base64url'
import { ethers } from 'ethers'
import { unSerialiseIdentity } from '@unirep/crypto'
import { CircuitName, verifyProof } from '@unirep/circuits'

import { DEFAULT_ETH_PROVIDER } from './defaults'
import { genUserStateFromContract, UnirepContract } from '../core'
import { identityPrefix } from './prefix'

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
    const results = await userState.genUserStateTransitionProofs()
    const proofIndexes: BigInt[] = []

    // Start user state transition proof
    let isValid = await verifyProof(CircuitName.startTransition, results.startTransitionProof.proof, results.startTransitionProof.publicSignals)
    if (!isValid) {
        console.error('Error: start state transition proof generated is not valid!')
    }
    let tx = await unirepContract.startUserStateTransition(
        results.startTransitionProof.blindedUserState,
        results.startTransitionProof.blindedHashChain,
        results.startTransitionProof.globalStateTreeRoot,
        results.startTransitionProof.proof,
    )
    console.log('Transaction hash:', tx?.hash)
    await tx.wait()
    const proofIndex = await unirepContract.getStartTransitionProofIndex(
        results.startTransitionProof.blindedUserState,
        results.startTransitionProof.blindedHashChain,
        results.startTransitionProof.globalStateTreeRoot,
        results.startTransitionProof.proof,
    )
    proofIndexes.push(BigInt(proofIndex))

    // process attestations proof
    for (let i = 0; i < results.processAttestationProofs.length; i++) {
        const isValid = await verifyProof(CircuitName.processAttestations, results.processAttestationProofs[i].proof, results.processAttestationProofs[i].publicSignals)
        if (!isValid) {
            console.error('Error: process attestations proof generated is not valid!')
        }

        tx = await unirepContract.processAttestations(
            results.processAttestationProofs[i].outputBlindedUserState,
            results.processAttestationProofs[i].outputBlindedHashChain,
            results.processAttestationProofs[i].inputBlindedUserState,
            results.processAttestationProofs[i].proof,
        )
        console.log('Transaction hash:', tx?.hash)
        await tx.wait()
        const proofIndex = await unirepContract.getProcessAttestationsProofIndex(
            results.processAttestationProofs[i].outputBlindedUserState,
            results.processAttestationProofs[i].outputBlindedHashChain,
            results.processAttestationProofs[i].inputBlindedUserState,
            results.processAttestationProofs[i].proof,
        )
        proofIndexes.push(BigInt(proofIndex))
    }

    // update user state proof
    const newGSTLeaf = results.finalTransitionProof.newGlobalStateTreeLeaf
    const newState = await userState.genNewUserStateAfterTransition()
    if (newGSTLeaf != newState.newGSTLeaf.toString()) {
        console.error('Error: Computed new GST leaf should match')
    }
    isValid = await verifyProof(CircuitName.userStateTransition, results.finalTransitionProof.proof, results.finalTransitionProof.publicSignals)
    if (!isValid) {
        console.error('Error: user state transition proof generated is not valid!')
    }

    const fromEpoch = results.finalTransitionProof.transitionedFromEpoch
    const epkNullifiers = userState.getEpochKeyNullifiers(fromEpoch)

    // Verify nullifiers outputted by circuit are the same as the ones computed off-chain
    for (let i = 0; i < epkNullifiers.length; i++) {
        const outputNullifier = results.finalTransitionProof.epochKeyNullifiers[i]
        if (outputNullifier != epkNullifiers[i]) {
            console.error(`Error: nullifier outputted by circuit(${outputNullifier}) does not match the ${i}-th computed attestation nullifier(${epkNullifiers[i]})`)
        }
    }

    // Check if Global state tree root and epoch tree root exist
    const GSTRoot = results.finalTransitionProof.fromGSTRoot
    const inputEpoch = results.finalTransitionProof.transitionedFromEpoch
    const epochTreeRoot= results.finalTransitionProof.fromEpochTree
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
    tx = await unirepContract.updateUserStateRoot(
        results.finalTransitionProof.newGlobalStateTreeLeaf,
        results.finalTransitionProof.epochKeyNullifiers,
        results.finalTransitionProof.blindedUserStates,
        results.finalTransitionProof.blindedHashChains,
        results.finalTransitionProof.transitionedFromEpoch,
        results.finalTransitionProof.fromGSTRoot,
        results.finalTransitionProof.fromEpochTree,
        results.finalTransitionProof.proof,
        proofIndexes,
    )
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