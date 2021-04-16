import { dbUri } from '../config/database';
import Unirep from "../artifacts/contracts/Unirep.sol/Unirep.json"
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import {
  validateEthAddress,
} from './utils'
import mongoose from 'mongoose'

import NewGSTLeaf, { INewGSTLeaf } from "../database/models/newGSTLeaf";
import Post, { IPost } from "../database/models/post";
import Comment, { IComment } from "../database/models/comment";
import ReputationNullifier, { IReputationNullifier } from "../database/models/reputationNullifier";
import Attestation, { IAttestation } from "../database/models/attestation";
import UserTransitionedState, { IUserTransitionedState } from "../database/models/userTransitionedState";
import { DEFAULT_ETH_PROVIDER, DEFAULT_START_BLOCK } from './defaults'

const configureSubparser = (subparsers: any) => {
const parser = subparsers.addParser(
      'eventListeners',
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
      ['-x', '--contract'],
      {
          required: true,
          type: 'string',
          help: 'The Unirep contract address',
      }
  )
}

const eventListeners = async (args: any) => {

  // Unirep contract
  if (!validateEthAddress(args.contract)) {
    console.error('Error: invalid Unirep contract address')
    return
  }
  const unirepAddress = args.contract

  // Ethereum provider
  const ethProvider = args.eth_provider ? args.eth_provider : DEFAULT_ETH_PROVIDER

  console.log('listener start')

  const db = await mongoose.connect(
    dbUri, 
     { useNewUrlParser: true, 
       useFindAndModify: false, 
       useUnifiedTopology: true
     }
 )

  const provider = new hardhatEthers.providers.JsonRpcProvider(ethProvider)
  const unirepContract = new ethers.Contract(
    unirepAddress,
    Unirep.abi,
    provider,
  )
  
  const iface = new ethers.utils.Interface(Unirep.abi)

  const NewGSTLeafInsertedFilter = unirepContract.filters.NewGSTLeafInserted()
  const AttestationSubmittedFilter = unirepContract.filters.AttestationSubmitted()
  const postSubmittedFilter = unirepContract.filters.PostSubmitted()
  const commentSubmittedFilter = unirepContract.filters.CommentSubmitted()
  const reputationSubmittedFilter = unirepContract.filters.ReputationNullifierSubmitted()
  const epochEndedFilter = unirepContract.filters.EpochEnded()
  const userStateTransitionedFilter = unirepContract.filters.UserStateTransitioned()

  // NewGSTLeaf listeners
  provider.on(
    NewGSTLeafInsertedFilter, (event) => {
        const newLeaf: INewGSTLeaf = new NewGSTLeaf({
            formBlockhash: event.blockHash,
            epoch: event.topics[1],
            hashedLeaf: event.topics[0],
        })
  
        newLeaf.save()
          .then(()=>{console.log('Database: saved user sign up event')})
          .catch(err => {console.log(err)})
      }
  )

  // PostSubmitted listeners
  provider.on(
    postSubmittedFilter, (event) => {
        const postId = mongoose.Types.ObjectId(event.topics[2].slice(-24))

        Post.findByIdAndUpdate(
          postId,
          {$set: {
            status: 1, 
            transactionHash: event.transactionHash
          }},
        )
          .then(() => {
            console.log(`Database: updated ${postId} post`)
          })
          .catch(err => {console.log(err)})
      }
  )

    // CommentSubmitted listeners
    provider.on(
      commentSubmittedFilter, (event) => {
          const commentId = mongoose.Types.ObjectId(event.topics[2].slice(-24))
  
          Post.findOneAndUpdate(
            { "comments._id": commentId },
            {$set: {
              "comments.$.status": 1,
              "comments.$.transactionHash": event.transactionHash
            }},
          )
            .then(() => {console.log(`Database: updated ${commentId} comment`)})
            .catch(err => {console.log(err)})
        }
    )

    // ReputationSubmitted listeners
    provider.on(
      reputationSubmittedFilter, (event) => {
          const decodedData = iface.decodeEventLog("ReputationNullifierSubmitted",event.data)

          enum action {
            UpVote = 0,
            DownVote = 1,
            Post = 2,
            Comment = 3
          }
  
          for (let nullifier of decodedData.karmaNullifiers) {
            const newReputationNullifier: IReputationNullifier = new ReputationNullifier({
                transactionHash: event.transactionHash,
                action: action[decodedData.actionChoice],
                nullifiers: nullifier.toString()
            })
            newReputationNullifier.save()
              .then(()=>{console.log('Database: saved reputation nullifiers')})
              .catch(err => {console.log(err)})
          }
        }
    )

  // Attestation listeners
  provider.on(
    AttestationSubmittedFilter, (event) => {
          const _epoch = event.topics[1]
          const _epochKey = event.topics[2]
          const _attester = event.topics[3]
          const decodedData = iface.decodeEventLog("AttestationSubmitted",event.data)

          const newAttestation: IAttestation = new Attestation({
            transactionHash: event.transactionHash,
            epoch: _epoch,
            epochKey: _epochKey,
            attester: _attester,
            attesterId: decodedData?.attestation?.attesterId,
            posRep: decodedData?.attestation?.posRep,
            negRep: decodedData?.attestation?.negRep,
            graffiti: decodedData?.attestation?.graffiti,
            overwriteGraffiti: decodedData?.attestation?.overwriteGraffiti,
            })

          newAttestation.save()
          .then(()=>{console.log('Database: saved submitted attestation')})
          .catch(err => {console.log(err)})
      }
  )

  // Epoch Ended filter listeners
  // provider.on(
  //   epochEndedFilter, (event) =>{
  //     console.log("epoch Ended Filter")
  //     console.log(event)
  //   }
  // )

  // User state transition listeners
  provider.on(
    userStateTransitionedFilter, (event) =>{

      const _toEpoch = event.topics[1]
      const decodedData = iface.decodeEventLog("UserStateTransitioned",event.data)

      const newUserState: IUserTransitionedState = new UserTransitionedState({
        transactionHash: event.transactionHash,
        toEpoch: _toEpoch,
        fromEpoch: decodedData?.userTransitionedData?.fromEpoch,
        fromGlobalStateTree: decodedData?.userTransitionedData?.fromGlobalStateTree,
        fromEpochTree: decodedData?.userTransitionedData?.fromEpochTree,
        fromNullifierTreeRoot: decodedData?.userTransitionedData?.fromNullifierTreeRoot,
        newGlobalStateTreeLeaf: decodedData?.userTransitionedData?.newGlobalStateTreeLeaf,
        proof: decodedData?.userTransitionedData?.proof,
        attestationNullifiers: decodedData?.userTransitionedData?.attestationNullifiers,
        epkNullifiers: decodedData?.userTransitionedData?.epkNullifiers,
    })

      newUserState.save()
          .then(()=>{console.log('Database: saved user transitioned state')})
          .catch(err => {console.log(err)})
    }
  )
}

export {
  eventListeners,
  configureSubparser,
}