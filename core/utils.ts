// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2305 will be reported.
// @ts-ignore
import { ethers } from 'ethers'
import Keyv from "keyv"
import assert from 'assert'
import { getUnirepContract } from '@unirep/contracts'
import { hash5, hashLeftRight, IncrementalQuinTree, SnarkBigInt, SparseMerkleTreeImpl } from '@unirep/crypto'

import { circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitUserStateTreeDepth, epochTreeDepth, globalStateTreeDepth, userStateTreeDepth } from '../config/testLocal'
import { Attestation, IEpochTreeLeaf, UnirepState } from './UnirepState'
import { IUserStateLeaf, UserState } from './UserState'
import { EPOCH_KEY_NULLIFIER_DOMAIN, REPUTATION_NULLIFIER_DOMAIN } from '../config/nullifierDomainSeparator'

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

const computeInitUserStateRoot = async (treeDepth: number, leafIdx: number, airdropPosRep: number): Promise<BigInt> => {
    const t = await SparseMerkleTreeImpl.create(
        new Keyv(),
        treeDepth,
        defaultUserStateLeaf,
    )
    const leafValue = hash5([BigInt(airdropPosRep), BigInt(0), BigInt(0), BigInt(1)])
    await t.update(BigInt(leafIdx), leafValue)
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
    let epochKey = hash5(values)
    // Adjust epoch key size according to epoch tree depth
    const epochKeyModed = BigInt(epochKey) % BigInt(2 ** _epochTreeDepth)
    return epochKeyModed
}

const genEpochKeyNullifier = (identityNullifier: SnarkBigInt, epoch: number, nonce: number): SnarkBigInt => {
    return hash5([EPOCH_KEY_NULLIFIER_DOMAIN, identityNullifier, BigInt(epoch), BigInt(nonce), BigInt(0)])
}

const genReputationNullifier = (identityNullifier: SnarkBigInt, epoch: number, nonce: number): SnarkBigInt => {
    return hash5([REPUTATION_NULLIFIER_DOMAIN, identityNullifier, BigInt(epoch), BigInt(nonce), BigInt(0)])
}

const genNewSMT = async (treeDepth: number, defaultLeafHash: BigInt): Promise<SparseMerkleTreeImpl> => {
    return SparseMerkleTreeImpl.create(
        new Keyv(),
        treeDepth,
        defaultLeafHash,
    )
}


const verifyNewGSTProofByIndex = async(unirepContract: ethers.Contract, proofIndex: number | ethers.BigNumber): Promise<ethers.Event | void> => {
    const signUpFilter = unirepContract.filters.UserSignUp(proofIndex)
    const signUpEvents = await unirepContract.queryFilter(signUpFilter)
    // found user sign up event, then continue
    if (signUpEvents.length == 1) return signUpEvents[0]

    // 2. verify user state transition proof
    const transitionFilter = unirepContract.filters.UserStateTransitionProof(proofIndex)
    const transitionEvents = await unirepContract.queryFilter(transitionFilter)
    if(transitionEvents.length == 0) return
    // proof index is supposed to be unique, therefore it should be only one event found
    const transitionArgs = transitionEvents[0]?.args?.userTransitionedData
    // backward verification
    const isValid = await unirepContract.verifyUserStateTransition(
        transitionArgs.newGlobalStateTreeLeaf,
        transitionArgs.epkNullifiers,
        transitionArgs.transitionFromEpoch,
        transitionArgs.blindedUserStates,
        transitionArgs.fromGlobalStateTree,
        transitionArgs.blindedHashChains,
        transitionArgs.fromEpochTree,
        transitionArgs.proof,
    )
    if(!isValid) return
    
    const _proofIndexes = transitionEvents[0]?.args?._proofIndexRecords
    // Proof index 0 should be the start transition proof
    const startTransitionFilter = unirepContract.filters.StartedTransitionProof(_proofIndexes[0], transitionArgs.blindedUserStates[0], transitionArgs.fromGlobalStateTree)
    const startTransitionEvents = await unirepContract.queryFilter(startTransitionFilter)
    if(startTransitionEvents.length == 0) return

    const startTransitionArgs = startTransitionEvents[0]?.args
    const isStartTransitionProofValid = await unirepContract.verifyStartTransitionProof(
        startTransitionArgs?._blindedUserState,
        startTransitionArgs?._blindedHashChain,
        startTransitionArgs?._globalStateTree,
        startTransitionArgs?._proof,
    )
    if(!isStartTransitionProofValid) return

    // process attestations proofs
    const isProcessAttestationValid = await verifyProcessAttestationEvents(unirepContract, transitionArgs.blindedUserStates[0], transitionArgs.blindedUserStates[1], _proofIndexes)
    if(!isProcessAttestationValid) return

    return transitionEvents[0]
}

