import { Contract, Wallet, providers } from 'ethers'
import { genIdentityCommitment, unSerialiseIdentity } from 'libsemaphore'

import {
    validateEthAddress,
    contractExists,
    promptPwd,
    validateEthSk,
    checkDeployerProviderConnection,
} from './utils'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'

import Unirep from "../artifacts/Unirep.json"
import { genUserStateFromContract } from '../core'
import { formatProofForVerifierContract, genVerifyUserStateTransitionProofAndPublicSignals, verifyUserStateTransitionProof } from '../test/circuits/utils'
import { stringifyBigInts } from 'maci-crypto'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.addParser(
        'userStateTransition',
        { addHelp: true },
    )

    parser.addArgument(
        ['-e', '--eth-provider'],
        {
            action: 'store',
            type: 'string',
            help: `A connection string to an Ethereum provider. Default: ${DEFAULT_ETH_PROVIDER}`,
        }
    )

    parser.addArgument(
        ['-id', '--identity'],
        {
            required: true,
            type: 'string',
            help: 'The (serialized) user\'s identity',
        }
    )

    parser.addArgument(
        ['-n', '--epoch-key-nonce'],
        {
            required: true,
            type: 'int',
            help: 'The epoch key nonce',
        }
    )

    parser.addArgument(
        ['-b', '--start-block'],
        {
            action: 'store',
            type: 'int',
            help: 'The block the Unirep contract is deployed. Default: 0',
        }
    )

    parser.addArgument(
        ['-x', '--contract'],
        {
            required: true,
            type: 'string',
            help: 'The Unirep contract address',
        }
    )

    const privkeyGroup = parser.addMutuallyExclusiveGroup({ required: true })

    privkeyGroup.addArgument(
        ['-dp', '--prompt-for-eth-privkey'],
        {
            action: 'storeTrue',
            help: 'Whether to prompt for the user\'s Ethereum private key and ignore -d / --eth-privkey',
        }
    )

    privkeyGroup.addArgument(
        ['-d', '--eth-privkey'],
        {
            action: 'store',
            type: 'string',
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

    const provider = new providers.JsonRpcProvider(ethProvider)
    const wallet = new Wallet(ethSk, provider)

    if (! await contractExists(provider, unirepAddress)) {
        console.error('Error: there is no contract deployed at the specified address')
        return
    }

    const unirepContract = new Contract(
        unirepAddress,
        Unirep.abi,
        wallet,
    )
    const startBlock = (args.start_block) ? args.start_block : DEFAULT_START_BLOCK

    // Validate epoch key nonce
    const epkNonce = args.epoch_key_nonce
    const maxEpochKeyNonce = await unirepContract.maxEpochKeyNonce()
    if (epkNonce > maxEpochKeyNonce) {
        console.error('Epoch key nonce exceeds max epoch key nonce')
        return
    }

    // Gen epoch key
    const id = unSerialiseIdentity(args.identity)
    const commitment = genIdentityCommitment(id)

    // Gen epoch key proof
    const userState = await genUserStateFromContract(
        provider,
        unirepAddress,
        startBlock,
        id,
        commitment,
    )

    const circuitInputs = await userState.genUserStateTransitionCircuitInputs(epkNonce)
    const results = await genVerifyUserStateTransitionProofAndPublicSignals(stringifyBigInts(circuitInputs))
    const isValid = await verifyUserStateTransitionProof(results['proof'], results['publicSignals'])
    if(!isValid) {
        console.error('Error: user state transition proof generated is not valid!')
    }

    const fromEpoch = userState.latestTransitionedEpoch
    const GSTreeRoot = userState.getUnirepStateGSTree(fromEpoch).root
    const epochTreeRoot = (await userState.getUnirepStateEpochTree(fromEpoch)).getRootHash()
    const oldNullifierTreeRoot = (await userState.getUnirepStateNullifierTree()).getRootHash()
    const nullifiers = userState.getNullifiers(fromEpoch, epkNonce)
    const noAttestationNullifier = userState.getNoAttestationsNullifier(fromEpoch, epkNonce)
    const newGSTLeaf = (await userState.genNewUserStateAfterTransition(epkNonce)).newGSTLeaf
    let tx
    try {
        tx = await unirepContract.updateUserStateRoot(
            newGSTLeaf,
            nullifiers,
            noAttestationNullifier,
            fromEpoch,
            GSTreeRoot,
            epochTreeRoot,
            oldNullifierTreeRoot,
            formatProofForVerifierContract(results['proof']),
        )
    } catch(e) {
        console.error('Error: the transaction failed')
        if (e.message) {
            console.error(e.message)
        }
        return
    }
    
    const currentEpoch = (await unirepContract.currentEpoch()).toNumber()
    console.log('Transaction hash:', tx.hash)
    console.log(`User transitioned from epoch ${fromEpoch} to epoch ${currentEpoch}`)
}

export {
    userStateTransition,
    configureSubparser,
}