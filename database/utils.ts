import { ethers } from 'ethers'
import mongoose from 'mongoose'
import { genIdentityCommitment } from 'libsemaphore'
import { numAttestationsPerEpochKey} from '../config/testLocal'

import Settings, { ISettings } from './models/settings'
import UserSignUp, { IUserSignUp } from './models/userSignUp'
import Attestations, { IAttestation } from './models/attestation'
import Post from "../database/models/post";
import ReputationNullifier, { IReputationNullifier } from "../database/models/reputationNullifier";
import UserTransitionedState, { IUserTransitionedState } from "../database/models/userTransitionedState";
import GSTLeaves, { IGSTLeaf, IGSTLeaves } from '../database/models/GSTLeaf'
import EpochTreeLeaves, { IEpochTreeLeaf } from '../database/models/epochTreeLeaf'
import NullifierTreeLeaves from '../database/models/nullifierTreeLeaf'

import { hash5, hashLeftRight, IncrementalQuinTree, stringifyBigInts } from 'maci-crypto'
import { computeEmptyUserStateRoot, defaultUserStateLeaf, genAttestationNullifier, genEpochKey, genEpochKeyNullifier, genNewSMT, SMT_ONE_LEAF, SMT_ZERO_LEAF } from '../test/utils'

import { assert } from 'console'
import Unirep from "../artifacts/contracts/Unirep.sol/Unirep.json"
import { add0x, SparseMerkleTreeImpl } from '../crypto/SMT'
import { DEFAULT_AIRDROPPED_KARMA, MAX_KARMA_BUDGET } from '../config/socialMedia'
import { dbUri } from '../config/database'
import { Reputation } from '../core/UserState'

enum action {
    UpVote = 0,
    DownVote = 1,
    Post = 2,
    Comment = 3
}

export interface IUserTransitionState {
    transitionedGSTLeafIndex: number
    fromEpoch: number
    toEpoch: number
    userStateTree: SparseMerkleTreeImpl
    attestations: IAttestation[]
    transitionedPosRep: BigInt
    transitionedNegRep: BigInt
    GSTLeaf: string
}

/*
* Connect to db uri
* @param dbUri mongoose database uri
*/
const connectDB = async(dbUri: string): Promise<typeof mongoose> => {

    const db = await mongoose.connect(
        dbUri, 
         { useNewUrlParser: true, 
           useFindAndModify: false, 
           useUnifiedTopology: true
         }
     )
    
     return db
}

/*
* Initialize the database by dropping the existing database
* returns true if it is successfully deleted
* @param db mongoose type database object
*/
const initDB = async(db: typeof mongoose)=> {

    const deletedDb = await db.connection.db.dropDatabase()

    return deletedDb
}

/*
* Disconnect to db uri
* @param db mongoose type database object
*/
const disconnectDB = (db: typeof mongoose): void => {

    db.disconnect()

    return
}


const saveSettingsFromContract = async (unirepContract: ethers.Contract): Promise<ISettings> => {

    let settings
    const existedSettings = await Settings.findOne()
    if(existedSettings === null){

        const treeDepths_ = await unirepContract.treeDepths()
        const globalStateTreeDepth = treeDepths_.globalStateTreeDepth
        const userStateTreeDepth = treeDepths_.userStateTreeDepth
        const epochTreeDepth = treeDepths_.epochTreeDepth
        const nullifierTreeDepth = treeDepths_.nullifierTreeDepth
        const attestingFee = await unirepContract.attestingFee()
        const epochLength = await unirepContract.epochLength()
        const numEpochKeyNoncePerEpoch = await unirepContract.numEpochKeyNoncePerEpoch()
    
        const emptyUserStateRoot = computeEmptyUserStateRoot(ethers.BigNumber.from(userStateTreeDepth).toNumber())
        settings = new Settings({
            globalStateTreeDepth: ethers.BigNumber.from(globalStateTreeDepth).toNumber(),
	        userStateTreeDepth: ethers.BigNumber.from(userStateTreeDepth).toNumber(),
	        epochTreeDepth: ethers.BigNumber.from(epochTreeDepth).toNumber(),
	        nullifierTreeDepth: ethers.BigNumber.from(nullifierTreeDepth).toNumber(),
	        attestingFee: attestingFee,
            epochLength: ethers.BigNumber.from(epochLength).toNumber(),
	        numEpochKeyNoncePerEpoch: ethers.BigNumber.from(numEpochKeyNoncePerEpoch).toNumber(),
	        numAttestationsPerEpochKey: numAttestationsPerEpochKey,
	        defaultGSTLeaf: hashLeftRight(
                BigInt(0),  // zero identityCommitment
                emptyUserStateRoot,  // zero user state root
            )
        })
    }

    return existedSettings? existedSettings : settings.save()
}

