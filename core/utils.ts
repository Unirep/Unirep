// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2305 will be reported.
// @ts-ignore
import { ethers } from 'ethers'
import Keyv from "keyv"
import assert from 'assert'
import { getUnirepContract, Event } from '@unirep/contracts'
import { genIdentityCommitment, hash5, hashLeftRight, IncrementalQuinTree, SnarkBigInt, SparseMerkleTreeImpl } from '@unirep/crypto'

import { circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitUserStateTreeDepth, epochTreeDepth, globalStateTreeDepth, numEpochKeyNoncePerEpoch, userStateTreeDepth } from '../config/testLocal'
import { Attestation, IEpochTreeLeaf, ISettings, IUnirepState, UnirepState } from './UnirepState'
import { IUserState, IUserStateLeaf, Reputation, UserState } from './UserState'
import { EPOCH_KEY_NULLIFIER_DOMAIN, REPUTATION_NULLIFIER_DOMAIN } from '../config/nullifierDomainSeparator'
import { Circuit, verifyProof } from '@unirep/circuits'
import { IAttestation } from '.'
import { DEFAULT_START_BLOCK } from '../cli/defaults'

const defaultUserStateLeaf = hash5([BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)])
const SMT_ZERO_LEAF = hashLeftRight(BigInt(0), BigInt(0))
const SMT_ONE_LEAF = hashLeftRight(BigInt(1), BigInt(0))

const computeEmptyUserStateRoot = (treeDepth: number): BigInt => {
    const t = new IncrementalQuinTree(
        treeDepth,
        defaultUserStateLeaf,
        2,
    )
    return t.root
}

const computeInitUserStateRoot = async (treeDepth: number, leafIdx?: number, airdropPosRep?: number): Promise<BigInt> => {
    const t = await SparseMerkleTreeImpl.create(
        new Keyv(),
        treeDepth,
        defaultUserStateLeaf,
    )
    if (leafIdx && airdropPosRep) {
        const leafValue = hash5([BigInt(airdropPosRep), BigInt(0), BigInt(0), BigInt(1)])
        await t.update(BigInt(leafIdx), leafValue)
    }
    return t.getRootHash()
}

const getTreeDepthsForTesting = (deployEnv: string = "circuit") => {
    if (deployEnv === 'contract') {
        return {
            "userStateTreeDepth": userStateTreeDepth,
            "globalStateTreeDepth": globalStateTreeDepth,
            "epochTreeDepth": epochTreeDepth,
        }
    } else if (deployEnv === 'circuit') {
        return {
            "userStateTreeDepth": circuitUserStateTreeDepth,
            "globalStateTreeDepth": circuitGlobalStateTreeDepth,
            "epochTreeDepth": circuitEpochTreeDepth,
        }
    } else {
        throw new Error('Only contract and circuit testing env are supported')
    }
}

const genEpochKey = (identityNullifier: SnarkBigInt, epoch: number, nonce: number, _epochTreeDepth: number = circuitEpochTreeDepth): SnarkBigInt => {
    const values: any[] = [
        identityNullifier,
        epoch,
        nonce,
        BigInt(0),
        BigInt(0),
    ]
    let epochKey = hash5(values).toString()
    // Adjust epoch key size according to epoch tree depth
    const epochKeyModed = BigInt(epochKey) % BigInt(2 ** _epochTreeDepth)
    return epochKeyModed
}

const genEpochKeyNullifier = (identityNullifier: SnarkBigInt, epoch: number, nonce: number): SnarkBigInt => {
    return hash5([EPOCH_KEY_NULLIFIER_DOMAIN, identityNullifier, BigInt(epoch), BigInt(nonce), BigInt(0)])
}

const genReputationNullifier = (identityNullifier: SnarkBigInt, epoch: number, nonce: number, attesterId: BigInt): SnarkBigInt => {
    return hash5([REPUTATION_NULLIFIER_DOMAIN, identityNullifier, BigInt(epoch), BigInt(nonce), attesterId])
}

const genNewSMT = async (treeDepth: number, defaultLeafHash: BigInt): Promise<SparseMerkleTreeImpl> => {
    return SparseMerkleTreeImpl.create(
        new Keyv(),
        treeDepth,
        defaultLeafHash,
    )
}

const formatProofForSnarkjsVerification = (_proof: any) => {
    return {
        pi_a: [
            _proof[0].toString(),
            _proof[1].toString(),
          '1'
        ],
        pi_b: [
          [
            _proof[3].toString(),
            _proof[2].toString()
          ],
          [
            _proof[5].toString(),
            _proof[4].toString()
          ],
          [ '1', '0' ]
        ],
        pi_c: [
            _proof[6].toString(),
            _proof[7].toString(),
          '1'
        ],
        protocol: 'groth16',
        curve: 'bn128'
      }
}

const verifyEpochKeyProofEvent = async (event: ethers.Event): Promise<boolean> => {
    const args = event?.args?.epochKeyProofData
    const emptyArray = []
    const formatPublicSignals = emptyArray.concat(
        args?.globalStateTree,
        args?.epoch,
        args?.epochKey,
    ).map(n => BigInt(n))
    const formatProof = formatProofForSnarkjsVerification(args?.proof)
    const isProofValid = await verifyProof(Circuit.verifyEpochKey, formatProof, formatPublicSignals)
    return isProofValid
}

