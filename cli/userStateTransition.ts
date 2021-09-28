import base64url from 'base64url'
import { ethers } from 'ethers'
import { genIdentityCommitment, unSerialiseIdentity } from '@unirep/crypto'
import { verifyProof } from '@unirep/circuits'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'
import { genUnirepStateFromContract, genUserStateFromContract, UnirepContract } from '../core'
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

const userStateTransition = async (args: any) => {

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER
    const provider = new ethers.providers.JsonRpcProvider(ethProvider)

    // Unirep contract
    const unirepContract = new UnirepContract(args.contract, ethProvider)

    // Connect a signer
    await unirepContract.unlock(args.eth_privkey)
    const startBlock = (args.start_block) ? args.start_block : DEFAULT_START_BLOCK

    // Parse inputs
    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = unSerialiseIdentity(decodedIdentity)
    const commitment = genIdentityCommitment(id)

    // Generate user state transition proofs
    const userState = await genUserStateFromContract(
        provider,
        args.contract,
        startBlock,
        id,
        commitment,
    )
    const results = await userState.genUserStateTransitionProofs()

    // Start user state transition proof
    let isValid = await verifyProof('startTransition', results.startTransitionProof.proof, results.startTransitionProof.publicSignals)
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

    // process attestations proof
    for (let i = 0; i < results.processAttestationProofs.length; i++) {
        const isValid = await verifyProof('processAttestations', results.processAttestationProofs[i].proof, results.processAttestationProofs[i].publicSignals)
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
    }

    // update user state proof
    const newGSTLeaf = results.finalTransitionProof.newGlobalStateTreeLeaf
    const newState = await userState.genNewUserStateAfterTransition()
    if (newGSTLeaf != newState.newGSTLeaf.toString()) {
        console.error('Error: Computed new GST leaf should match')
    }
    isValid = await verifyProof('userStateTransition', results.finalTransitionProof.proof, results.finalTransitionProof.publicSignals)
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
    const unirepState = await genUnirepStateFromContract(
        provider,
        args.contract,
        startBlock,
    )
    const GSTRoot = results.finalTransitionProof.fromGSTRoot
    const inputEpoch = results.finalTransitionProof.transitionedFromEpoch
    const epochTreeRoot= results.finalTransitionProof.fromEpochTree
    const isGSTRootExisted = unirepState.GSTRootExists(GSTRoot, inputEpoch)
    const isEpochTreeExisted = unirepState.epochTreeRootExists(epochTreeRoot, inputEpoch)
    if(!isGSTRootExisted) {
        console.error('Error: invalid global state tree root')
        return
    }
    if(!isEpochTreeExisted){
        console.error('Error: invalid epoch tree root')
        return
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
    )
    console.log('Transaction hash:', tx?.hash)
    const currentEpoch = await unirepContract.currentEpoch()
    console.log(`User transitioned from epoch ${fromEpoch} to epoch ${currentEpoch}`)
    process.exit(0)
}

export {
    userStateTransition,
    configureSubparser,
}