/*
* Computes the global state tree of given epoch
* @param epoch current epoch
*/
const genGSTreeFromDB = async (epoch: number): Promise<IncrementalQuinTree> => {
    
    const _settings = await Settings.findOne()
    const treeLeaves = await GSTLeaves?.findOne({epoch: epoch})
    if (!_settings) {
        throw new Error('Error: should save settings first')
    } 

    const globalStateTreeDepth = _settings.globalStateTreeDepth
    const userStateTreeDepth = _settings.userStateTreeDepth
    const emptyUserStateRoot = computeEmptyUserStateRoot(userStateTreeDepth)
    const defaultGSTLeaf = hash5([
        BigInt(0),  // zero identityCommitment
        emptyUserStateRoot,  // zero user state root
        BigInt(DEFAULT_AIRDROPPED_KARMA), // default airdropped karma
        BigInt(0), // default negative karma
        BigInt(0)
    ])

    const GSTree = new IncrementalQuinTree(
        globalStateTreeDepth,
        defaultGSTLeaf,
        2,
    )

    const GSTLeavesToEpoch = treeLeaves?.get('GSTLeaves')
    let leaves: BigInt[] = []
    for (let i = 0; i < GSTLeavesToEpoch.length; i++) {
        leaves.push(BigInt(GSTLeavesToEpoch[i]?.hashedLeaf))
    }

    for(const leaf of leaves){
        GSTree.insert(leaf)
    }

    return GSTree
}

/*
* Computes the epoch tree of given epoch
* @param epoch current epoch
*/
const genEpochTreeFromDB = async (epoch: number): Promise<SparseMerkleTreeImpl> => {
    
    const _settings = await Settings.findOne()
    const treeLeaves = await EpochTreeLeaves?.findOne({epoch: epoch})
    if (!_settings) {
        throw new Error('Error: should save settings first')
    }

    const epochTreeDepth = _settings.epochTreeDepth
    
    const epochTree = await genNewSMT(epochTreeDepth, SMT_ONE_LEAF)
    const leaves = treeLeaves?.epochTreeLeaves? treeLeaves?.epochTreeLeaves : []
    for (const leaf of leaves) {
        const decEpochKey = BigInt(BigInt(add0x(leaf.epochKey)).toString())
        await epochTree.update(decEpochKey, BigInt(leaf.hashchainResult))
    }

    return epochTree
}

/*
* Computes the nullifier tree of given epoch
*/
const genNullifierTreeFromDB = async (): Promise<SparseMerkleTreeImpl> => {

    const _settings = await Settings.findOne()
    const treeLeaves = await NullifierTreeLeaves?.find()
    if (!_settings) {
        throw new Error('Error: should save settings first')
    } 

    const nullifierTree = await genNewSMT(_settings.nullifierTreeDepth, SMT_ZERO_LEAF)
    await nullifierTree.update(BigInt(0), SMT_ONE_LEAF)

    if (treeLeaves.length == 0) return nullifierTree
    else{
        for (const leaf of treeLeaves) {
            await nullifierTree.update(BigInt(leaf.nullifier), SMT_ONE_LEAF)
        }
        return nullifierTree
    }
}

/*
* Get the attestations of given epoch key
* @param epochKey given epoch key
*/
const getAttestationsFromDB = async (epochKey: string): Promise<IAttestation[] > => {
    const attestationsToEpochKey = await Attestations.findOne({epochKey: epochKey})
    if ( attestationsToEpochKey ){
        return attestationsToEpochKey?.attestations
    }
    else {
        return []
    }
    
}

/*
* Get the nullifier of the attestations of given epoch
* @param epoch given epoch
* @param id user's identity
*/
const getAttestationNullifiersFromDB = async (epoch: number, id: any): Promise<BigInt[]> => {

    const _settings = await Settings.findOne()
    if (!_settings) {
        throw new Error('Error: should save settings first')
    } 

    const epochTreeDepth = _settings.epochTreeDepth
    const numEpochKeyNoncePerEpoch = _settings.numEpochKeyNoncePerEpoch

    const nullifiers: BigInt[] = []
    for (let nonce = 0; nonce < numEpochKeyNoncePerEpoch; nonce++) {
        const epochKey = genEpochKey(id.identityNullifier, epoch, nonce, epochTreeDepth)
        const attestations = await getAttestationsFromDB(epochKey.toString(16))
        if(!attestations) return nullifiers
        for (const attestation of attestations) {
            nullifiers.push(
                genAttestationNullifier(id.identityNullifier, BigInt(attestation.attesterId), epoch, epochKey, _settings.nullifierTreeDepth)
                )
        }
        for (let i = 0; i < (numAttestationsPerEpochKey - attestations.length); i++) {
            nullifiers.push(BigInt(0))
        }
    }

    return nullifiers
}

/*
* Assert user has signed up and find the epoch where user signed up
* finding user's signed up leaf event in db
* @param id user's identity
*/
const findUserSignedUpEpochFromDB = async (id: any): Promise<IUserSignUp | null> => {

    const _settings = await Settings.findOne()
    if (!_settings) {
        throw new Error('Error: should save settings first')
    } 

    const emptyUserStateRoot = computeEmptyUserStateRoot(_settings.userStateTreeDepth)
    const userDefaultGSTLeaf = hash5([
        genIdentityCommitment(id),
        emptyUserStateRoot,
        BigInt(DEFAULT_AIRDROPPED_KARMA),
        BigInt(0),
        BigInt(0)
    ]).toString(16)
    const result = await UserSignUp.findOne({hashedLeaf: add0x(userDefaultGSTLeaf)})
    return result
}

const nullifierExist = async (nullifier: string): Promise<boolean> => {
    const leaf = await NullifierTreeLeaves.findOne({nullifier: nullifier})
    if (leaf) return true
    else return false
}