const verifyProcessAttestationEvents = async(unirepContract: ethers.Contract, startBlindedUserState: ethers.BigNumber, finalBlindedUserState: ethers.BigNumber, _proofIndexes: ethers.BigNumber[]): Promise<boolean> => {

    let currentBlindedUserState = startBlindedUserState
    // The rest are process attestations proofs
    for (let i = 1; i < _proofIndexes.length; i++) {
        const processAttestationsFilter = unirepContract.filters.ProcessedAttestationsProof(_proofIndexes[i], currentBlindedUserState)
        const processAttestationsEvents = await unirepContract.queryFilter(processAttestationsFilter)
        if(processAttestationsEvents.length == 0) return false

        const args = processAttestationsEvents[0]?.args
        const isValid = await unirepContract.verifyProcessAttestationProof(
            args?._outputBlindedUserState,
            args?._outputBlindedHashChain,
            args?._inputBlindedUserState,
            args?._proof
        )
        if(!isValid) return false
        currentBlindedUserState = args?._outputBlindedUserState
    }
    return currentBlindedUserState.eq(finalBlindedUserState)
}

const verifyAttestationProofsByIndex = async (unirepContract: ethers.Contract, proofIndex: number | ethers.BigNumber): Promise<any> => {

    const epochKeyProofFilter = unirepContract.filters.EpochKeyProof(proofIndex)
    const epochKeyProofEvent = await unirepContract.queryFilter(epochKeyProofFilter)
    const repProofFilter = unirepContract.filters.ReputationNullifierProof(proofIndex)
    const repProofEvent = await unirepContract.queryFilter(repProofFilter)
    const signUpProofFilter = unirepContract.filters.UserSignedUpProof(proofIndex)
    const signUpProofEvent = await unirepContract.queryFilter(signUpProofFilter)
    let args

    if (epochKeyProofEvent.length == 1){
        console.log('epoch key event')
        args = epochKeyProofEvent[0]?.args?.epochKeyProofData
        const isProofValid = await unirepContract.verifyEpochKeyValidity(
            args?.globalStateTree,
            args?.epoch,
            args?.epochKey,
            args?.proof,
        )
        if (isProofValid) return args
    } else if (repProofEvent.length == 1){
        console.log('rep nullifier event')
        args = repProofEvent[0]?.args?.reputationProofData
        const isProofValid = await unirepContract.verifyReputation(
            args?.repNullifiers,
            args?.epoch,
            args?.epochKey,
            args?.globalStateTree,
            args?.attesterId,
            args?.proveReputationAmount,
            args?.minRep,
            args?.proveGraffiti,
            args?.graffitiPreImage,
            args?.proof,
        )
        if (isProofValid) return args
    } else if (signUpProofEvent.length == 1){
        console.log('sign up event')
        args = signUpProofEvent[0]?.args?.signUpProofData
        const isProofValid = await unirepContract.verifyUserSignUp(
            args?.epoch,
            args?.epochKey,
            args?.globalStateTree,
            args?.attesterId,
            args?.proof,
        )
        if (isProofValid) return args
    }
    return args
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
    startBlock: number,
) => {

    const unirepContract = await getUnirepContract(
        address,
        provider,
    )

    const treeDepths_ = await unirepContract.treeDepths()
    const globalStateTreeDepth = treeDepths_.globalStateTreeDepth
    const userStateTreeDepth = treeDepths_.userStateTreeDepth
    const epochTreeDepth = treeDepths_.epochTreeDepth

    const attestingFee = await unirepContract.attestingFee()
    const epochLength = await unirepContract.epochLength()
    const numEpochKeyNoncePerEpoch = await unirepContract.numEpochKeyNoncePerEpoch()
    const maxRepuationBudget = await unirepContract.maxReputationBudget()

    const unirepState = new UnirepState(
        ethers.BigNumber.from(globalStateTreeDepth).toNumber(),
        ethers.BigNumber.from(userStateTreeDepth).toNumber(),
        ethers.BigNumber.from(epochTreeDepth).toNumber(),
        attestingFee,
        ethers.BigNumber.from(epochLength).toNumber(),
        ethers.BigNumber.from(numEpochKeyNoncePerEpoch).toNumber(),
        ethers.BigNumber.from(maxRepuationBudget).toNumber(),
    )

    const newGSTLeafInsertedFilter = unirepContract.filters.NewGSTLeafInserted()
    const newGSTLeafInsertedEvents =  await unirepContract.queryFilter(newGSTLeafInsertedFilter, startBlock)

    const attestationSubmittedFilter = unirepContract.filters.AttestationSubmitted()
    const attestationSubmittedEvents =  await unirepContract.queryFilter(attestationSubmittedFilter, startBlock)

    const epochEndedFilter = unirepContract.filters.EpochEnded()
    const epochEndedEvents =  await unirepContract.queryFilter(epochEndedFilter, startBlock)

    const sequencerFilter = unirepContract.filters.Sequencer()
    const sequencerEvents =  await unirepContract.queryFilter(sequencerFilter, startBlock)

    // Reverse the events so pop() can start from the first event
    newGSTLeafInsertedEvents.reverse()
    attestationSubmittedEvents.reverse()
    epochEndedEvents.reverse()

    for (let i = 0; i < sequencerEvents.length; i++) {
        const sequencerEvent = sequencerEvents[i]
        const occurredEvent = sequencerEvent.args?._event
        if (occurredEvent === "NewGSTLeafInserted") {
            const newLeafEvent = newGSTLeafInsertedEvents.pop()
            assert(newLeafEvent !== undefined, `Event sequence mismatch: missing newGSTLeafInsertedEvent`)
            
            const proofIndex = newLeafEvent.args?._proofIndex
            const isValidEvent = await verifyNewGSTProofByIndex(unirepContract, proofIndex)
            if (isValidEvent == undefined) {
                console.log('Proof is invalid')
                continue
            }
            const newLeaf = BigInt(newLeafEvent.args?._hashedLeaf)

            if (isValidEvent.event == "UserSignUp"){
                // update Unirep State
                unirepState.signUp(unirepState.currentEpoch, newLeaf)
            } else if (isValidEvent.event == "UserStateTransitionProof") {
                const args = isValidEvent?.args?.userTransitionedData
                const GSTRoot = args?.fromGlobalStateTree
                const epoch = args?.transitionFromEpoch
                const isGSTRootExisted = unirepState.GSTRootExists(GSTRoot, epoch)
                if(!isGSTRootExisted) {
                    console.log('Global state tree root does not exist')
                    continue
                }

                // Check if epoch tree root matches
                const epochTreeRoot = args?.fromEpochTree
                const isEpochTreeExisted = unirepState.epochTreeRootExists(epochTreeRoot, epoch)
                if(!isEpochTreeExisted){
                    console.log('Epoch tree root mismatches')
                    continue
                }

                const epkNullifiersInEvent = isValidEvent.args?.userTransitionedData.epkNullifiers
                unirepState.userStateTransition(unirepState.currentEpoch, BigInt(newLeaf), epkNullifiersInEvent)
            }
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
            const proofIndex = args?._proofIndex
            const results = await verifyAttestationProofsByIndex(unirepContract, proofIndex)
            if (results == undefined) {
                console.log('Proof is invalid')
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
                unirepState.addAttestation(epochKey.toString(), attestation)
                if (results?.repNullifiers == undefined) continue
                for (let nullifier of results?.repNullifiers) {
                    unirepState.addReputationNullifiers(nullifier)
                }
            }
        } else if (occurredEvent === "EpochEnded") {
            const epochEndedEvent = epochEndedEvents.pop()
            assert(epochEndedEvent !== undefined, `Event sequence mismatch: missing epochEndedEvent`)
            const epoch = epochEndedEvent.args?._epoch.toNumber()
            assert(
                epoch === unirepState.currentEpoch,
                `Ended epoch (${epoch}) does not match current epoch (${unirepState.currentEpoch})`
            )
            await unirepState.epochTransition(epoch)
        } else {
            throw new Error(`Unexpected event: ${occurredEvent}`)
        }
    }
    assert(newGSTLeafInsertedEvents.length == 0, `${newGSTLeafInsertedEvents.length} newGSTLeafInsert events left unprocessed`)
    assert(attestationSubmittedEvents.length == 0, `${attestationSubmittedEvents.length} attestationSubmitted events left unprocessed`)
    assert(epochEndedEvents.length == 0, `${epochEndedEvents.length} newGSTLeafInsert events left unprocessed`)
    return unirepState
}