const verifyReputationProofEvent = async (event: ethers.Event): Promise<boolean> => {
    const args = event?.args?.reputationProofData
    const emptyArray = []
    const formatPublicSignals = emptyArray.concat(
        args?.repNullifiers,
        args?.epoch,
        args?.epochKey,
        args?.globalStateTree,
        args?.attesterId,
        args?.proveReputationAmount,
        args?.minRep,
        args?.proveGraffiti,
        args?.graffitiPreImage,
    ).map(n => BigInt(n))
    const formatProof = formatProofForSnarkjsVerification(args?.proof)
    const isProofValid = await verifyProof(Circuit.proveReputation, formatProof, formatPublicSignals)
    return isProofValid
}

const verifySignUpProofEvent = async (event: ethers.Event): Promise<boolean> => {
    const args = event?.args?.signUpProofData
    const emptyArray = []
    const formatPublicSignals = emptyArray.concat(
        args?.epoch,
        args?.epochKey,
        args?.globalStateTree,
        args?.attesterId,
        args?.userHasSignedUp,
    ).map(n => BigInt(n))
    const formatProof = formatProofForSnarkjsVerification(args?.proof)
    const isProofValid = await verifyProof(Circuit.proveUserSignUp, formatProof, formatPublicSignals)
    return isProofValid
}

const verifyStartTransitionProofEvent = async (event: ethers.Event): Promise<boolean> => {
    const args = event?.args
    const emptyArray = []
    const formatPublicSignals = emptyArray.concat(
        args?._blindedUserState,
        args?._blindedHashChain,
        args?._globalStateTree,
    ).map(n => BigInt(n))
    const formatProof = formatProofForSnarkjsVerification(args?._proof)
    const isProofValid = await verifyProof(Circuit.startTransition, formatProof, formatPublicSignals)
    return isProofValid
}

const verifyProcessAttestationEvent = async (event: ethers.Event): Promise<boolean> => {
    const args = event?.args
    const emptyArray = []
    const formatPublicSignals = emptyArray.concat(
        args?._outputBlindedUserState,
        args?._outputBlindedHashChain,
        args?._inputBlindedUserState,
    ).map(n => BigInt(n))
    const formatProof = formatProofForSnarkjsVerification(args?._proof)
    const isProofValid = await verifyProof(Circuit.processAttestations, formatProof, formatPublicSignals)
    return isProofValid
}

const verifyUserStateTransitionEvent = async (event: ethers.Event): Promise<boolean> => {
    const transitionArgs = event?.args?.userTransitionedData
    const emptyArray = []
    let formatPublicSignals = emptyArray.concat(
        transitionArgs.newGlobalStateTreeLeaf,
        transitionArgs.epkNullifiers,
        transitionArgs.transitionFromEpoch,
        transitionArgs.blindedUserStates,
        transitionArgs.fromGlobalStateTree,
        transitionArgs.blindedHashChains,
        transitionArgs.fromEpochTree,
    ).map(n => BigInt(n))
    let formatProof = formatProofForSnarkjsVerification(transitionArgs.proof)
    const isProofValid = await verifyProof(Circuit.userStateTransition, formatProof, formatPublicSignals)
    return isProofValid
}

const verifyUSTEvents = async(transitionEvent: ethers.Event, startTransitionEvent: ethers.Event, processAttestationEvents: ethers.Event[]): Promise<boolean> => {
    // verify the final UST proof
    const isValid = await verifyUserStateTransitionEvent(transitionEvent)
    if(!isValid) return false

    // verify the start transition proof
    const isStartTransitionProofValid = await verifyStartTransitionProofEvent(startTransitionEvent)
    if(!isStartTransitionProofValid) return false

    // verify process attestations proofs
    const transitionArgs = transitionEvent?.args?.userTransitionedData
    const isProcessAttestationValid = await verifyProcessAttestationEvents(processAttestationEvents, transitionArgs.blindedUserStates[0], transitionArgs.blindedUserStates[1])
    if(!isProcessAttestationValid) return false
    return true
}

const verifyProcessAttestationEvents = async(processAttestationEvents: ethers.Event[], startBlindedUserState: ethers.BigNumber, finalBlindedUserState: ethers.BigNumber): Promise<boolean> => {

    let currentBlindedUserState = startBlindedUserState
    // The rest are process attestations proofs
    for (let i = 0; i < processAttestationEvents.length; i++) {
        const args = processAttestationEvents[i]?.args
        const isValid = await verifyProcessAttestationEvent(processAttestationEvents[i])
        if(!isValid) return false
        currentBlindedUserState = args?._outputBlindedUserState
    }
    return currentBlindedUserState.eq(finalBlindedUserState)
}