/*
* get GST leaf index of given epoch
* @param epoch find GST leaf in the epoch
* @param hasedLeaf find the hash of GST leaf
*/
const getGSTLeafIndex = async (epoch: number, hashedLeaf: string): Promise<number> => {

    const leaves = await GSTLeaves.findOne({epoch: epoch})
    if(leaves){
        for(const leaf of leaves.get('GSTLeaves')){
            if (leaf.hashedLeaf == hashedLeaf){
                return leaves?.GSTLeaves?.indexOf(leaf)
            }
        }
    }

    return -1
}

/*
* generate user state tree from given reputations
* @param reputations reputations received by user in current epoch
*/
const genUserStateTreeFromDB = async(
    reputations: IAttestation[]
    
): Promise<SparseMerkleTreeImpl> => {

    const settings = await Settings.findOne()
    if (!settings) {
        throw new Error('Error: should save settings first')
    } 

    let reputationRecords = {}
    const USTree = await genNewSMT(settings.userStateTreeDepth, defaultUserStateLeaf)

    for (const reputation of reputations) {
        if (reputationRecords[reputation.attesterId] === undefined) {
            reputationRecords[reputation.attesterId] = new Reputation(
                BigInt(reputation.posRep),
                BigInt(reputation.negRep),
                BigInt(reputation.graffiti)
            )
        } else {
            // Update attestation record
            reputationRecords[reputation.attesterId].update(
                BigInt(reputation.posRep),
                BigInt(reputation.negRep),
                BigInt(reputation.graffiti),
                reputation.overwriteGraffiti
            )
        }
    }

    for (let attesterId in reputationRecords) {
        const hashedReputation = hash5([
            BigInt(reputationRecords[attesterId].posRep),
            BigInt(reputationRecords[attesterId].negRep),
            BigInt(reputationRecords[attesterId].graffiti),
            BigInt(0),
            BigInt(0)
        ])
        await USTree.update(BigInt(attesterId), hashedReputation)
    }

    return USTree
}

const getRepByAttester = async (
    reputations: IAttestation[],
    attesterId: string,
) => {
    const leaf = reputations.find((leaf) => BigInt(leaf.attesterId) == BigInt(attesterId))
    if(leaf !== undefined) return leaf
    else {
        const defaultAttestation: IAttestation = {
            transactionHash: "0",
            epoch: 0,
            attester: "0",
            attesterId: "0",
            posRep: "0",
            negRep: "0",
            graffiti: "0",
            overwriteGraffiti: false
        }
        return defaultAttestation
    }
}


/*
* Retrives the updated UserState from the database
* @param currentEpoch current epoch
* @param userIdentity user's semaphore identity
*/
const genCurrentUserStateFromDB = async ( 
    currentEpoch: number,
    id: any,
 ) => {
    const settings = await Settings.findOne()
    if (!settings) {
        throw new Error('Error: should save settings first')
    } 

    const idCommitment = genIdentityCommitment(id)
    const globalStateTreeDepth = settings.globalStateTreeDepth
    const userStateTreeDepth = settings.userStateTreeDepth
    const epochTreeDepth = settings.epochTreeDepth
    const nullifierTreeDepth = settings.nullifierTreeDepth
    const attestingFee = settings.attestingFee
    const epochLength = settings.epochLength
    const numEpochKeyNoncePerEpoch = settings.numEpochKeyNoncePerEpoch
    const numAttestationsPerEpochKey = settings.numAttestationsPerEpochKey

    const userHasSignedUp = await findUserSignedUpEpochFromDB(id)
    assert(userHasSignedUp, "User has not signed up yet")
    if(!userHasSignedUp){
        return
    }

    // start user state
    let transitionedFromEpoch = userHasSignedUp?.epoch ? userHasSignedUp?.epoch : 0
    let startEpoch = transitionedFromEpoch
    let transitionedPosRep = DEFAULT_AIRDROPPED_KARMA
    let transitionedNegRep = 0
    let userStates: {[key: number]: IUserTransitionState} = {}
    let GSTLeaf = userHasSignedUp?.hashedLeaf
    let userStateTree: SparseMerkleTreeImpl = await genUserStateTreeFromDB([])
    let attestations: IAttestation[] = []
    let transitionedGSTLeaf = await getGSTLeafIndex(startEpoch, GSTLeaf)
   
    // find all reputation received by the user
    for (let e = startEpoch; e <= currentEpoch; e++) {

        // find if user has transitioned 
        if (e !== startEpoch) {
            transitionedGSTLeaf = await getGSTLeafIndex(e, GSTLeaf)
        }
        
        // user transitioned state
        const newState: IUserTransitionState = {
            transitionedGSTLeafIndex: transitionedGSTLeaf,
            fromEpoch: transitionedFromEpoch,
            toEpoch: e,
            userStateTree: userStateTree,
            attestations: attestations,
            transitionedPosRep: BigInt(transitionedPosRep),
            transitionedNegRep: BigInt(transitionedNegRep),
            GSTLeaf: GSTLeaf
        }
        userStates[e] = newState

        // get all attestations from epoch key generated in the given epoch e
        attestations = []
        for (let nonce = 0; nonce < numEpochKeyNoncePerEpoch; nonce++) {
            const epochKey = genEpochKey(id.identityNullifier, e, nonce, epochTreeDepth)
            const attestationToEpk = await Attestations.findOne({epochKey: epochKey.toString(16)})
            attestationToEpk?.attestations?.map((a) => {attestations.push(a)})
        }
        userStateTree = await genUserStateTreeFromDB(attestations)

        // compute user state transition result
        transitionedFromEpoch = e
        for (const attestation of attestations) {
            transitionedPosRep += Number(attestation.posRep)
            transitionedNegRep += Number(attestation.negRep)
        }
        transitionedPosRep += DEFAULT_AIRDROPPED_KARMA
        GSTLeaf = add0x(hash5([
            idCommitment,
            userStateTree.getRootHash(),
            BigInt(transitionedPosRep),
            BigInt(transitionedNegRep),
            BigInt(0)
        ]).toString(16))
    }

    return userStates
   
}