/*
 * Create UserState object from given user state and
 * retrieves and parses on-chain Unirep contract data to create an off-chain
 * representation as a UserState object (including UnirepState object).
 * (This assumes user has already signed up in the Unirep contract)
 * @param provider An Ethereum provider
 * @param address The address of the Unirep contract
 * @param startBlock The block number when Unirep contract is deployed
 * @param userIdentity The semaphore identity of the user
 * @param userIdentityCommitment Commitment of the userIdentity
 * @param latestTransitionedEpoch Latest epoch user has transitioned to
 * @param latestGSTLeafIndex Leaf index in the global state tree of the latest epoch user has transitioned to
 * @param latestUserStateLeaves User state leaves (empty if no attestations received)
 * @param latestEpochKeys User's epoch keys of the epoch user has transitioned to
 */
const genUserStateFromParams = async (
    provider: ethers.providers.Provider,
    address: string,
    startBlock: number,
    userIdentity: any,
    userIdentityCommitment: any,
    transitionedPosRep: number,
    transitionedNegRep: number,
    currentEpochPosRep: number,
    currentEpochNegRep: number,
    latestTransitionedEpoch: number,
    latestGSTLeafIndex: number,
    latestUserStateLeaves?: IUserStateLeaf[],
) => {
    const unirepState = await genUnirepStateFromContract(
        provider,
        address,
        startBlock,
    )
    const userState = new UserState(
        unirepState,
        userIdentity,
        userIdentityCommitment,
        true,
        transitionedPosRep,
        transitionedNegRep,
        currentEpochPosRep,
        currentEpochNegRep,
        latestTransitionedEpoch,
        latestGSTLeafIndex,
        latestUserStateLeaves,
    )
    return userState
}