const genUnirepStateFromParams = (
    _unirepState: IUnirepState,
) => {
    const parsedGSTLeaves = {}
    const parsedEpochTreeLeaves = {}
    const parsedNullifiers = {}
    const parsedAttestationsMap = {}

    for(let key in _unirepState.GSTLeaves){
        parsedGSTLeaves[key] = _unirepState.GSTLeaves[key].map(n => BigInt(n))
    }
        
    for (let key in _unirepState.epochTreeLeaves) {
        const leaves: IEpochTreeLeaf[] = []
        _unirepState.epochTreeLeaves[key].map(
            n => {
                const splitStr = n.split(": ")
                const epochTreeLeaf: IEpochTreeLeaf = {
                    epochKey: BigInt(splitStr[0]),
                    hashchainResult: BigInt(splitStr[1])
                }
                leaves.push(epochTreeLeaf)
            }
        )
        parsedEpochTreeLeaves[key] = leaves
    }
       
    for (let n of _unirepState.nullifiers) {
        parsedNullifiers[n] = true
    }

    for (let key in _unirepState.latestEpochKeyToAttestationsMap) {
        const parsedAttestations: IAttestation[] = []
        for (const attestation of _unirepState.latestEpochKeyToAttestationsMap[key]) {
            const jsonAttestation = JSON.parse(attestation)
            const attestClass = new Attestation(
                BigInt(jsonAttestation.attesterId),
                BigInt(jsonAttestation.posRep),
                BigInt(jsonAttestation.negRep),
                BigInt(jsonAttestation.graffiti),
                BigInt(jsonAttestation.signUp)
            )
            parsedAttestations.push(attestClass)
        }
        parsedAttestationsMap[key] = parsedAttestations
    }
    const unirepState = new UnirepState(
        _unirepState.settings,
        _unirepState.currentEpoch,
        _unirepState.latestProcessedBlock,
        parsedGSTLeaves,
        parsedEpochTreeLeaves,
        parsedAttestationsMap,
        parsedNullifiers,
    )

    return unirepState
}

/*
 * Retrieves and parses on-chain Unirep contract data to create an off-chain
 * representation as a UnirepState object.
 * @param provider An Ethereum provider
 * @param address The address of the Unirep contract
 * @param startBlock The block number when Unirep contract is deployed
 */