const genProveReputationCircuitInputsFromDB = async (
    epoch: number,
    id: any,
    epochKeyNonce: number,
    proveKarmaAmount: number,
    nonceStarter: number,
    minRep: number,
) => {
    const db = await mongoose.connect(
        dbUri, 
         { useNewUrlParser: true, 
           useFindAndModify: false, 
           useUnifiedTopology: true
         }
    )
    const settings = await Settings.findOne()
    if (!settings) {
        throw new Error('Error: should save settings first')
    } 

    const epochTreeDepth = settings.epochTreeDepth
    const nullifierTreeDepth = settings.nullifierTreeDepth

    const userState = await genCurrentUserStateFromDB(epoch, id)
    if(!userState) return
    const epochKey = genEpochKey(id.identityNullifier, epoch, epochKeyNonce, epochTreeDepth)
    const nonce = 0
    const userStateTree = await userState[epoch].userStateTree
    const GSTree = await genGSTreeFromDB(epoch)
    const GSTLeafIndex = await getGSTLeafIndex(epoch, userState[epoch].GSTLeaf)
    const GSTreeProof = GSTree.genMerklePath(GSTLeafIndex)
    const GSTreeRoot = GSTree.root
    const nullifierTree = await genNullifierTreeFromDB()
    const nullifierTreeRoot = nullifierTree.getRootHash()
    const epkNullifier = genEpochKeyNullifier(id.identityNullifier, epoch, nonce, nullifierTreeDepth)
    const epkNullifierProof = await nullifierTree.getMerkleProof(epkNullifier)
    const hashedLeaf = hash5([
        genIdentityCommitment(id),
        userStateTree.getRootHash(),
        BigInt(userState[epoch].transitionedPosRep),
        BigInt(userState[epoch].transitionedNegRep),
        BigInt(0)
    ])
    const selectors: BigInt[] = []
    const nonceList: BigInt[] = []
    for (let i = 0; i < proveKarmaAmount; i++) {
        nonceList.push( BigInt(nonceStarter + i) )
        selectors.push(BigInt(1));
    }
    for (let i = proveKarmaAmount ; i < MAX_KARMA_BUDGET; i++) {
        nonceList.push(BigInt(0))
        selectors.push(BigInt(0))
    }

    db.disconnect();

    return stringifyBigInts({
        epoch: epoch,
        nonce: nonce,
        identity_pk: id.keypair.pubKey,
        identity_nullifier: id.identityNullifier, 
        identity_trapdoor: id.identityTrapdoor,
        user_tree_root: userStateTree.getRootHash(),
        user_state_hash: hashedLeaf,
        epoch_key_nonce: epochKeyNonce,
        epoch_key: epochKey,
        GST_path_index: GSTreeProof.indices,
        GST_path_elements: GSTreeProof.pathElements,
        GST_root: GSTreeRoot,
        nullifier_tree_root: nullifierTreeRoot,
        nullifier_path_elements: epkNullifierProof,
        selectors: selectors,
        positive_karma: userState[epoch].transitionedPosRep,
        negative_karma: userState[epoch].transitionedNegRep,
        prove_karma_nullifiers: BigInt(Boolean(proveKarmaAmount)),
        prove_karma_amount: BigInt(proveKarmaAmount),
        karma_nonce: nonceList,
        prove_min_rep: BigInt(Boolean(minRep)),
        min_rep: BigInt(minRep)
    })
}

