import base64url from 'base64url'
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'

import {
    promptPwd,
    validateEthSk,
    validateEthAddress,
    checkDeployerProviderConnection,
    contractExists,
} from './utils'

import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK, DEFAULT_MAX_POST_ID } from './defaults'
import { dbUri } from '../config/database';

import { add0x } from '../crypto/SMT'
import { genUnirepStateFromContract } from '../core'

import Unirep from "../artifacts/contracts/Unirep.sol/Unirep.json"
import { epkProofPrefix } from './prefix'

import Comment, { IComment } from "../database/models/comment";
import Post, { IPost } from "../database/models/post";
import mongoose from 'mongoose'

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

    // verify identity
    // parser.addArgument(
    //     ['-c', '--identity-commitment'],
    //     {
    //         required: true,
    //         type: 'string',
    //         help: 'The user\'s identity commitment (in hex representation)',
    //     }
    // )

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
    const unirepState = await genUnirepStateFromContract(
        provider,
        unirepAddress,
        startBlock,
   )

   const db = await mongoose.connect(
       dbUri, 
        { useNewUrlParser: true, 
          useFindAndModify: false, 
          useUnifiedTopology: true
        }
    )

    const newComment: IComment = new Comment({
        content: args.text,
    });

    const unirepContract = new ethers.Contract(
        unirepAddress,
        Unirep.abi,
        wallet,
    )

    let tx
    try {
        tx = await unirepContract.leaveComment(
            BigInt(add0x(args.post_id)),
            args.text,
            { gasLimit: 1000000 }
        )

        const postRes = await Post.findByIdAndUpdate(
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