const genUnirepStateFromContract = async (
    provider: ethers.providers.Provider,
    address: string,
    _unirepState?: IUnirepState,
) => {

    const unirepContract = await getUnirepContract(
        address,
        provider,
    )
    let unirepState: UnirepState
    
    if(_unirepState === undefined) {
        const treeDepths_ = await unirepContract.treeDepths()
        const globalStateTreeDepth = treeDepths_.globalStateTreeDepth
        const userStateTreeDepth = treeDepths_.userStateTreeDepth
        const epochTreeDepth = treeDepths_.epochTreeDepth

        const attestingFee = await unirepContract.attestingFee()
        const epochLength = await unirepContract.epochLength()
        const numEpochKeyNoncePerEpoch = await unirepContract.numEpochKeyNoncePerEpoch()
        const maxReputationBudget = await unirepContract.maxReputationBudget()
        const emptyUserStateRoot = computeEmptyUserStateRoot(userStateTreeDepth)

        const setting: ISettings = {
            globalStateTreeDepth: globalStateTreeDepth,
            userStateTreeDepth: userStateTreeDepth,
            epochTreeDepth: epochTreeDepth,
            attestingFee: attestingFee,
            epochLength: epochLength.toNumber(),
            numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
            maxReputationBudget: maxReputationBudget,
        }
        unirepState = new UnirepState(
            setting
        )
    } else {
        unirepState = genUnirepStateFromParams(_unirepState)
    }

    const latestBlock = _unirepState?.latestProcessedBlock
    const startBlock = latestBlock != undefined ? latestBlock + 1 : DEFAULT_START_BLOCK

    const UserSignedUpFilter = unirepContract.filters.UserSignedUp()
    const userSignedUpEvents =  await unirepContract.queryFilter(UserSignedUpFilter, startBlock)

    const UserStateTransitionedFilter = unirepContract.filters.UserStateTransitioned()
    const userStateTransitionedEvents = await unirepContract.queryFilter(UserStateTransitionedFilter, startBlock)

    const attestationSubmittedFilter = unirepContract.filters.AttestationSubmitted()
    const attestationSubmittedEvents =  await unirepContract.queryFilter(attestationSubmittedFilter, startBlock)

    const epochEndedFilter = unirepContract.filters.EpochEnded()
    const epochEndedEvents =  await unirepContract.queryFilter(epochEndedFilter, startBlock)

    const sequencerFilter = unirepContract.filters.Sequencer()
    const sequencerEvents =  await unirepContract.queryFilter(sequencerFilter, startBlock)

    // proof events
    const transitionFilter = unirepContract.filters.IndexedUserStateTransitionProof()
    const transitionEvents = await unirepContract.queryFilter(transitionFilter)

    const startTransitionFilter = unirepContract.filters.IndexedStartedTransitionProof()
    const startTransitionEvents = await unirepContract.queryFilter(startTransitionFilter)

    const processAttestationsFilter = unirepContract.filters.IndexedProcessedAttestationsProof()
    const processAttestationsEvents = await unirepContract.queryFilter(processAttestationsFilter)

    const epochKeyProofFilter = unirepContract.filters.IndexedEpochKeyProof()
    const epochKeyProofEvent = await unirepContract.queryFilter(epochKeyProofFilter)

    const repProofFilter = unirepContract.filters.IndexedReputationProof()
    const repProofEvent = await unirepContract.queryFilter(repProofFilter)

    const signUpProofFilter = unirepContract.filters.IndexedUserSignedUpProof()
    const signUpProofEvent = await unirepContract.queryFilter(signUpProofFilter)

    // Reverse the events so pop() can start from the first event
    userSignedUpEvents.reverse()
    attestationSubmittedEvents.reverse()
    epochEndedEvents.reverse()
    userStateTransitionedEvents.reverse()

    const proofIndexMap = {}
    const events = transitionEvents.concat(
        transitionEvents, 
        startTransitionEvents, 
        processAttestationsEvents, 
        epochKeyProofEvent, 
        repProofEvent, 
        signUpProofEvent
    )
    for (const event of events) {
        proofIndexMap[Number(event?.args?._proofIndex)] = event
    }

    for (let i = 0; i < sequencerEvents.length; i++) {
        const sequencerEvent = sequencerEvents[i]
        // console.log('Generating Unirep State progress: ', i, '/', sequencerEvents.length)
        const blockNumber = sequencerEvent.blockNumber
        if(blockNumber < startBlock) continue
        const occurredEvent = sequencerEvent.args?._event
        if (occurredEvent === Event.UserSignedUp) {
            const signUpEvent = userSignedUpEvents.pop()
            if(signUpEvent === undefined) {
                console.log(`Event sequence mismatch: missing newGSTLeafInsertedEvent`)
                continue
            }
            const args = signUpEvent?.args
            const epoch = Number(args?._epoch)
            const commitment = BigInt(args?._identityCommitment)
            const attesterId = Number(args?._attesterId)
            const airdrop = Number(args?._airdropAmount)

            await unirepState.signUp(epoch, commitment, attesterId, airdrop, blockNumber)
        } else if (occurredEvent === Event.AttestationSubmitted) {

        } else if (occurredEvent === Event.EpochEnded) {

        } else if (occurredEvent === Event.UserStateTransitioned) {

        }
        //     const newLeafEvent = newGSTLeafInsertedEvents.pop()
        //     assert(newLeafEvent !== undefined, `Event sequence mismatch: missing newGSTLeafInsertedEvent`)
            
        //     const proofIndex = Number(newLeafEvent.args?._proofIndex)
        //     const newLeaf = BigInt(newLeafEvent.args?._hashedLeaf)
        //     const event = proofIndexMap[proofIndex]

        //     if(proofIndex === 0) continue
        //     if (event.event == "UserSignUp"){
        //         unirepState.signUp(unirepState.currentEpoch, newLeaf, blockNumber)
        //     } else if (event.event == "UserStateTransitionProof") {
        //         const proofIndexes = event?.args?._proofIndexRecords.map(n => Number(n))
        //         const startTransitionEvent = proofIndexMap[proofIndexes[0]]
        //         if(startTransitionEvent == undefined) continue
        //         const processAttestationEvents: ethers.Event[] = []
        //         let validAttestationEvent = true
        //         for (let j = 1; j < proofIndexes.length; j++) {
        //             if(proofIndexes[j] === 0) validAttestationEvent = false
        //             processAttestationEvents.push(proofIndexMap[proofIndexes[j]])
        //         }
        //         if(!validAttestationEvent) continue
        //         const isValid = verifyUSTEvents(event, startTransitionEvent, processAttestationEvents)
        //         if(!isValid) {
        //             console.log('Proof is invalid: ', event.event, ' , transaction hash: ', event.transactionHash)
        //             continue
        //         }
        //         const args = event?.args?.userTransitionedData
        //         const GSTRoot = args?.fromGlobalStateTree
        //         const epoch = args?.transitionFromEpoch
        //         const isGSTRootExisted = unirepState.GSTRootExists(GSTRoot, epoch)
        //         if(!isGSTRootExisted) {
        //             console.log('Global state tree root does not exist')
        //             continue
        //         }

        //         // Check if epoch tree root matches
        //         const epochTreeRoot = args?.fromEpochTree
        //         const isEpochTreeExisted = await unirepState.epochTreeRootExists(epochTreeRoot, epoch)
        //         if(!isEpochTreeExisted){
        //             console.log('Epoch tree root mismatches')
        //             continue
        //         }

        //         const epkNullifiersInEvent = args?.epkNullifiers.map(n => BigInt(n))
        //         unirepState.userStateTransition(unirepState.currentEpoch, BigInt(newLeaf), epkNullifiersInEvent, blockNumber)
        //     }
        // } else if (occurredEvent === "AttestationSubmitted") {
        //     const attestationEvent = attestationSubmittedEvents.pop()
        //     assert(attestationEvent !== undefined, `Event sequence mismatch: missing attestationSubmittedEvent`)
        //     const args = attestationEvent.args
        //     const epoch = args?._epoch.toNumber()
        //     assert(
        //         epoch === unirepState.currentEpoch,
        //         `Attestation epoch (${epoch}) does not match current epoch (${unirepState.currentEpoch})`
        //     )

        //     const _attestation = args?.attestation
        //     const proofIndex = Number(args?._proofIndex)
        //     let results
        //     let isProofValid = false
        //     const event = proofIndexMap[proofIndex]
        //     if(proofIndex === 0) continue
        //     if(event.event == "EpochKeyProof") {
        //         results = event?.args?.epochKeyProofData
        //         isProofValid = await verifyEpochKeyProofEvent(event)
        //     } else if (event.event == "ReputationNullifierProof") {
        //         results = event?.args?.reputationProofData
        //         isProofValid = await verifyReputationProofEvent(event)
        //     } else if (event.event == "UserSignedUpProof") {
        //         results = event?.args?.signUpProofData
        //         isProofValid = await verifySignUpProofEvent(event)
        //     } else {
        //         console.log('Cannot find the attestation event')
        //         continue
        //     }

        //     if(!isProofValid) {
        //         console.log('Proof is invalid: ', attestationEvent.event, ' , transaction hash: ', attestationEvent.transactionHash)
        //         continue
        //     }

        //     const isGSTRootExisted = unirepState.GSTRootExists(results?.globalStateTree, epoch)
        //     if(!isGSTRootExisted) {
        //         console.log('Global state tree root does not exist')
        //         continue
        //     }

        //     const attestation = new Attestation(
        //         BigInt(_attestation.attesterId),
        //         BigInt(_attestation.posRep),
        //         BigInt(_attestation.negRep),
        //         BigInt(_attestation.graffiti),
        //         BigInt(_attestation.signUp)
        //     )
        //     const epochKey = args?._epochKey
        //     if (epochKey.eq(results?.epochKey)){
        //         if(args?._event === "spendReputation") {
        //             let validNullifier = true
        //             for (let nullifier of results?.repNullifiers) {
        //                 if(unirepState.nullifierExist(nullifier)) {
        //                     console.log('duplicated nullifier', BigInt(nullifier).toString())
        //                     validNullifier = false
        //                     break
        //                 }
        //             }
        //             if (validNullifier) {
        //                 for (let nullifier of results?.repNullifiers) {
        //                     unirepState.addReputationNullifiers(nullifier, blockNumber)
        //                 }
        //             } else continue
        //         }
        //         unirepState.addAttestation(epochKey.toString(), attestation, blockNumber)
        //     }
        // } else if (occurredEvent === "EpochEnded") {
        //     const epochEndedEvent = epochEndedEvents.pop()
        //     assert(epochEndedEvent !== undefined, `Event sequence mismatch: missing epochEndedEvent`)
        //     const epoch = epochEndedEvent.args?._epoch.toNumber()
        //     assert(
        //         epoch === unirepState.currentEpoch,
        //         `Ended epoch (${epoch}) does not match current epoch (${unirepState.currentEpoch})`
        //     )
        //     await unirepState.epochTransition(epoch, blockNumber)
        // } else {
        //     throw new Error(`Unexpected event: ${occurredEvent}`)
        // }
    }
    // if(newGSTLeafInsertedEvents.length !== 0) {
    //     console.log(`${newGSTLeafInsertedEvents.length} newGSTLeafInsert events left unprocessed`)
    // }
    // if(attestationSubmittedEvents.length !== 0) {
    //     console.log(`${attestationSubmittedEvents.length} attestationSubmitted events left unprocessed`)
    // }
    return unirepState
}