const genProveReputationFromAttesterCircuitInputsFromDB = async (
    epoch: number,
    id: any,
    attesterId: BigInt,
    provePosRep: BigInt,
    proveNegRep: BigInt,
    proveRepDiff: BigInt,
    proveGraffiti: BigInt,
    minPosRep: BigInt,
    maxNegRep: BigInt,
    minRepDiff: BigInt,
    graffitiPreImage: BigInt,
) => {
    const db = await mongoose.connect(
        dbUri, 
         { useNewUrlParser: true, 
           useFindAndModify: false, 
           useUnifiedTopology: true
         }
    )
    const settings = await Settings.findOne()
    if (!settings) {
        throw new Error('Error: should save settings first')
    } 

    const epochTreeDepth = settings.epochTreeDepth
    const nullifierTreeDepth = settings.nullifierTreeDepth
    const userStateTreeDepth = settings.userStateTreeDepth

    const userState = await genCurrentUserStateFromDB(epoch, id)
    if(!userState) return
    assert(attesterId > BigInt(0), `attesterId must be greater than zero`)
    assert(attesterId < BigInt(2 ** userStateTreeDepth), `attesterId exceeds total number of attesters`)

    const latestGSTLeafIndex = userState[epoch].transitionedGSTLeafIndex
    assert(latestGSTLeafIndex >= 0, `user haven't transitioned from ${userState[epoch].fromEpoch} epoch`)

    const fromEpoch = userState[epoch].fromEpoch
    const transitionedPosRep = userState[epoch].transitionedPosRep
    const transitionedNegRep = userState[epoch].transitionedNegRep
    const nonce = 0
    const rep = await getRepByAttester(userState[epoch].attestations, attesterId.toString())
    const posRep = rep.posRep
    const negRep = rep.negRep
    const graffiti = rep.graffiti
    const userStateTree = await genUserStateTreeFromDB(userState[epoch].attestations)
    const hashedLeaf = hash5([
        genIdentityCommitment(id),
        userStateTree.getRootHash(),
        BigInt(transitionedPosRep),
        BigInt(transitionedNegRep),
        BigInt(0)
    ])
    const GSTree = await genGSTreeFromDB(epoch)
    const GSTreeProof = GSTree.genMerklePath(latestGSTLeafIndex)
    const GSTreeRoot = GSTree.root
    const nullifierTree = await genNullifierTreeFromDB()
    const nullifierTreeRoot = nullifierTree.getRootHash()
    const epkNullifier = genEpochKeyNullifier(id.identityNullifier, epoch, nonce, nullifierTreeDepth)
    const epkNullifierProof = await nullifierTree.getMerkleProof(epkNullifier)
    const USTPathElements = await userStateTree.getMerkleProof(attesterId)

    db.disconnect();

    return stringifyBigInts({
        epoch: epoch,
        nonce: nonce,
        identity_pk: id.keypair.pubKey,
        identity_nullifier: id.identityNullifier, 
        identity_trapdoor: id.identityTrapdoor,
        user_tree_root: userStateTree.getRootHash(),
        user_state_hash: hashedLeaf,
        GST_path_index: GSTreeProof.indices,
        GST_path_elements: GSTreeProof.pathElements,
        GST_root: GSTreeRoot,
        nullifier_tree_root: nullifierTreeRoot,
        nullifier_path_elements: epkNullifierProof,
        attester_id: attesterId,
        pos_rep: posRep,
        neg_rep: negRep,
        graffiti: graffiti,
        UST_path_elements: USTPathElements,
        positive_karma: BigInt(transitionedPosRep),
        negative_karma: BigInt(transitionedNegRep),
        prove_pos_rep: provePosRep,
        prove_neg_rep: proveNegRep,
        prove_rep_diff: proveRepDiff,
        prove_graffiti: proveGraffiti,
        min_rep_diff: minRepDiff,
        min_pos_rep: minPosRep,
        max_neg_rep: maxNegRep,
        graffiti_pre_image: graffitiPreImage
    })

}

