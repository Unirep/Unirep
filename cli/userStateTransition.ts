import base64url from 'base64url'
import { ethers as hardhatEthers } from 'hardhat'
import { BigNumber, ethers } from 'ethers'
import { genIdentityCommitment, unSerialiseIdentity } from 'libsemaphore'

import {
    validateEthAddress,
    contractExists,
    promptPwd,
    validateEthSk,
    checkDeployerProviderConnection,
} from './utils'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'

import Unirep from "../artifacts/contracts/Unirep.sol/Unirep.json"
import { genUserStateFromContract } from '../core'
import { formatProofForVerifierContract, genVerifyUserStateTransitionProofAndPublicSignals, getSignalByNameViaSym, verifyUserStateTransitionProof } from '../circuits/utils'
import { stringifyBigInts } from 'maci-crypto'
import { identityPrefix } from './prefix'
import { genUserStateTransitionCircuitInputsFromDB } from '../database/utils'

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

    parser.addArgument(
        ['-db', '--from-database'],
        {
            action: 'storeTrue',
            help: 'Indicate if to generate proving circuit from database',
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

    const provider = new hardhatEthers.providers.JsonRpcProvider(ethProvider)
    const wallet = new ethers.Wallet(ethSk, provider)

    if (! await contractExists(provider, unirepAddress)) {
        console.error('Error: there is no contract deployed at the specified address')
        return
    }

    const unirepContract = new ethers.Contract(
        unirepAddress,
        Unirep.abi,
        wallet,
    )
    const startBlock = (args.start_block) ? args.start_block : DEFAULT_START_BLOCK

    const nullifierTreeDepth = BigNumber.from((await unirepContract.treeDepths())["nullifierTreeDepth"]).toNumber()

    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = unSerialiseIdentity(decodedIdentity)
    const commitment = genIdentityCommitment(id)
    const currentEpoch = (await unirepContract.currentEpoch()).toNumber()

    const userState = await genUserStateFromContract(
        provider,
        unirepAddress,
        startBlock,
        id,
        commitment,
    )

    let circuitInputs: any

    if(args.from_database){
        console.log('generating proving circuit from database...')

        circuitInputs = await genUserStateTransitionCircuitInputsFromDB(
            currentEpoch,
            id
        )
    } else {

        console.log('generating proving circuit from contract...')

        circuitInputs = await userState.genUserStateTransitionCircuitInputs()

    }
    const results = await genVerifyUserStateTransitionProofAndPublicSignals(stringifyBigInts(circuitInputs))
    const newGSTLeaf = getSignalByNameViaSym('userStateTransition', results['witness'], 'main.new_GST_leaf')
    const newState = await userState.genNewUserStateAfterTransition()
    if (newGSTLeaf != newState.newGSTLeaf) {
        console.error('Error: Computed new GST leaf should match')
        return
    }
    
    const isValid = await verifyUserStateTransitionProof(results['proof'], results['publicSignals'])
    if (!isValid) {
        console.error('Error: user state transition proof generated is not valid!')
        return
    }

    const fromEpoch = userState.latestTransitionedEpoch
    const GSTreeRoot = userState.getUnirepStateGSTree(fromEpoch).root
    const epochTreeRoot = (await userState.getUnirepStateEpochTree(fromEpoch)).getRootHash()
    const nullifierTreeRoot = (await userState.getUnirepStateNullifierTree()).getRootHash()
    const attestationNullifiers = userState.getAttestationNullifiers(fromEpoch)
    const epkNullifiers = userState.getEpochKeyNullifiers(fromEpoch)
    // Verify nullifiers outputted by circuit are the same as the ones computed off-chain
    const outputAttestationNullifiers: BigInt[] = []
    for (let i = 0; i < attestationNullifiers.length; i++) {
        const outputNullifier = getSignalByNameViaSym('userStateTransition', results['witness'], 'main.nullifiers[' + i + ']')
        const modedOutputNullifier = BigInt(outputNullifier) % BigInt(2 ** nullifierTreeDepth)
        if (modedOutputNullifier != attestationNullifiers[i]) {
            console.error(`Error: nullifier outputted by circuit(${modedOutputNullifier}) does not match the ${i}-th computed attestation nullifier(${attestationNullifiers[i]})`)
            return
        }
        outputAttestationNullifiers.push(outputNullifier)
    }
    const outputEPKNullifiers: BigInt[] = []
    for (let i = 0; i < epkNullifiers.length; i++) {
        const outputNullifier = getSignalByNameViaSym('userStateTransition', results['witness'], 'main.epoch_key_nullifier[' + i + ']')
        const modedOutputNullifier = BigInt(outputNullifier) % BigInt(2 ** nullifierTreeDepth)
        if (modedOutputNullifier != epkNullifiers[i]) {
            console.error(`Error: nullifier outputted by circuit(${modedOutputNullifier}) does not match the ${i}-th computed attestation nullifier(${epkNullifiers[i]})`)
            return
        }
        outputEPKNullifiers.push(outputNullifier)
    }

    let tx
    try {
        tx = await unirepContract.updateUserStateRoot(
            newGSTLeaf,
            outputAttestationNullifiers,
            outputEPKNullifiers,
            fromEpoch,
            GSTreeRoot,
            epochTreeRoot,
            nullifierTreeRoot,
            formatProofForVerifierContract(results['proof']),
        )
    } catch(e) {
        console.error('Error: the transaction failed')
        if (e.message) {
            console.error(e.message)
        }
        return
    }

    console.log('Transaction hash:', tx.hash)
    console.log(`User transitioned from epoch ${fromEpoch} to epoch ${currentEpoch}`)        
}

export {
    userStateTransition,
    configureSubparser,
}