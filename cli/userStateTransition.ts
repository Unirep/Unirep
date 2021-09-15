import base64url from 'base64url'
import { BigNumber, ethers } from 'ethers'
import { genIdentityCommitment, unSerialiseIdentity, stringifyBigInts } from '@unirep/crypto'
import { formatProofForVerifierContract, genProofAndPublicSignals, verifyProof } from '@unirep/circuits'
import { getUnirepContract } from '@unirep/contracts'

import { validateEthAddress, contractExists, promptPwd, validateEthSk, checkDeployerProviderConnection } from './utils'
import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'
import { genUserStateFromContract } from '../core'
import { identityPrefix } from './prefix'
import { numEpochKeyNoncePerEpoch } from '../config/testLocal'

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

    const nullifierTreeDepth = BigNumber.from((await unirepContract.treeDepths())["nullifierTreeDepth"]).toNumber()

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

    const circuitInputs = await userState.genUserStateTransitionCircuitInputs()
    console.log('Proving user state transition...')
    console.log('----------------------User State----------------------')
    console.log(userState.toJSON(4))
    console.log('------------------------------------------------------')
    
    // start user state transition proof
    console.log('----------------------Circuit inputs----------------------')
    console.log(circuitInputs.startTransitionProof)
    console.log('----------------------------------------------------------')
    let results = await genProofAndPublicSignals('startTransition', stringifyBigInts(circuitInputs.startTransitionProof))
    let isValid = await verifyProof('startTransition', results['proof'], results['publicSignals'])
    if (!isValid) {
        console.error('Error: start state transition proof generated is not valid!')
        return
    }
    let blindedUserState = results['publicSignals'][0]
    let blindedHashChain = results['publicSignals'][1]
    const fromEpoch = userState.latestTransitionedEpoch
    const GSTreeRoot = userState.getUnirepStateGSTree(fromEpoch).root

    let tx
    try {
        tx = await unirepContract.startUserStateTransition(
            blindedUserState,
            blindedHashChain,
            GSTreeRoot,
            formatProofForVerifierContract(results['proof']),
        )
    } catch(e) {
        console.error('Error: the transaction failed')
        if (e) {
            console.error(e)
        }
    }

    // process attestations proof
    for (let i = 0; i < circuitInputs.processAttestationProof.length; i++) {
        console.log('----------------------Circuit inputs----------------------')
        console.log(circuitInputs.processAttestationProof[i])
        console.log('----------------------------------------------------------')
        results = await genProofAndPublicSignals('processAttestations', stringifyBigInts(circuitInputs.processAttestationProof[i]))
        const isValid = await verifyProof('processAttestations', results['proof'], results['publicSignals'])
        if (!isValid) {
            console.error('Error: process attestations proof generated is not valid!')
            return
        }

        const outputBlindedUserState = results['publicSignals'][0]
        const outputBlindedHashChain = results['publicSignals'][1]
        const inputBlindedUserState = results['publicSignals'][2]

        try {
            tx = await unirepContract.processAttestations(
                outputBlindedUserState,
                outputBlindedHashChain,
                inputBlindedUserState,
                formatProofForVerifierContract(results['proof']),
            )
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
        }    
    }

    // update user state proof
    console.log('----------------------Circuit inputs----------------------')
    console.log(circuitInputs.finalTransitionProof)
    console.log('----------------------------------------------------------')
    results = await genProofAndPublicSignals('userStateTransition', stringifyBigInts(circuitInputs.finalTransitionProof))
    const newGSTLeaf = results['publicSignals'][0]
    const newState = await userState.genNewUserStateAfterTransition()
    if (newGSTLeaf != newState.newGSTLeaf.toString()) {
        console.error('Error: Computed new GST leaf should match')
        return
    }
    isValid = await verifyProof('userStateTransition', results['proof'], results['publicSignals'])
    if (!isValid) {
        console.error('Error: user state transition proof generated is not valid!')
        return
    }

    const epochTreeRoot = (await userState.getUnirepStateEpochTree(fromEpoch)).getRootHash()
    const epkNullifiers = userState.getEpochKeyNullifiers(fromEpoch)

    // Verify nullifiers outputted by circuit are the same as the ones computed off-chain
    const outputEPKNullifiers: BigInt[] = []
    for (let i = 0; i < epkNullifiers.length; i++) {
        const outputNullifier = results['publicSignals'][1+i]
        const modedOutputNullifier = BigInt(outputNullifier) % BigInt(2 ** nullifierTreeDepth)
        if (modedOutputNullifier != epkNullifiers[i]) {
            console.error(`Error: nullifier outputted by circuit(${modedOutputNullifier}) does not match the ${i}-th computed attestation nullifier(${epkNullifiers[i]})`)
            return
        }
        outputEPKNullifiers.push(outputNullifier)
    }

    // blinded user states and hash chains
    const blindedUserStates: BigInt[] = results['publicSignals'].slice(2 + numEpochKeyNoncePerEpoch,2 + 2 * numEpochKeyNoncePerEpoch)
    const blindedHashChains: BigInt[] = results['publicSignals'].slice(3 + 2*numEpochKeyNoncePerEpoch,3 + 3*numEpochKeyNoncePerEpoch)

    try {
        tx = await unirepContract.updateUserStateRoot(
            newGSTLeaf,
            outputEPKNullifiers,
            blindedUserStates,
            blindedHashChains,
            fromEpoch,
            GSTreeRoot,
            epochTreeRoot,
            formatProofForVerifierContract(results['proof']),
        )
    } catch(e) {
        console.error('Error: the transaction failed')
        if (e) {
            console.error(e)
        }
        return
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