const genUserStateTransitionCircuitInputsFromDB = async (
    epoch: number,
    id: any,
) => {
    const db = await mongoose.connect(
        dbUri, 
         { useNewUrlParser: true, 
           useFindAndModify: false, 
           useUnifiedTopology: true
         }
    )
    const settings = await Settings.findOne()
    if (!settings) {
        throw new Error('Error: should save settings first')
    } 

    const globalStateTreeDepth = settings.globalStateTreeDepth
    const userStateTreeDepth = settings.userStateTreeDepth
    const epochTreeDepth = settings.epochTreeDepth
    const nullifierTreeDepth = settings.nullifierTreeDepth
    const attestingFee = settings.attestingFee
    const epochLength = settings.epochLength
    const numEpochKeyNoncePerEpoch = settings.numEpochKeyNoncePerEpoch
    const numAttestationsPerEpochKey = settings.numAttestationsPerEpochKey
    const DefaultHashchainResult = SMT_ONE_LEAF

    const userState = await genCurrentUserStateFromDB(epoch, id)
    if(!userState) return

    const fromEpoch = userState[epoch].fromEpoch
    const fromEpochUserStateTree: SparseMerkleTreeImpl = userState[fromEpoch].userStateTree
    const intermediateUserStateTreeRoots: BigInt[] = [
        fromEpochUserStateTree.getRootHash()
    ]
    
    // GSTree
    const userStateLeafPathElements: any[] = []
    const fromEpochGSTree: IncrementalQuinTree = await genGSTreeFromDB(fromEpoch)
    const latestGSTLeafIndex = userState[fromEpoch].transitionedGSTLeafIndex
    const GSTreeProof = fromEpochGSTree.genMerklePath(latestGSTLeafIndex)
    const GSTreeRoot = fromEpochGSTree.root

    //EpochTree
    const fromEpochTree = await genEpochTreeFromDB(fromEpoch)
    const epochTreeRoot = fromEpochTree.getRootHash()
    const epochKeyPathElements: any[] = []
    const hashChainResults: BigInt[] = []

    // User state tree
    const userStateTreeRoot = userState[fromEpoch].userStateTree.getRootHash()
    const transitionedPosRep = userState[fromEpoch].transitionedPosRep
    const transitionedNegRep = BigInt(userState[fromEpoch].transitionedNegRep)

    const hashedLeaf = hash5([
        genIdentityCommitment(id),
        userStateTreeRoot,
        transitionedPosRep,
        transitionedNegRep,
        BigInt(0)
    ])

    let reputationRecords = {}
    const selectors: number[] = []
    const attesterIds: BigInt[] = []
    const oldPosReps: BigInt[] = [], oldNegReps: BigInt[] = [], oldGraffities: BigInt[] = []
    const posReps: BigInt[] = [], negReps: BigInt[] = [], graffities: BigInt[] = [], overwriteGraffitis: any[] = []
    let newPosRep = Number(userState[fromEpoch].transitionedPosRep) + DEFAULT_AIRDROPPED_KARMA
    let newNegRep = Number(userState[fromEpoch].transitionedNegRep)

    for (let nonce = 0; nonce < numEpochKeyNoncePerEpoch; nonce++) {
        const epochKey = genEpochKey(id.identityNullifier, fromEpoch, nonce, epochTreeDepth)
        
        // Attestations
        const attestations = await getAttestationsFromDB(epochKey.toString(16))
        for (let i = 0; i < attestations?.length; i++) {
            const attestation = attestations[i]
            const attesterId = attestation.attesterId
            const oldAttestations = userState[fromEpoch].attestations
            const rep = await getRepByAttester(oldAttestations, attesterId)

            if (reputationRecords[attesterId.toString()] === undefined) {
                reputationRecords[attesterId.toString()] = new Reputation(
                    BigInt(rep.posRep),
                    BigInt(rep.negRep),
                    BigInt(rep.graffiti)
                )
            }

            oldPosReps.push(reputationRecords[attesterId.toString()]['posRep'])
            oldNegReps.push(reputationRecords[attesterId.toString()]['negRep'])
            oldGraffities.push(reputationRecords[attesterId.toString()]['graffiti'])

            // Add UST merkle proof to the list
            const USTLeafPathElements = await fromEpochUserStateTree.getMerkleProof(BigInt(attesterId))
            userStateLeafPathElements.push(USTLeafPathElements)

            // Update attestation record
            reputationRecords[attesterId.toString()].update(
                attestation['posRep'],
                attestation['negRep'],
                attestation['graffiti'],
                attestation['overwriteGraffiti']
            )
            // Update UST
            await fromEpochUserStateTree.update(BigInt(attesterId), reputationRecords[attesterId.toString()].hash())
            // Add new UST root to intermediate UST roots
            intermediateUserStateTreeRoots.push(fromEpochUserStateTree.getRootHash())

            selectors.push(1)
            attesterIds.push(BigInt(attesterId))
            posReps.push(BigInt(attestation.posRep))
            negReps.push(BigInt(attestation.negRep))
            graffities.push(BigInt(attestation.graffiti))
            overwriteGraffitis.push(attestation.overwriteGraffiti)
            newPosRep += Number(attestation.posRep)
            newNegRep += Number(attestation.negRep)
        }
        // Fill in blank data for non-exist attestation
        for (let i = 0; i < (numAttestationsPerEpochKey - attestations?.length); i++) {
            oldPosReps.push(BigInt(0))
            oldNegReps.push(BigInt(0))
            oldGraffities.push(BigInt(0))
                
            const USTLeafZeroPathElements = await fromEpochUserStateTree.getMerkleProof(BigInt(0))
            userStateLeafPathElements.push(USTLeafZeroPathElements)
            intermediateUserStateTreeRoots.push(fromEpochUserStateTree.getRootHash())

            selectors.push(0)
            attesterIds.push(BigInt(0))
            posReps.push(BigInt(0))
            negReps.push(BigInt(0))
            graffities.push(BigInt(0))
            overwriteGraffitis.push(false)
        }
        epochKeyPathElements.push(await fromEpochTree.getMerkleProof(epochKey))
        const epochTreeLeaves = await EpochTreeLeaves.findOne({epoch: fromEpoch})
        let hashChainResult = DefaultHashchainResult
        if(epochTreeLeaves){
            for (const leaf of epochTreeLeaves?.epochTreeLeaves) {
                if ( leaf.epochKey == epochKey.toString(16)){
                    hashChainResult = BigInt(leaf.hashchainResult)
                }
            }
        }
        hashChainResults.push(hashChainResult) 
    }

    db.disconnect();
    
    return stringifyBigInts({
        epoch: fromEpoch,
        intermediate_user_state_tree_roots: intermediateUserStateTreeRoots,
        old_pos_reps: oldPosReps,
        old_neg_reps: oldNegReps,
        old_graffities: oldGraffities,
        UST_path_elements: userStateLeafPathElements,
        identity_pk: id.keypair.pubKey,
        identity_nullifier: id.identityNullifier,
        identity_trapdoor: id.identityTrapdoor,
        user_state_hash: hashedLeaf,
        old_positive_karma: transitionedPosRep,
        old_negative_karma: transitionedNegRep,
        GST_path_elements: GSTreeProof.pathElements,
        GST_path_index: GSTreeProof.indices,
        GST_root: GSTreeRoot,
        selectors: selectors,
        attester_ids: attesterIds,
        pos_reps: posReps,
        neg_reps: negReps,
        graffities: graffities,
        overwrite_graffitis: overwriteGraffitis,
        positive_karma: BigInt(newPosRep),
        negative_karma: BigInt(newNegRep),
        airdropped_karma: DEFAULT_AIRDROPPED_KARMA,
        epk_path_elements: epochKeyPathElements,
        hash_chain_results: hashChainResults,
        epoch_tree_root: epochTreeRoot
    })
}


/*
* When a newGSTLeafInserted event comes
* update the database
* @param event newGSTLeafInserted event
*/