/*
 * This function works mostly the same as genUnirepStateFromContract,
 * except that it also updates the user's state during events processing.
 * @param provider An Ethereum provider
 * @param address The address of the Unirep contract
 * @param startBlock The block number when Unirep contract is deployed
 * @param userIdentity The semaphore identity of the user
 * @param userIdentityCommitment Commitment of the userIdentity
 */
const _genUserStateFromContract = async (
    provider: ethers.providers.Provider,
    address: string,
    startBlock: number,
    userIdentity: any,
    userIdentityCommitment: any,
) => {

    const unirepContract = await getUnirepContract(address, provider)

    const treeDepths_ = await unirepContract.treeDepths()
    const globalStateTreeDepth = treeDepths_.globalStateTreeDepth
    const userStateTreeDepth = treeDepths_.userStateTreeDepth
    const epochTreeDepth = treeDepths_.epochTreeDepth
    const attestingFee = await unirepContract.attestingFee()
    const epochLength = await unirepContract.epochLength()
    const numEpochKeyNoncePerEpoch = await unirepContract.numEpochKeyNoncePerEpoch()
    const maxRepuationBudget = await unirepContract.maxReputationBudget()

    const unirepState = new UnirepState(
        ethers.BigNumber.from(globalStateTreeDepth).toNumber(),
        ethers.BigNumber.from(userStateTreeDepth).toNumber(),
        ethers.BigNumber.from(epochTreeDepth).toNumber(),
        attestingFee,
        ethers.BigNumber.from(epochLength).toNumber(),
        ethers.BigNumber.from(numEpochKeyNoncePerEpoch).toNumber(),
        ethers.BigNumber.from(maxRepuationBudget).toNumber(),
    )

    const userState = new UserState(
        unirepState,
        userIdentity,
        userIdentityCommitment,
        false,
    )

    const newGSTLeafInsertedFilter = unirepContract.filters.NewGSTLeafInserted()
    const newGSTLeafInsertedEvents =  await unirepContract.queryFilter(newGSTLeafInsertedFilter, startBlock)

    const attestationSubmittedFilter = unirepContract.filters.AttestationSubmitted()
    const attestationSubmittedEvents =  await unirepContract.queryFilter(attestationSubmittedFilter, startBlock)

    const epochEndedFilter = unirepContract.filters.EpochEnded()
    const epochEndedEvents =  await unirepContract.queryFilter(epochEndedFilter, startBlock)

    const sequencerFilter = unirepContract.filters.Sequencer()
    const sequencerEvents =  await unirepContract.queryFilter(sequencerFilter, startBlock)

    // Reverse the events so pop() can start from the first event
    newGSTLeafInsertedEvents.reverse()
    attestationSubmittedEvents.reverse()
    epochEndedEvents.reverse()
    // Variables used to keep track of data required for user to transition
    let userHasSignedUp = false
    let currentEpochGSTLeafIndexToInsert = 0
    let epkNullifiers: BigInt[] = []
    for (let i = 0; i < sequencerEvents.length; i++) {
        const sequencerEvent = sequencerEvents[i]
        const occurredEvent = sequencerEvent.args?._event
        if (occurredEvent === "NewGSTLeafInserted") {
            const newLeafEvent = newGSTLeafInsertedEvents.pop()
            assert(newLeafEvent !== undefined, `Event sequence mismatch: missing newGSTLeafInsertedEvent`)
            
            const proofIndex = newLeafEvent.args?._proofIndex
            const isValidEvent = await verifyNewGSTProofByIndex(unirepContract, proofIndex)
            if (isValidEvent == undefined) {
                console.log('Proof is invalid')
                continue
            }
            const newLeaf = BigInt(newLeafEvent.args?._hashedLeaf)
            
            if (isValidEvent.event == "UserSignUp"){
                // update Unirep State
                unirepState.signUp(unirepState.currentEpoch, newLeaf)

                // update User State
                const commitment = BigInt(isValidEvent?.args?._identityCommitment)
                if(userIdentityCommitment == commitment) {
                    const attesterId = isValidEvent.args?._attesterId.toNumber()
                    const airdropPosRep = isValidEvent.args?._airdropAmount.toNumber()
                    userState.signUp(unirepState.currentEpoch, currentEpochGSTLeafIndexToInsert, attesterId, airdropPosRep)
                    userHasSignedUp = true
                }
            } else if (isValidEvent.event == "UserStateTransitionProof") {
                const args = isValidEvent?.args?.userTransitionedData
                const GSTRoot = args?.fromGlobalStateTree
                const epoch = args?.transitionFromEpoch
                const isGSTRootExisted = unirepState.GSTRootExists(GSTRoot, epoch)
                if(!isGSTRootExisted) {
                    console.log('Global state tree root does not exist')
                    continue
                }

                // Check if epoch tree root matches
                const epochTreeRoot = args?.fromEpochTree
                const isEpochTreeExisted = unirepState.epochTreeRootExists(epochTreeRoot, epoch)
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

                if (
                    userHasSignedUp &&
                    (args?.transitionFromEpoch.toNumber() === userState.latestTransitionedEpoch)
                ) {
                    let epkNullifiersMatched = 0
                    for (const nullifier of epkNullifiers) {
                        if (epkNullifiersInEvent.indexOf(nullifier) !== -1) epkNullifiersMatched++
                    }
                    // Here we assume all epoch keys are processed in the same epoch. If this assumption does not
                    // stand anymore, below `epkNullifiersMatched` check should be changed.
                    if (epkNullifiersMatched == userState.numEpochKeyNoncePerEpoch) {
                        const newState = await userState.genNewUserStateAfterTransition()
                        userState.transition(newState.newUSTLeaves)
                        // User processed all epoch keys so non-zero GST leaf is generated.
                        if(newState.newGSTLeaf != (newLeaf)) {
                            console.log('New GST leaf mismatch')
                            break
                        }
                        // User transition to this epoch, increment (next) GST leaf index
                        currentEpochGSTLeafIndexToInsert ++
                    } else if (epkNullifiersMatched > 0) {
                        throw new Error(`Number of epoch key nullifiers matched ${epkNullifiersMatched} not equal to numEpochKeyNoncePerEpoch ${numEpochKeyNoncePerEpoch}`)
                    }
                }
                unirepState.userStateTransition(unirepState.currentEpoch, BigInt(newLeaf), epkNullifiersInEvent)
            }
            currentEpochGSTLeafIndexToInsert ++
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
            const proofIndex = args?._proofIndex
            const results = await verifyAttestationProofsByIndex(unirepContract, proofIndex)
            if (results == undefined) {
                console.log('Proof is invalid')
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
                unirepState.addAttestation(epochKey.toString(), attestation)
                if (results?.repNullifiers == undefined) continue
                for (let nullifier of results?.repNullifiers) {
                    unirepState.addReputationNullifiers(nullifier)
                }
            }
        } else if (occurredEvent === "EpochEnded") {
            const epochEndedEvent = epochEndedEvents.pop()
            assert(epochEndedEvent !== undefined, `Event sequence mismatch: missing epochEndedEvent`)
            const epoch = epochEndedEvent.args?._epoch.toNumber()
            assert(
                epoch === unirepState.currentEpoch,
                `Ended epoch (${epoch}) does not match current epoch (${unirepState.currentEpoch})`
            )
            await unirepState.epochTransition(epoch)
            if (userHasSignedUp) {
                if (epoch === userState.latestTransitionedEpoch) {
                    // Latest epoch user transitioned to ends. Generate nullifiers of all epoch key
                    // so we can identify when user process the epoch keys.
                    epkNullifiers = userState.getEpochKeyNullifiers(epoch)
                }
            }

            // Epoch ends, reset (next) GST leaf index
            currentEpochGSTLeafIndexToInsert = 0
        } else {
            throw new Error(`Unexpected event: ${occurredEvent}`)
        }
    }
    assert(newGSTLeafInsertedEvents.length == 0, `${newGSTLeafInsertedEvents.length} newGSTLeafInsert events left unprocessed`)
    assert(attestationSubmittedEvents.length == 0, `${attestationSubmittedEvents.length} attestationSubmitted events left unprocessed`)
    return userState
}

/*
 * Given user identity and userIdentityCommitment, retrieves and parses on-chain
 * Unirep contract data to create an off-chain representation as a
 * UserState object (including UnirepState object).
 * @param provider An Ethereum provider
 * @param address The address of the Unirep contract
 * @param startBlock The block number when Unirep contract is deployed
 * @param userIdentity The semaphore identity of the user
 * @param userIdentityCommitment Commitment of the userIdentity
 */
const genUserStateFromContract = async (
    provider: ethers.providers.Provider,
    address: string,
    startBlock: number,
    userIdentity: any,
    userIdentityCommitment: any,
) => {
    return await _genUserStateFromContract(
        provider,
        address,
        startBlock,
        userIdentity,
        userIdentityCommitment,
    )
}

export {
    defaultUserStateLeaf,
    SMT_ONE_LEAF,
    SMT_ZERO_LEAF,
    computeEmptyUserStateRoot,
    computeInitUserStateRoot,
    getTreeDepthsForTesting,
    genEpochKey,
    genEpochKeyNullifier,
    genReputationNullifier,
    genNewSMT,
    genUnirepStateFromContract,
    genUserStateFromContract,
    genUserStateFromParams,
    verifyNewGSTProofByIndex,
}