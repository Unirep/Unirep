import base64url from 'base64url'
import { ethers } from 'ethers'
import { genIdentityCommitment, unSerialiseIdentity } from '@unirep/crypto'
import { formatProofForVerifierContract, verifyProof } from '@unirep/circuits'
import { getUnirepContract } from '@unirep/contracts'

import { validateEthAddress, contractExists, promptPwd, validateEthSk, checkDeployerProviderConnection } from './utils'
import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'
import { genUserStateFromContract } from '../core'
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

    // Unirep contract
    if (!validateEthAddress(args.contract)) {
        console.error('Error: invalid Unirep contract address')
        return
    }

    const unirepAddress = args.contract

    // Ethereum provider
    const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER

    let ethSk
    // The deployer's Ethereum private key
    // The user may either enter it as a command-line option or via the
    // standard input
    if (args.prompt_for_eth_privkey) {
        ethSk = await promptPwd('Your Ethereum private key')
    } else {
        ethSk = args.eth_privkey
    }

    if (!validateEthSk(ethSk)) {
        console.error('Error: invalid Ethereum private key')
        return
    }

    if (! (await checkDeployerProviderConnection(ethSk, ethProvider))) {
        console.error('Error: unable to connect to the Ethereum provider at', ethProvider)
        return
    }

    const provider = new ethers.providers.JsonRpcProvider(ethProvider)
    const wallet = new ethers.Wallet(ethSk, provider)

    if (! await contractExists(provider, unirepAddress)) {
        console.error('Error: there is no contract deployed at the specified address')
        return
    }

    const unirepContract = await getUnirepContract(unirepAddress, wallet)
    const startBlock = (args.start_block) ? args.start_block : DEFAULT_START_BLOCK


    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = unSerialiseIdentity(decodedIdentity)
    const commitment = genIdentityCommitment(id)

    const userState = await genUserStateFromContract(
        provider,
        unirepAddress,
        startBlock,
        id,
        commitment,
    )
    const results = await userState.genUserStateTransitionProofs()
    let isValid = await verifyProof('startTransition', results.startTransitionProof.proof, results.startTransitionProof.publicSignals)
    if (!isValid) {
        console.error('Error: start state transition proof generated is not valid!')
    }

    let tx
    try {
        console.log('submit start user state transition proof')
        tx = await unirepContract.startUserStateTransition(
            results.startTransitionProof.blindedUserState,
            results.startTransitionProof.blindedHashChain,
            results.startTransitionProof.globalStateTreeRoot,
            formatProofForVerifierContract(results.startTransitionProof.proof),
        )
    } catch(e) {
        console.error('Error: the transaction failed')
        if (e) {
            console.error(e)
        }
    }

    // process attestations proof
    for (let i = 0; i < results.processAttestationProofs.length; i++) {
        const isValid = await verifyProof('processAttestations', results.processAttestationProofs[i].proof, results.processAttestationProofs[i].publicSignals)
        if (!isValid) {
            console.error('Error: process attestations proof generated is not valid!')
        }

        try {
            console.log(`submit the ${i+1}th process attestations proof`)
            tx = await unirepContract.processAttestations(
                results.processAttestationProofs[i].outputBlindedUserState,
                results.processAttestationProofs[i].outputBlindedHashChain,
                results.processAttestationProofs[i].inputBlindedUserState,
                formatProofForVerifierContract(results.processAttestationProofs[i].proof),
            )
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
        }    
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

    try {
        console.log('submit final user state transition proof')
        tx = await unirepContract.updateUserStateRoot(
            results.finalTransitionProof.newGlobalStateTreeLeaf,
            results.finalTransitionProof.epochKeyNullifiers,
            results.finalTransitionProof.blindedUserStates,
            results.finalTransitionProof.blindedHashChains,
            results.finalTransitionProof.transitionedFromEpoch,
            results.finalTransitionProof.fromGSTRoot,
            results.finalTransitionProof.fromEpochTree,
            formatProofForVerifierContract(results.finalTransitionProof.proof),
        )
    } catch(e) {
        console.error('Error: the transaction failed')
        if (e) {
            console.error(e)
        }
    }

    console.log('Transaction hash:', tx.hash)
    const currentEpoch = (await unirepContract.currentEpoch()).toNumber()
    console.log(`User transitioned from epoch ${fromEpoch} to epoch ${currentEpoch}`)
    process.exit(0)
}

export {
    userStateTransition,
    configureSubparser,
}