/*
 * Create UserState object from given user state and
 * retrieves and parses on-chain Unirep contract data to create an off-chain
 * representation as a UserState object (including UnirepState object).
 * (This assumes user has already signed up in the Unirep contract)
 * @param userIdentity The semaphore identity of the user
 * @param _userState The stored user state that the function start with
 */
const genUserStateFromParams = (
    userIdentity: any,
    _userState: IUserState,
) => {
    const unirepState = genUnirepStateFromParams(_userState.unirepState)
    const userStateLeaves: IUserStateLeaf[] = []
    const transitionedFromAttestations: {[key: string]: IAttestation[]} = {}
    for (const key in _userState.latestUserStateLeaves) {
        const parsedLeaf = JSON.parse(_userState.latestUserStateLeaves[key])
        const leaf: IUserStateLeaf = {
            attesterId: BigInt(key),
            reputation: new Reputation(
                BigInt(parsedLeaf.posRep),
                BigInt(parsedLeaf.negRep),
                BigInt(parsedLeaf.graffiti),
                BigInt(parsedLeaf.signUp),
            )
        }
        userStateLeaves.push(leaf)
    }
    for (const key in _userState.transitionedFromAttestations) {
        transitionedFromAttestations[key] = []
        for (const attest of _userState.transitionedFromAttestations[key]) {
            const parsedAttest = JSON.parse(attest)
            const attestation: IAttestation = new Attestation(
                BigInt(parsedAttest.attesterId),
                BigInt(parsedAttest.posRep),
                BigInt(parsedAttest.negRep),
                BigInt(parsedAttest.graffiti),
                BigInt(parsedAttest.signUp),
            )
            transitionedFromAttestations[key].push(attestation)
        }
    }
    const userState = new UserState(
        unirepState, 
        userIdentity,
        _userState.hasSignedUp,
        _userState.latestTransitionedEpoch,
        _userState.latestGSTLeafIndex,
        userStateLeaves,
        transitionedFromAttestations,
    )
    return userState
}

