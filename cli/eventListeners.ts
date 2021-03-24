import { dbUri } from '../config/database';
import Unirep from "../artifacts/contracts/Unirep.sol/Unirep.json"
import { ethers as hardhatEthers } from 'hardhat'
import { ethers } from 'ethers'
import {
  validateEthAddress,
} from './utils'
import mongoose from 'mongoose'

import NewGSTLeaf, { INewGSTLeaf } from "../database/models/newGSTLeaf";
import Comment, { IComment } from "../database/models/comment";
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
  

  const NewGSTLeafInsertedFilter = unirepContract.filters.NewGSTLeafInserted()
  const AttestationSubmittedFilter = unirepContract.filters.AttestationSubmitted()
  const epochEndedFilter = unirepContract.filters.EpochEnded()
  const userStateTransitionedFilter = unirepContract.filters.UserStateTransitioned()

  // NewGSTLeaf listeners
  provider.on(
    NewGSTLeafInsertedFilter, (event) => {
        console.log(event)
        const newLeaf: INewGSTLeaf = new NewGSTLeaf({
            formBlockhash: event.blockHash,
            epoch: event.topics[1],
            hashedLeaf: event.topics[0],
        })
        console.log(newLeaf)
  
        newLeaf.save()
          .then(()=>{console.log('saved')})
          .catch(err => {console.log(err)})
      }
  )
  // Attestation listeners
  provider.on(
    AttestationSubmittedFilter, (event) => {
          console.log("Attestation Sumbitted Filter")
          const decodedData = ethers.utils.defaultAbiCoder.decode(
            ['uint256', 'uint256', 'uint256', 'uint256', 'bool'],
            event.data
          )
          const newAttestation: IAttestation = new Attestation({
            epoch: event.topics[1],
            epochKey: event.topics[2],
            attester: event.topics[3],
            attesterId: decodedData[0],
            posRep: decodedData[1],
            negRep: decodedData[2],
            graffiti: decodedData[3],
            overwriteGraffiti: decodedData[4],
            })

          newAttestation.save()
          .then(()=>{console.log(newAttestation)})
          .catch(err => {console.log(err)})
      }
  )

  // Epoch Ended filter listeners
  provider.on(
    epochEndedFilter, (event) =>{
      console.log("epoch Ended Filter")
      console.log(event)
    }
  )

  // User state transition listeners
  provider.on(
    userStateTransitionedFilter, (event) =>{
      console.log("User State Transitioned Filter")
      console.log(event)

      const decodedData = ethers.utils.defaultAbiCoder.decode(
        ['uint256','uint256','uint256','uint256','uint256[8]','uint256[]','uint256[]'],
        event.data
    )

      const newUserState: IUserTransitionedState = new UserTransitionedState({
        toEpoch: event.topics[1],
        fromEpoch: decodedData[0],
        fromGlobalStateTree: decodedData[1],
        fromEpochTree: decodedData[2],
        fromNullifierTreeRoot: decodedData[3],
        proof: decodedData[4],
        attestationNullifiers: decodedData[5],
        epkNullifiers: decodedData[6],
    })

      newUserState.save()
          .then(()=>{console.log(newUserState)})
          .catch(err => {console.log(err)})
    }
  )
}

export {
  eventListeners,
  configureSubparser,
}