import base64url from 'base64url'
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import { genIdentityCommitment, unSerialiseIdentity } from 'libsemaphore'

import {
    promptPwd,
    validateEthSk,
    validateEthAddress,
    checkDeployerProviderConnection,
    contractExists,
} from './utils'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'
import { dbUri } from '../config/database';

import { add0x } from '../crypto/SMT'
import { genUnirepStateFromContract, genUserStateFromContract } from '../core'

import Unirep from "../artifacts/contracts/Unirep.sol/Unirep.json"
import { epkProofPrefix, identityPrefix } from './prefix'

import Comment, { IComment } from "../database/models/comment";
import Post, { IPost } from "../database/models/post";
import mongoose from 'mongoose'
import { DEFAULT_COMMENT_KARMA } from '../config/socialMedia'
import { formatProofForVerifierContract, genVerifyReputationProofAndPublicSignals, getSignalByNameViaSym, verifyProveReputationProof } from '../test/circuits/utils'
import { stringifyBigInts } from 'maci-crypto'
import { nullifierTreeDepth } from '../config/testLocal'
import { genEpochKey } from '../test/utils'

const configureSubparser = (subparsers: any) => {
    const parser = subparsers.addParser(
        'leaveComment',
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
        ['-tx', '--text'],
        {
            required: true,
            type: 'string',
            help: 'The text written in the post',
        }
    )

    parser.addArgument(
        ['-pid', '--post-id'],
        {
            required: true,
            type: 'string',
            help: 'The post id where the comment replies to (in decimal representation)',
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
        ['-kn', '--karma-nonce'],
        {
            required: true,
            type: 'int',
            help: `The first nonce to generate karma nullifiers. It will generate ${DEFAULT_COMMENT_KARMA} nullifiers`,
        }
    )

    parser.addArgument(
        ['-mr', '--min-rep'],
        {
            type: 'int',
            help: 'The minimum reputation score the user has',
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

const leaveComment = async (args: any) => {

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

    const startBlock = (args.start_block) ? args.start_block : DEFAULT_START_BLOCK
    const unirepContract = new ethers.Contract(
        unirepAddress,
        Unirep.abi,
        wallet,
    )
    const attestingFee = await unirepContract.attestingFee()

    const unirepState = await genUnirepStateFromContract(
        provider,
        unirepAddress,
        startBlock,
    )

    // Validate epoch key nonce
    const epkNonce = args.epoch_key_nonce
    const numEpochKeyNoncePerEpoch = await unirepContract.numEpochKeyNoncePerEpoch()
    if (epkNonce >= numEpochKeyNoncePerEpoch) {
        console.error('Error: epoch key nonce must be less than max epoch key nonce')
        return
    }
    const encodedIdentity = args.identity.slice(identityPrefix.length)
    const decodedIdentity = base64url.decode(encodedIdentity)
    const id = unSerialiseIdentity(decodedIdentity)
    const commitment = genIdentityCommitment(id)
    const currentEpoch = (await unirepContract.currentEpoch()).toNumber()
    const treeDepths = await unirepContract.treeDepths()
    const epochTreeDepth = treeDepths.epochTreeDepth
    const epk = genEpochKey(id.identityNullifier, currentEpoch, epkNonce, epochTreeDepth).toString(16)

    // Gen epoch key proof and reputation proof
    const userState = await genUserStateFromContract(
       provider,
       unirepAddress,
       startBlock,
       id,
       commitment,
    )
    
    // gen nullifier nonce list
    const proveKarmaNullifiers = BigInt(1)
    const proveKarmaAmount = BigInt(DEFAULT_COMMENT_KARMA)
    const nonceStarter: number = args.karma_nonce
    const nonceList: BigInt[] = []
    for (let i = 0; i < DEFAULT_COMMENT_KARMA; i++) {
        nonceList.push( BigInt(nonceStarter + i) )
    }

    // gen minRep proof
    const proveMinRep = args.min_rep != null ? BigInt(1) : BigInt(0)
    const minRep = args.min_rep != null ? BigInt(args.min_rep) : BigInt(0)

    const circuitInputs = await userState.genProveReputationCircuitInputs(
        epkNonce,                       // generate epoch key from epoch nonce
        proveKarmaNullifiers,                      // indicate to prove karma nullifiers
        proveKarmaAmount,     // the amount of output karma nullifiers
        nonceList,                      // nonce to generate karma nullifiers
        proveMinRep,                    // indicate to prove minimum reputation the user has
        minRep                          // the amount of minimum reputation the user wants to prove
    )

    const results = await genVerifyReputationProofAndPublicSignals(stringifyBigInts(circuitInputs))
    const nullifiers: BigInt[] = [] 
    
    for (let i = 0; i < DEFAULT_COMMENT_KARMA; i++) {
        const variableName = 'main.karma_nullifiers['+i+']'
        nullifiers.push(getSignalByNameViaSym('proveReputation', results['witness'], variableName) % BigInt(2 ** nullifierTreeDepth) )
    }
    
    // TODO: Not sure if this validation is necessary
    const isValid = await verifyProveReputationProof(results['proof'], results['publicSignals'])
    if(!isValid) {
        console.error('Error: reputation proof generated is not valid!')
        return
    }

    const proof = formatProofForVerifierContract(results['proof'])
    const epochKey = BigInt(add0x(epk))
    const publicSignals = results['publicSignals']

    const db = await mongoose.connect(
        dbUri, 
        { useNewUrlParser: true, 
          useFindAndModify: false, 
          useUnifiedTopology: true
        }
    )

    const newComment: IComment = new Comment({
        content: args.text,
        // TODO: hashedContent
        epochKey: epk,
        epkProof: base64url.encode(JSON.stringify(proof)),
        proveMinRep: Boolean(proveMinRep),
        minRep: Number(minRep),
        comments: [],
        status: 0
    });

    let tx
    try {
        tx = await unirepContract.leaveComment(
            BigInt(add0x(args.post_id)),
            BigInt(add0x(newComment._id.toString())), 
            epochKey,
            args.text,
            publicSignals,
            proof,
            nullifiers,
            { value: attestingFee, gasLimit: 1000000 }
        )

        const commentRes = await Post.findByIdAndUpdate(
            {_id: mongoose.Types.ObjectId(args.post_id) }, 
            { $push: {comments: newComment }}
        )

    } catch(e) {
        console.error('Error: the transaction failed')
        if (e.message) {
            console.error(e.message)
        }
        return
    }

    db.disconnect();
    const receipt = await tx.wait()
    console.log('Transaction hash:', tx.hash)
}

export {
    leaveComment,
    configureSubparser,
}