const updateDBFromNewGSTLeafInsertedEvent = async (
    event: ethers.Event,
) => {
    const iface = new ethers.utils.Interface(Unirep.abi)
    const decodedData = iface.decodeEventLog("NewGSTLeafInserted",event.data)

    const _transactionHash = event.transactionHash
    const _epoch = Number(event?.topics[1])
    const _hashedLeaf = add0x(decodedData?._hashedLeaf._hex)

    // save the new leaf
    const newLeaf: IGSTLeaf = {
        transactionHash: _transactionHash,
        hashedLeaf: _hashedLeaf
    }
    
    let treeLeaves: IGSTLeaves | null = await GSTLeaves.findOne({epoch: _epoch})

    if(!treeLeaves){
        treeLeaves = new GSTLeaves({
            epoch: _epoch,
            GSTLeaves: [newLeaf],
            currentEpochGSTLeafIndexToInsert: 1
        })
    } else {
        const nextIndex = treeLeaves.currentEpochGSTLeafIndexToInsert + 1
        treeLeaves.get('GSTLeaves').push(newLeaf)
        treeLeaves.set('currentEpochGSTLeafIndexToInsert', nextIndex)
    }

    const savedTreeLeavesRes = await treeLeaves?.save()

    // save new user

    const newUser: IUserSignUp = new UserSignUp({
        transactionHash: _transactionHash,
        hashedLeaf: _hashedLeaf,
        epoch: _epoch
    })

    const savedUserSignUpRes = await newUser.save()

    if( savedTreeLeavesRes && savedUserSignUpRes ){
        console.log('Database: saved user sign up event')
    }
}

/*
* When an AttestationSubmitted event comes
* update the database
* @param event AttestationSubmitted event
*/
const updateDBFromAttestationEvent = async (
    event: ethers.Event,
) => {
    const iface = new ethers.utils.Interface(Unirep.abi)
    const _epoch = event.topics[1]
    const _epochKey = BigInt(event.topics[2]).toString(16)
    const _attester = event.topics[3]
    const decodedData = iface.decodeEventLog("AttestationSubmitted",event.data)
    
    const newAttestation: IAttestation = {
        transactionHash: event.transactionHash,
        epoch: Number(_epoch),
        attester: _attester,
        attesterId: decodedData?.attestation?.attesterId?._hex,
        posRep: decodedData?.attestation?.posRep?._hex,
        negRep: decodedData?.attestation?.negRep?._hex,
        graffiti: decodedData?.attestation?.graffiti?._hex,
        overwriteGraffiti: decodedData?.attestation?.overwriteGraffiti,
    }

    let attestations = await Attestations.findOne({epochKey: _epochKey})

    if(!attestations){
        attestations = new Attestations({
            epochKey: _epochKey,
            attestations: [newAttestation]
        })
    } else {
        attestations.get('attestations').push(newAttestation)
    }
    
    const res = await attestations?.save()
    if(res){
        console.log('Database: saved submitted attestation')
    }
}

/*
* When a PostSubmitted event comes
* update the database
* @param event PostSubmitted event
*/
const updateDBFromPostSubmittedEvent = async (
    event: ethers.Event,
) => {
    const postId = mongoose.Types.ObjectId(event.topics[2].slice(-24))

    const newPost = await Post.findByIdAndUpdate(
        postId,
        {$set: {
            status: 1, 
            transactionHash: event.transactionHash
        }},
    )
    
    if(newPost){
        console.log(`Database: updated ${postId} post`)
    }
}

/*
* When a CommentSubmitted event comes
* update the database
* @param event CommentSubmitted event
*/
const updateDBFromCommentSubmittedEvent = async (
    event: ethers.Event,
) => {
    const commentId = mongoose.Types.ObjectId(event.topics[2].slice(-24))
  
    const res = await Post.findOneAndUpdate(
            { "comments._id": commentId },
            {$set: {
              "comments.$.status": 1,
              "comments.$.transactionHash": event.transactionHash
            }},
    )
    
    if(res) {
        console.log(`Database: updated ${commentId} comment`)
    }
}

/*
* When a ReputationNullifierSubmitted event comes
* update the database
* @param event ReputationNullifierSubmitted event
*/
const updateDBFromReputationNullifierSubmittedEvent = async (
    event: ethers.Event,
) => {
    const iface = new ethers.utils.Interface(Unirep.abi)
    const decodedData = iface.decodeEventLog("ReputationNullifierSubmitted",event.data)
    const default_nullifier = hash5([BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)])

    for (let nullifier of decodedData.karmaNullifiers) {
        if ( BigInt(nullifier) != default_nullifier ){
            const newReputationNullifier: IReputationNullifier = new ReputationNullifier({
                transactionHash: event.transactionHash,
                action: action[decodedData.actionChoice],
                nullifiers: nullifier.toString()
            })
    
            const res = await newReputationNullifier.save()
            if(res) {
                console.log('Database: saved reputation nullifiers')
            }
        }
    }
}

