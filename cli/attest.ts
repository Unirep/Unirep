import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'

import {
    promptPwd,
    validateEthSk,
    validateEthAddress,
    checkDeployerProviderConnection,
    contractExists,
} from './utils'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'

import { add0x } from '../crypto/SMT'
import { Attestation, genUserStateFromContract } from '../core'

import Unirep from "../artifacts/contracts/Unirep.sol/Unirep.json"
import { identityPrefix, reputationNullifierProofPrefix } from './prefix'
import base64url from 'base64url'
import { genIdentityCommitment, stringifyBigInts, unSerialiseIdentity } from 'libsemaphore'
import { formatProofForVerifierContract, genVerifyReputationNullifierProofAndPublicSignals, getSignalByNameViaSym, verifyProveReputationNullifierProof } from '../test/circuits/utils'
import { maxKarmaBudget } from '../config/testLocal'
import { genEpochKey } from '../core/utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.add_parser(
        'attest',
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
        '-epk', '--epoch-key',
        {
            required: true,
            type: 'str',
            help: 'The user\'s epoch key to attest to (in hex representation)',
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
        '-n', '--epoch-key-nonce',
        {
            required: true,
            type: 'int',
            help: 'The attester\'s epoch key nonce',
        }
    )

    parser.add_argument(
        '-mr', '--min-rep',
        {
            type: 'int',
            help: 'The minimum reputation score the attester has',
        }
    )

    parser.add_argument(
        '-pr', '--pos-rep',
        {
            type: 'int',
            help: 'Score of positive reputation to give to the user',
        }
    )

    parser.add_argument(
        '-nr', '--neg-rep',
        {
            type: 'int',
            help: 'Score of negative reputation to give to the user',
        }
    )

    parser.add_argument(
        '-gf', '--graffiti',
        {
            action: 'store',
            type: 'str',
            help: 'Graffiti for the reputation given to the user (in hex representation)',
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

const attest = async (args: any) => {

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
    // Validate epoch key nonce
    const epkNonce = args.epoch_key_nonce
    const numEpochKeyNoncePerEpoch = await unirepContract.numEpochKeyNoncePerEpoch()
    if (epkNonce >= numEpochKeyNoncePerEpoch) {
        console.error('Error: epoch key nonce must be less than max epoch key nonce')
        return
    }

    // Generate reputation nullifier proof
    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = unSerialiseIdentity(decodedIdentity)
    const commitment = genIdentityCommitment(id)

    const toEpk = BigInt(add0x(args.epoch_key))
    const posRep = args.pos_rep ? BigInt(args.pos_rep) : BigInt(0)
    const negRep = args.neg_rep ? BigInt(args.neg_rep) : BigInt(0)
    const graffiti = args.graffiti ? BigInt(add0x(args.graffiti)) : BigInt(0)
    const overwriteGraffiti = args.graffiti ? true : false

    const attestingFee = await unirepContract.attestingFee()
    const ethAddr = ethers.utils.computeAddress(args.eth_privkey)
    const attesterId = await unirepContract.attesters(ethAddr)
    if (attesterId.toNumber() == 0) {
        console.error('Error: attester has not registered yet')
        return
    }
    const attestation = new Attestation(
        BigInt(attesterId),
        posRep,
        negRep,
        graffiti,
        overwriteGraffiti,
    )
    console.log(`Attesting to epoch key ${args.epoch_key} with pos rep ${args.pos_rep}, neg rep ${args.neg_rep} and graffiti ${graffiti.toString(16)} (overwrite graffit: ${overwriteGraffiti})`)
    const proveKarmaAmount = Number(posRep + negRep)
    const minRep = args.min_rep != null ? args.min_rep : 0

    const userState = await genUserStateFromContract(
        provider,
        unirepAddress,
        startBlock,
        id,
        commitment,
    )
    const circuitInputs = await userState.genProveReputationNullifierCircuitInputs(
        epkNonce,                       // generate epoch key from epoch nonce
        proveKarmaAmount,               // the amount of output karma nullifiers
        minRep                          // the amount of minimum reputation the user wants to prove
    )
    console.log('Proving epoch key...')
    console.log('----------------------User State----------------------')
    console.log(userState.toJSON(4))
    console.log('------------------------------------------------------')
    console.log('----------------------Circuit inputs----------------------')
    console.log(circuitInputs)
    console.log('----------------------------------------------------------')
    const results = await genVerifyReputationNullifierProofAndPublicSignals(stringifyBigInts(circuitInputs))

    // TODO: Not sure if this validation is necessary
    const isValid = await verifyProveReputationNullifierProof(results['proof'], results['publicSignals'])
    if(!isValid) {
        console.error('Error: reputation nullifier proof generated is not valid!')
        return
    }

    // generate public signals
    const epoch = userState.getUnirepStateCurrentEpoch()
    const fromEpochKey = genEpochKey(id.identityNullifier, epoch, epkNonce)
    const nullifiers: BigInt[] = []
    const GSTRoot = userState.getUnirepStateGSTree(epoch).root
    const nullifierTree = await userState.getUnirepStateNullifierTree()
    const nullifierTreeRoot = nullifierTree.getRootHash()
    for (let i = 0; i < maxKarmaBudget; i++) {
        const variableName = 'main.karma_nullifiers['+i+']'
        nullifiers.push(getSignalByNameViaSym('proveReputationNullifier', results['witness'], variableName))
    }
    const publicSignals = [
        GSTRoot,
        nullifierTreeRoot,
        BigInt(true),
        Number(attestation.posRep) + Number(attestation.negRep),
        BigInt(Boolean(minRep)),
        BigInt(minRep)
    ]
    
    let tx
    try {
        tx = await unirepContract.submitAttestation(
            attestation,
            fromEpochKey,
            toEpk,
            nullifiers,
            publicSignals,
            formatProofForVerifierContract(results['proof']),
            {value: attestingFee}
        )
    } catch(e) {
        console.error('Error: the transaction failed')
        if (e.message) {
            console.error(e.message)
        }
        return
    }

    const formattedProof = formatProofForVerifierContract(results["proof"])
    const encodedProof = base64url.encode(JSON.stringify(formattedProof))
    console.log(`Reputation nullifier proof: `)
    console.log(reputationNullifierProofPrefix + encodedProof)
    console.log('Transaction hash:', tx.hash)
}

export {
    attest,
    configureSubparser,
}