/*
 * This function works mostly the same as genUnirepStateFromContract,
 * except that it also updates the user's state during events processing.
 * @param provider An Ethereum provider
 * @param address The address of the Unirep contract
 * @param userIdentity The semaphore identity of the user
 * @param _userState The stored user state that the function start with
 */
const genUserStateFromContract = async (
    provider: ethers.providers.Provider,
    address: string,
    userIdentity: any,
    _userState?: IUserState,
) => {

    const unirepContract = await getUnirepContract(address, provider)

    let unirepState: UnirepState
    let userState: UserState
    const userIdentityCommitment = genIdentityCommitment(userIdentity)

    if(_userState === undefined) {
        const treeDepths_ = await unirepContract.treeDepths()
        const globalStateTreeDepth = treeDepths_.globalStateTreeDepth
        const userStateTreeDepth = treeDepths_.userStateTreeDepth
        const epochTreeDepth = treeDepths_.epochTreeDepth

        const attestingFee = await unirepContract.attestingFee()
        const epochLength = await unirepContract.epochLength()
        const numEpochKeyNoncePerEpoch = await unirepContract.numEpochKeyNoncePerEpoch()
        const maxReputationBudget = await unirepContract.maxReputationBudget()

        const setting: ISettings = {
            globalStateTreeDepth: globalStateTreeDepth,
            userStateTreeDepth: userStateTreeDepth,
            epochTreeDepth: epochTreeDepth,
            attestingFee: attestingFee,
            epochLength: epochLength.toNumber(),
            numEpochKeyNoncePerEpoch: numEpochKeyNoncePerEpoch,
            maxReputationBudget: maxReputationBudget,
        }
        unirepState = new UnirepState(
            setting
        )
        userState = new UserState(
            unirepState,
            userIdentity,
            false,
        )
    } else {
        userState = genUserStateFromParams(userIdentity, _userState)
        unirepState = userState.getUnirepState()
    }

    const latestBlock = _userState?.unirepState.latestProcessedBlock
    const startBlock = latestBlock != undefined ? latestBlock + 1 : DEFAULT_START_BLOCK

    const newGSTLeafInsertedFilter = unirepContract.filters.NewGSTLeafInserted()
    const newGSTLeafInsertedEvents =  await unirepContract.queryFilter(newGSTLeafInsertedFilter, startBlock)

    const attestationSubmittedFilter = unirepContract.filters.AttestationSubmitted()
    const attestationSubmittedEvents =  await unirepContract.queryFilter(attestationSubmittedFilter, startBlock)

    const epochEndedFilter = unirepContract.filters.EpochEnded()
    const epochEndedEvents =  await unirepContract.queryFilter(epochEndedFilter, startBlock)

    const sequencerFilter = unirepContract.filters.Sequencer()
    const sequencerEvents =  await unirepContract.queryFilter(sequencerFilter, startBlock)

    // proof events
    const signUpFilter = unirepContract.filters.UserSignUp()
    const signUpEvents = await unirepContract.queryFilter(signUpFilter)

    const transitionFilter = unirepContract.filters.UserStateTransitionProof()
    const transitionEvents = await unirepContract.queryFilter(transitionFilter)

    const startTransitionFilter = unirepContract.filters.StartedTransitionProof()
    const startTransitionEvents = await unirepContract.queryFilter(startTransitionFilter)

    const processAttestationsFilter = unirepContract.filters.ProcessedAttestationsProof()
    const processAttestationsEvents = await unirepContract.queryFilter(processAttestationsFilter)

    const epochKeyProofFilter = unirepContract.filters.EpochKeyProof()
    const epochKeyProofEvent = await unirepContract.queryFilter(epochKeyProofFilter)

    const repProofFilter = unirepContract.filters.ReputationNullifierProof()
    const repProofEvent = await unirepContract.queryFilter(repProofFilter)

    const signUpProofFilter = unirepContract.filters.UserSignedUpProof()
    const signUpProofEvent = await unirepContract.queryFilter(signUpProofFilter)

    // Reverse the events so pop() can start from the first event
    newGSTLeafInsertedEvents.reverse()
    attestationSubmittedEvents.reverse()
    epochEndedEvents.reverse()

    const proofIndexMap = {}
    const events = signUpEvents.concat(
        transitionEvents, 
        startTransitionEvents, 
        processAttestationsEvents, 
        epochKeyProofEvent, 
        repProofEvent, 
        signUpProofEvent
    )
    for (const event of events) {
        proofIndexMap[Number(event?.args?._proofIndex)] = event
    }

    // Variables used to keep track of data required for user to transition
    let userHasSignedUp = _userState?.hasSignedUp === undefined ? false : _userState?.hasSignedUp
    let currentEpochGSTLeafIndexToInsert = 0
    let epkNullifiers: BigInt[] = []
    for (let i = 0; i < sequencerEvents.length; i++) {
        // console.log('Generating User State progress: ', i, '/', sequencerEvents.length)
        const sequencerEvent = sequencerEvents[i]
        const blockNumber = sequencerEvent.blockNumber
        if(blockNumber < startBlock) continue
        const occurredEvent = sequencerEvent.args?._event
        if (occurredEvent === "NewGSTLeafInserted") {
            const newLeafEvent = newGSTLeafInsertedEvents.pop()
            assert(newLeafEvent !== undefined, `Event sequence mismatch: missing newGSTLeafInsertedEvent`)
            
            const proofIndex = Number(newLeafEvent.args?._proofIndex)
            const newLeaf = BigInt(newLeafEvent.args?._hashedLeaf)
            const event = proofIndexMap[proofIndex]

            if(proofIndex === 0) continue
            if (event.event == "UserSignUp"){
                // update Unirep State
                // unirepState.signUp(unirepState.currentEpoch, newLeaf, blockNumber)

                // update User State
                const commitment = BigInt(event?.args?._identityCommitment)
                if(userIdentityCommitment == commitment) {
                    const attesterId = event.args?._attesterId.toNumber()
                    const airdropPosRep = event.args?._airdropAmount.toNumber()
                    await userState.signUp(
                        unirepState.currentEpoch,
                        commitment, 
                        attesterId, 
                        airdropPosRep
                    )
                    userHasSignedUp = true
                }
            } else if (event.event == "UserStateTransitionProof") {
                const proofIndexes = event?.args?._proofIndexRecords.map(n => Number(n))
                const startTransitionEvent = proofIndexMap[proofIndexes[0]]
                if(startTransitionEvent == undefined) continue
                const processAttestationEvents: ethers.Event[] = []
                let validAttestationEvent = true
                for (let j = 1; j < proofIndexes.length; j++) {
                    if(proofIndexes[j] === 0) validAttestationEvent = false
                    processAttestationEvents.push(proofIndexMap[proofIndexes[j]])
                }
                if(!validAttestationEvent) continue
                const isValid = verifyUSTEvents(event, startTransitionEvent, processAttestationEvents)
                if(!isValid) {
                    console.log('Proof is invalid: ', event.event, ' , transaction hash: ', event.transactionHash)
                    continue
                }
                const args = event?.args?.userTransitionedData
                const GSTRoot = args?.fromGlobalStateTree
                const fromEpoch = Number(args?.transitionFromEpoch)
                const isGSTRootExisted = unirepState.GSTRootExists(GSTRoot, fromEpoch)
                if(!isGSTRootExisted) {
                    console.log('Global state tree root does not exist')
                    continue
                }

                // Check if epoch tree root matches
                const epochTreeRoot = args?.fromEpochTree
                const isEpochTreeExisted = await unirepState.epochTreeRootExists(epochTreeRoot, fromEpoch)
                if(!isEpochTreeExisted){
                    console.log('Epoch tree root mismatches')
                    continue
                }

                const epkNullifiersInEvent = args?.epkNullifiers.map(n => BigInt(n))

                let isNullifierSeen = false
                // Verify nullifiers are not seen before
                for (const nullifier of epkNullifiersInEvent) {
                    if (nullifier === BigInt(0)) continue
                    else {
                        if (userState.nullifierExist(nullifier)) {
                            isNullifierSeen = true
                            // If nullifier exists, the proof is considered invalid
                            console.log(`Invalid UserStateTransitioned proof: seen nullifier ${nullifier.toString()}`)
                            break
                        }
                    }
                }
                if (isNullifierSeen) continue

                // if (
                //     userHasSignedUp &&
                //     (args?.transitionFromEpoch.toNumber() === userState.latestTransitionedEpoch)
                // ) {
                //     // Latest epoch user transitioned to ends. Generate nullifiers of all epoch key
                //     epkNullifiers = userState.getEpochKeyNullifiers(epoch)
                //     let epkNullifiersMatched = 0
                //     for (const nullifier of epkNullifiers) {
                //         if (epkNullifiersInEvent.indexOf(nullifier) !== -1) epkNullifiersMatched++
                //     }
                //     // Here we assume all epoch keys are processed in the same epoch. If this assumption does not
                //     // stand anymore, below `epkNullifiersMatched` check should be changed.
                //     if (epkNullifiersMatched == userState.numEpochKeyNoncePerEpoch) {
                //         // const newState = await userState.genNewUserStateAfterTransition()
                //         await userState.transition(newLeaf)
                //         // User processed all epoch keys so non-zero GST leaf is generated.
                //         // if(newState.newGSTLeaf != (newLeaf)) {
                //         //     console.log('New GST leaf mismatch')
                //         //     continue
                //         // }
                //         // User transition to this epoch, increment (next) GST leaf index
                //         currentEpochGSTLeafIndexToInsert ++
                //     } else if (epkNullifiersMatched > 0) {
                //         throw new Error(`Number of epoch key nullifiers matched ${epkNullifiersMatched} not equal to numEpochKeyNoncePerEpoch ${numEpochKeyNoncePerEpoch}`)
                //     }
                // }
                await userState.userStateTransition(fromEpoch, BigInt(newLeaf), epkNullifiersInEvent, blockNumber)
            }
            // currentEpochGSTLeafIndexToInsert ++
        } else if (occurredEvent === "AttestationSubmitted") {
            const attestationEvent = attestationSubmittedEvents.pop()
            assert(attestationEvent !== undefined, `Event sequence mismatch: missing attestationSubmittedEvent`)
            const args = attestationEvent.args
            const epoch = args?._epoch.toNumber()
            assert(
                epoch === unirepState.currentEpoch,
                `Attestation epoch (${epoch}) does not match current epoch (${unirepState.currentEpoch})`
            )

            const _attestation = args?.attestation
            const proofIndex = Number(args?._proofIndex)
            let results
            let isProofValid = false
            const event = proofIndexMap[proofIndex]

            if(proofIndex === 0) continue
            if(event.event == "EpochKeyProof") {
                results = event?.args?.epochKeyProofData
                isProofValid = await verifyEpochKeyProofEvent(event)
            } else if (event.event == "ReputationNullifierProof") {
                results = event?.args?.reputationProofData
                isProofValid = await verifyReputationProofEvent(event)
            } else if (event.event == "UserSignedUpProof") {
                results = event?.args?.signUpProofData
                isProofValid = await verifySignUpProofEvent(event)
            } else {
                console.log('Cannot find the attestation event')
                continue
            }

            if(!isProofValid) {
                console.log('Proof is invalid: ', attestationEvent.event, ' , transaction hash: ', attestationEvent.transactionHash)
                continue
            }

            const isGSTRootExisted = unirepState.GSTRootExists(results?.globalStateTree, epoch)
            if(!isGSTRootExisted) {
                console.log('Global state tree root does not exist')
                continue
            }

            const attestation = new Attestation(
                BigInt(_attestation.attesterId),
                BigInt(_attestation.posRep),
                BigInt(_attestation.negRep),
                BigInt(_attestation.graffiti),
                BigInt(_attestation.signUp)
            )
            const epochKey = args?._epochKey
            if (epochKey.eq(results?.epochKey)){
                if(args?._event === "spendReputation") {
                    let validNullifier = true
                    for (let nullifier of results?.repNullifiers) {
                        if(unirepState.nullifierExist(nullifier)) {
                            console.log('duplicated nullifier', BigInt(nullifier).toString())
                            validNullifier = false
                            break
                        }
                    }
                    if (validNullifier) {
                        for (let nullifier of results?.repNullifiers) {
                            userState.addReputationNullifiers(nullifier, blockNumber)
                        }
                    } else continue
                }
                userState.addAttestation(epochKey.toString(), attestation, blockNumber)
            }
        } else if (occurredEvent === "EpochEnded") {
            const epochEndedEvent = epochEndedEvents.pop()
            assert(epochEndedEvent !== undefined, `Event sequence mismatch: missing epochEndedEvent`)
            const epoch = epochEndedEvent.args?._epoch.toNumber()
            assert(
                epoch === userState.getUnirepStateCurrentEpoch(),
                `Ended epoch (${epoch}) does not match current epoch (${userState.getUnirepStateCurrentEpoch()})`
            )
            await userState.epochTransition(epoch, blockNumber)
            // if (userHasSignedUp) {
            //     if (epoch === userState.latestTransitionedEpoch) {
            //         // save latest attestations in user state
            //         userState.saveAttestations()
            //     }
            // }

            // Epoch ends, reset (next) GST leaf index
            currentEpochGSTLeafIndexToInsert = 0
        } else {
            throw new Error(`Unexpected event: ${occurredEvent}`)
        }
    }
    if(newGSTLeafInsertedEvents.length !== 0) {
        console.log(`${newGSTLeafInsertedEvents.length} newGSTLeafInsert events left unprocessed`)
    }
    if(attestationSubmittedEvents.length !== 0) {
        console.log(`${attestationSubmittedEvents.length} attestationSubmitted events left unprocessed`)
    }
    return userState
}


export {
    defaultUserStateLeaf,
    SMT_ONE_LEAF,
    SMT_ZERO_LEAF,
    computeEmptyUserStateRoot,
    computeInitUserStateRoot,
    getTreeDepthsForTesting,
    formatProofForSnarkjsVerification,
    verifyEpochKeyProofEvent,
    verifyReputationProofEvent,
    verifySignUpProofEvent,
    verifyStartTransitionProofEvent,
    verifyProcessAttestationEvent,
    verifyProcessAttestationEvents,
    verifyUserStateTransitionEvent,
    verifyUSTEvents,
    genEpochKey,
    genEpochKeyNullifier,
    genReputationNullifier,
    genNewSMT,
    genUnirepStateFromContract,
    genUnirepStateFromParams,
    genUserStateFromContract,
    genUserStateFromParams,
}