/*
* When an EpochEnded event comes
* update the database
* @param event EpochEnded event
* @param address The address of the Unirep contract
* @param provider An Ethereum provider
*/
const updateDBFromEpochEndedEvent = async (
    event: ethers.Event,
    unirepContract: ethers.Contract,
) => {
    // update Unirep state
    const epoch = Number(event?.topics[1])

    // Get epoch tree leaves of the ending epoch
    let [epochKeys_, epochKeyHashchains_] = await unirepContract.getEpochTreeLeaves(epoch)
    epochKeys_ = epochKeys_.map((epk) => BigInt(epk).toString(16))
    epochKeyHashchains_ = epochKeyHashchains_.map((hc) => BigInt(hc).toString())
    
    const epochTreeLeaves: IEpochTreeLeaf[] = []
    for (let i = 0; i < epochKeys_.length; i++) {
        const epochTreeLeaf: IEpochTreeLeaf = {
            epochKey: epochKeys_[i],
            hashchainResult: epochKeyHashchains_[i]
        }
        epochTreeLeaves.push(epochTreeLeaf)
    }
    
    const newEpochTreeLeaves = new EpochTreeLeaves({
        epoch: epoch,
        epochTreeLeaves: epochTreeLeaves
    })

    const EpochEndedEventResult = await newEpochTreeLeaves?.save()

    if(EpochEndedEventResult) {
        console.log('Database: saved epoch tree leaves and update current Epoch')
    }
}

/*
* When a UserstateTransitioned event comes
* update the database
* and insert a new leaf into GST
* @param event UserstateTransitioned event
*/
const updateDBFromUserStateTransitionEvent = async (
    event: ethers.Event
) => {
    const _settings = await Settings.findOne()
    if (!_settings) {
        throw new Error('Error: should save settings first')
    } 
    const iface = new ethers.utils.Interface(Unirep.abi)
    const _toEpoch = Number(event.topics[1])
    const decodedUserStateTransitionedData = iface.decodeEventLog("UserStateTransitioned",event.data)
    const _transactionHash = event.transactionHash
    const _hashedLeaf = add0x(decodedUserStateTransitionedData?.userTransitionedData?.newGlobalStateTreeLeaf._hex)

    // save new user transitioned state
    const newUserState: IUserTransitionedState = new UserTransitionedState({
        transactionHash: _transactionHash,
        toEpoch: _toEpoch,
        fromEpoch: decodedUserStateTransitionedData?.userTransitionedData?.fromEpoch._hex,
        fromGlobalStateTree: decodedUserStateTransitionedData?.userTransitionedData?.fromGlobalStateTree._hex,
        fromEpochTree: decodedUserStateTransitionedData?.userTransitionedData?.fromEpochTree._hex,
        fromNullifierTreeRoot: decodedUserStateTransitionedData?.userTransitionedData?.fromNullifierTreeRoot._hex,
        newGlobalStateTreeLeaf: _hashedLeaf,
        proof: decodedUserStateTransitionedData?.userTransitionedData?.proof,
        attestationNullifiers: decodedUserStateTransitionedData?.userTransitionedData?.attestationNullifiers,
        epkNullifiers: decodedUserStateTransitionedData?.userTransitionedData?.epkNullifiers,
    })

    const UserStateTransitionedResult = await newUserState.save()

    // save the new leaf
    const newLeaf: IGSTLeaf = {
        transactionHash: _transactionHash,
        hashedLeaf: _hashedLeaf
    }
    
    let treeLeaves: IGSTLeaves | null = await GSTLeaves.findOne({epoch: _toEpoch})

    if(!treeLeaves){
        treeLeaves = new GSTLeaves({
            epoch: _toEpoch,
            GSTLeaves: [newLeaf],
            currentEpochGSTLeafIndexToInsert: 1
        })
    } else {
        const nextIndex = treeLeaves.currentEpochGSTLeafIndexToInsert + 1
        treeLeaves.get('GSTLeaves').push(newLeaf)
        treeLeaves.set('currentEpochGSTLeafIndexToInsert', nextIndex)
    }

    // save nullifiers
    const attestationNullifiers = decodedUserStateTransitionedData?.userTransitionedData?.attestationNullifiers.map((n) => BigInt(n))
    const epkNullifiers = decodedUserStateTransitionedData?.userTransitionedData?.epkNullifiers.map((n) => BigInt(n))
    // Combine nullifiers and mod them
    const allNullifiers = attestationNullifiers?.concat(epkNullifiers).map((nullifier) => BigInt(nullifier) % BigInt(2 ** _settings.nullifierTreeDepth))

    for (let nullifier of allNullifiers) {
        if (nullifier > BigInt(0)) {
            assert(nullifier < BigInt(2 ** _settings.nullifierTreeDepth), `Nullifier(${nullifier}) larger than max leaf value(2**nullifierTreeDepth)`)
            const findNullifier = await NullifierTreeLeaves.findOne({nullifier: nullifier})
            assert(!findNullifier, `Nullifier(${nullifier}) seen before`)
            const nullifierLeaf = new NullifierTreeLeaves({
                epoch: _toEpoch,
                nullifier: nullifier,
                transactionHash: _transactionHash
            })
            await nullifierLeaf.save()
        }
    }

    const NewLeafInsertedResult = await treeLeaves?.save()

    if(NewLeafInsertedResult && UserStateTransitionedResult){
        console.log('Database: saved user transitioned state and inserted a new GST leaf')
    }

}



export {
    connectDB,
    initDB,
    disconnectDB,
    saveSettingsFromContract,
    genProveReputationCircuitInputsFromDB,
    genProveReputationFromAttesterCircuitInputsFromDB,
    genUserStateTransitionCircuitInputsFromDB,
    updateDBFromNewGSTLeafInsertedEvent,
    updateDBFromAttestationEvent,
    updateDBFromPostSubmittedEvent,
    updateDBFromCommentSubmittedEvent,
    updateDBFromReputationNullifierSubmittedEvent,
    updateDBFromEpochEndedEvent,
    updateDBFromUserStateTransitionEvent,
}