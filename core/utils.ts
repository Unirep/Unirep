// The reason for the ts-ignore below is that if we are executing the code via `ts-node` instead of `hardhat`,
// it can not read the hardhat config and error ts-2305 will be reported.
// @ts-ignore
import { ethers } from 'ethers'
import Keyv from "keyv"
import assert from 'assert'
import { getUnirepContract } from '@unirep/contracts'
import { hash5, hashLeftRight, IncrementalQuinTree, SnarkBigInt, SparseMerkleTreeImpl } from '@unirep/crypto'

import { circuitEpochTreeDepth, circuitGlobalStateTreeDepth, circuitNullifierTreeDepth, circuitUserStateTreeDepth, epochTreeDepth, globalStateTreeDepth, nullifierTreeDepth, userStateTreeDepth } from '../config/testLocal'
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
    const leafValue = hash5([BigInt(airdropPosRep)])
    await t.update(BigInt(leafIdx), leafValue)
    return t.getRootHash()
}

const getTreeDepthsForTesting = (deployEnv: string = "circuit") => {
    if (deployEnv === 'contract') {
        return {
            "userStateTreeDepth": userStateTreeDepth,
            "globalStateTreeDepth": globalStateTreeDepth,
            "epochTreeDepth": epochTreeDepth,
            "nullifierTreeDepth": nullifierTreeDepth,
        }
    } else if (deployEnv === 'circuit') {
        return {
            "userStateTreeDepth": circuitUserStateTreeDepth,
            "globalStateTreeDepth": circuitGlobalStateTreeDepth,
            "epochTreeDepth": circuitEpochTreeDepth,
            "nullifierTreeDepth": circuitNullifierTreeDepth,
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

    const nullifierSubmittedFilter = unirepContract.filters.ReputationNullifierSubmitted()
    const nullifierSubmittedEvents =  await unirepContract.queryFilter(nullifierSubmittedFilter, startBlock)

    const epochEndedFilter = unirepContract.filters.EpochEnded()
    const epochEndedEvents =  await unirepContract.queryFilter(epochEndedFilter, startBlock)

    const startedTransitionFilter = unirepContract.filters.StartedTransition()
    const startedTransitionEvents =  await unirepContract.queryFilter(startedTransitionFilter, startBlock)

    const processedAttestationsFilter = unirepContract.filters.ProcessedAttestations()
    const processedAttestationsEvents =  await unirepContract.queryFilter(processedAttestationsFilter, startBlock)

    const userStateTransitionedFilter = unirepContract.filters.UserStateTransitioned()
    const userStateTransitionedEvents =  await unirepContract.queryFilter(userStateTransitionedFilter, startBlock)

    const sequencerFilter = unirepContract.filters.Sequencer()
    const sequencerEvents =  await unirepContract.queryFilter(sequencerFilter, startBlock)

    // Reverse the events so pop() can start from the first event
    newGSTLeafInsertedEvents.reverse()
    attestationSubmittedEvents.reverse()
    nullifierSubmittedEvents.reverse()
    epochEndedEvents.reverse()
    startedTransitionEvents.reverse()
    processedAttestationsEvents.reverse()
    userStateTransitionedEvents.reverse()
    for (let i = 0; i < sequencerEvents.length; i++) {
        const sequencerEvent = sequencerEvents[i]
        const occurredEvent = sequencerEvent.args?._event
        if (occurredEvent === "UserSignUp") {
            const newLeafEvent = newGSTLeafInsertedEvents.pop()
            assert(newLeafEvent !== undefined, `Event sequence mismatch: missing newGSTLeafInsertedEvent`)

            const newLeaf = newLeafEvent.args?._hashedLeaf
            unirepState.signUp(unirepState.currentEpoch, BigInt(newLeaf))
        } else if (occurredEvent === "AttestationSubmitted") {
            const attestationEvent = attestationSubmittedEvents.pop()
            assert(attestationEvent !== undefined, `Event sequence mismatch: missing attestationSubmittedEvent`)
            const epoch = attestationEvent.args?._epoch.toNumber()
            assert(
                epoch === unirepState.currentEpoch,
                `Attestation epoch (${epoch}) does not match current epoch (${unirepState.currentEpoch})`
            )

            const _attestation = attestationEvent.args?.attestation
            const attestation = new Attestation(
                BigInt(_attestation.attesterId),
                BigInt(_attestation.posRep),
                BigInt(_attestation.negRep),
                BigInt(_attestation.graffiti),
                BigInt(_attestation.signUp)
            )
            unirepState.addAttestation(attestationEvent.args?._epochKey.toString(), attestation)
        } else if (occurredEvent === "ReputationNullifierSubmitted") {
            const nullifierEvent = nullifierSubmittedEvents.pop()
            assert(nullifierEvent !== undefined, `Event sequence mismatch: missing nullifierSubmittedEvent`)

            // TODO: verify GST root
            const isProofValid = await unirepContract.verifyReputation(
                nullifierEvent.args?.reputationNullifiers,
                nullifierEvent.args?._epoch,
                nullifierEvent.args?.reputationProofData.epochKey,
                nullifierEvent.args?.reputationProofData.globalStateTree,
                nullifierEvent.args?.reputationProofData.attesterId,
                nullifierEvent.args?.reputationProofData.proveReputationAmount,
                nullifierEvent.args?.reputationProofData.minRep,
                nullifierEvent.args?.reputationProofData.proveGraffiti,
                nullifierEvent.args?.reputationProofData.graffitiPreImage,
                nullifierEvent.args?.reputationProofData.proof,
            )
            // Proof is invalid, skip this step
            if (!isProofValid) {
                console.log("Invalid Reputation proof")
                continue
            }
            // Update nullifiers
            for (let i = 0; i < nullifierEvent.args?.reputationNullifiers.length; i++) {
                unirepState.addReputationNullifiers(nullifierEvent.args?.reputationNullifiers)
            }
        } else if (occurredEvent === "EpochEnded") {
            const epochEndedEvent = epochEndedEvents.pop()
            assert(epochEndedEvent !== undefined, `Event sequence mismatch: missing epochEndedEvent`)
            const epoch = epochEndedEvent.args?._epoch.toNumber()
            assert(
                epoch === unirepState.currentEpoch,
                `Ended epoch (${epoch}) does not match current epoch (${unirepState.currentEpoch})`
            )

            // Get epoch tree leaves of the ending epoch
            let [epochKeys_, epochKeyHashchains_] = await unirepContract.getEpochTreeLeaves(epoch)
            epochKeys_ = epochKeys_.map((epk) => BigInt(epk.toString()))
            epochKeyHashchains_ = epochKeyHashchains_.map((hc) => BigInt(hc.toString()))
            const epochTreeLeaves: IEpochTreeLeaf[] = []
            for (let i = 0; i < epochKeys_.length; i++) {
                const epochTreeLeaf: IEpochTreeLeaf = {
                    epochKey: epochKeys_[i],
                    hashchainResult: epochKeyHashchains_[i]
                }
                epochTreeLeaves.push(epochTreeLeaf)
            }

            await unirepState.epochTransition(epoch, epochTreeLeaves)
        } else if (occurredEvent === "StartedTransition") {
            const startedTransitiodEvent = startedTransitionEvents.pop()
            assert(startedTransitiodEvent !== undefined, `Event sequence mismatch: missing startedTransitiodEvent`)

            // TODO: verify GST root
            const isProofValid = await unirepContract.verifyStartTransitionProof(
                startedTransitiodEvent.args?._blindedUserState,
                startedTransitiodEvent.args?._blindedHashChain,
                startedTransitiodEvent.args?._GSTRoot,
                startedTransitiodEvent.args?._proof,
            )

            // Proof is invalid, skip this step
            if (!isProofValid) {
                console.log("Invalid Start transition proof")
                continue
            }

            unirepState.addBlindedUserState(startedTransitiodEvent.args?._blindedUserState)
            unirepState.addBlindedHashChain(startedTransitiodEvent.args?._blindedHashChain)
        } else if (occurredEvent === "ProcessedAttestations") {
            const processedAttestationsEvent = processedAttestationsEvents.pop()
            assert(processedAttestationsEvent !== undefined, `Event sequence mismatch: missing processedAttestationsEvent`)

            for (let i = 0; i < numEpochKeyNoncePerEpoch; i++) {
                if(unirepState.blindedUserStateExist(processedAttestationsEvent.args?._inputBlindedUserState) != true){
                    console.log(`Unprocessed blinded user state`)
                    continue
                }
            }

            // TODO: verify GST root
            const isProofValid = await unirepContract.verifyProcessAttestationProof(
                processedAttestationsEvent.args?._outputBlindedUserState,
                processedAttestationsEvent.args?._outputBlindedHashChain,
                processedAttestationsEvent.args?._inputBlindedUserState,
                processedAttestationsEvent.args?._proof,
            )

            // Proof is invalid, skip this step
            if (!isProofValid) {
                console.log("Invalid process attestation proof")
                continue
            }

            unirepState.addBlindedUserState(processedAttestationsEvent.args?._outputBlindedUserState)
            unirepState.addBlindedHashChain(processedAttestationsEvent.args?._outputBlindedHashChain)
        } else if (occurredEvent === "UserStateTransitioned") {
            // const newLeafEvent = newGSTLeafInsertedEvents.pop()
            // assert(newLeafEvent !== undefined, `Event sequence mismatch: missing newGSTLeafInsertedEvent`)
            const userStateTransitionedEvent = userStateTransitionedEvents.pop()
            assert(userStateTransitionedEvent !== undefined, `Event sequence mismatch: missing userStateTransitionedEvent`)

            const newLeaf = userStateTransitionedEvent.args?.userTransitionedData.newGlobalStateTreeLeaf
            const _blindedHashChains = userStateTransitionedEvent.args?.userTransitionedData.blindedHashChains
            for (let i = 0; i < numEpochKeyNoncePerEpoch; i++) {
                if(unirepState.blindedHashChainExist(_blindedHashChains[i].toString()) != true){
                    console.log(`Unprocessed blinded hash chain`)
                    continue
                }
            }

            const isProofValid = await unirepContract.verifyUserStateTransition(
                newLeaf,
                userStateTransitionedEvent.args?.userTransitionedData.epkNullifiers,
                userStateTransitionedEvent.args?.userTransitionedData.fromEpoch,
                userStateTransitionedEvent.args?.userTransitionedData.blindedUserStates,
                userStateTransitionedEvent.args?.userTransitionedData.fromGlobalStateTree,
                userStateTransitionedEvent.args?.userTransitionedData.blindedHashChains,
                userStateTransitionedEvent.args?.userTransitionedData.fromEpochTree,
                userStateTransitionedEvent.args?.userTransitionedData.proof,
            )
            // Proof is invalid, skip this step
            if (!isProofValid) {
                console.log("Invalid UserStateTransitioned proof")
                continue
            }

            const epkNullifiersInEvent = userStateTransitionedEvent.args?.userTransitionedData.epkNullifiers

            unirepState.userStateTransition(unirepState.currentEpoch, BigInt(newLeaf), epkNullifiersInEvent)
        } else {
            throw new Error(`Unexpected event: ${occurredEvent}`)
        }
    }
    assert(newGSTLeafInsertedEvents.length == 0, `${newGSTLeafInsertedEvents.length} newGSTLeafInsert events left unprocessed`)
    assert(attestationSubmittedEvents.length == 0, `${attestationSubmittedEvents.length} attestationSubmitted events left unprocessed`)
    assert(nullifierSubmittedEvents.length == 0, `${nullifierSubmittedEvents.length} nullifierSubmitted events left unprocessed`)
    assert(epochEndedEvents.length == 0, `${epochEndedEvents.length} newGSTLeafInsert events left unprocessed`)
    assert(startedTransitionEvents.length == 0, `${startedTransitionEvents.length} startedTransition events left unprocessed`)
    assert(processedAttestationsEvents.length == 0, `${processedAttestationsEvents.length} processedAttestations events left unprocessed`)
    assert(userStateTransitionedEvents.length == 0, `${userStateTransitionedEvents.length} newGSTLeafInsert events left unprocessed`)
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
    
    const nullifierSubmittedFilter = unirepContract.filters.ReputationNullifierSubmitted()
    const nullifierSubmittedEvents =  await unirepContract.queryFilter(nullifierSubmittedFilter, startBlock)

    const epochEndedFilter = unirepContract.filters.EpochEnded()
    const epochEndedEvents =  await unirepContract.queryFilter(epochEndedFilter, startBlock)

    const startedTransitionFilter = unirepContract.filters.StartedTransition()
    const startedTransitionEvents =  await unirepContract.queryFilter(startedTransitionFilter, startBlock)

    const processedAttestationsFilter = unirepContract.filters.ProcessedAttestations()
    const processedAttestationsEvents =  await unirepContract.queryFilter(processedAttestationsFilter, startBlock)

    const userStateTransitionedFilter = unirepContract.filters.UserStateTransitioned()
    const userStateTransitionedEvents =  await unirepContract.queryFilter(userStateTransitionedFilter, startBlock)

    const sequencerFilter = unirepContract.filters.Sequencer()
    const sequencerEvents =  await unirepContract.queryFilter(sequencerFilter, startBlock)

    // Reverse the events so pop() can start from the first event
    newGSTLeafInsertedEvents.reverse()
    attestationSubmittedEvents.reverse()
    nullifierSubmittedEvents.reverse()
    epochEndedEvents.reverse()
    startedTransitionEvents.reverse()
    processedAttestationsEvents.reverse()
    userStateTransitionedEvents.reverse()
    // Variables used to keep track of data required for user to transition
    let userHasSignedUp = false
    let currentEpochGSTLeafIndexToInsert = 0
    let epkNullifiers: BigInt[] = []
    for (let i = 0; i < sequencerEvents.length; i++) {
        const sequencerEvent = sequencerEvents[i]
        const occurredEvent = sequencerEvent.args?._event
        if (occurredEvent === "UserSignUp") {
            const newLeafEvent = newGSTLeafInsertedEvents.pop()
            assert(newLeafEvent !== undefined, `Event sequence mismatch: missing newGSTLeafInsertedEvent`)

            const newLeaf = BigInt(newLeafEvent.args?._hashedLeaf)
            unirepState.signUp(unirepState.currentEpoch, newLeaf)
            // New leaf matches user's default leaf means user signed up.
            const attesterId = newLeafEvent.args?._attesterId.toNumber()
            const airdropPosRep = newLeafEvent.args?._airdropAmount.toNumber()
            const initUserStateRoot = await computeInitUserStateRoot(unirepState.userStateTreeDepth, attesterId, airdropPosRep)
            const userInitGSTLeaf = hashLeftRight(userIdentityCommitment, initUserStateRoot)
            if (userInitGSTLeaf === newLeaf) {
                userState.signUp(unirepState.currentEpoch, currentEpochGSTLeafIndexToInsert, attesterId, airdropPosRep)
                userHasSignedUp = true
            }

            // A user sign up, increment (next) GST leaf index
            currentEpochGSTLeafIndexToInsert ++
        } else if (occurredEvent === "AttestationSubmitted") {
            const attestationEvent = attestationSubmittedEvents.pop()
            assert(attestationEvent !== undefined, `Event sequence mismatch: missing attestationSubmittedEvent`)
            const epoch = attestationEvent.args?._epoch.toNumber()
            assert(
                epoch === unirepState.currentEpoch,
                `Attestation epoch (${epoch}) does not match current epoch (${unirepState.currentEpoch})`
            )

            const _attestation = attestationEvent.args?.attestation
            const attestation = new Attestation(
                BigInt(_attestation.attesterId),
                BigInt(_attestation.posRep),
                BigInt(_attestation.negRep),
                BigInt(_attestation.graffiti),
                BigInt(_attestation.signUp)
            )
            const epochKey = attestationEvent.args?._epochKey
            unirepState.addAttestation(epochKey.toString(), attestation)
        } else if (occurredEvent === "ReputationNullifierSubmitted") {
            const nullifierEvent = nullifierSubmittedEvents.pop()
            assert(nullifierEvent !== undefined, `Event sequence mismatch: missing nullifierSubmittedEvent`)

            // TODO: verify GST root
            const isProofValid = await unirepContract.verifyReputation(
                nullifierEvent.args?.reputationNullifiers,
                nullifierEvent.args?._epoch,
                nullifierEvent.args?.reputationProofData.epochKey,
                nullifierEvent.args?.reputationProofData.globalStateTree,
                nullifierEvent.args?.reputationProofData.attesterId,
                nullifierEvent.args?.reputationProofData.proveReputationAmount,
                nullifierEvent.args?.reputationProofData.minRep,
                nullifierEvent.args?.reputationProofData.proveGraffiti,
                nullifierEvent.args?.reputationProofData.graffitiPreImage,
                nullifierEvent.args?.reputationProofData.proof,
            )
            // Proof is invalid, skip this step
            if (!isProofValid) {
                console.log("Invalid Reputation proof")
                continue
            }
            // Update nullifiers
            for (let i = 0; i < nullifierEvent.args?.reputationNullifiers.length; i++) {
                unirepState.addReputationNullifiers(nullifierEvent.args?.reputationNullifiers)
            }
        } else if (occurredEvent === "EpochEnded") {
            const epochEndedEvent = epochEndedEvents.pop()
            assert(epochEndedEvent !== undefined, `Event sequence mismatch: missing epochEndedEvent`)
            const epoch = epochEndedEvent.args?._epoch.toNumber()
            assert(
                epoch === unirepState.currentEpoch,
                `Ended epoch (${epoch}) does not match current epoch (${unirepState.currentEpoch})`
            )

            // Get epoch tree leaves of the ending epoch
            let [epochKeys_, epochKeyHashchains_] = await unirepContract.getEpochTreeLeaves(epoch)
            epochKeys_ = epochKeys_.map((epk) => BigInt(epk.toString()))
            epochKeyHashchains_ = epochKeyHashchains_.map((hc) => BigInt(hc.toString()))
            const epochTreeLeaves: IEpochTreeLeaf[] = []
            for (let i = 0; i < epochKeys_.length; i++) {
                const epochTreeLeaf: IEpochTreeLeaf = {
                    epochKey: epochKeys_[i],
                    hashchainResult: epochKeyHashchains_[i]
                }
                epochTreeLeaves.push(epochTreeLeaf)
            }
            await unirepState.epochTransition(epoch, epochTreeLeaves)
            if (userHasSignedUp) {
                if (epoch === userState.latestTransitionedEpoch) {
                    // Latest epoch user transitioned to ends. Generate nullifiers of all epoch key
                    // so we can identify when user process the epoch keys.
                    epkNullifiers = userState.getEpochKeyNullifiers(epoch)
                }
            }

            // Epoch ends, reset (next) GST leaf index
            currentEpochGSTLeafIndexToInsert = 0
        } else if (occurredEvent === "StartedTransition") {
            const startedTransitiodEvent = startedTransitionEvents.pop()
            assert(startedTransitiodEvent !== undefined, `Event sequence mismatch: missing startedTransitiodEvent`)

            // TODO: verify GST root
            const isProofValid = await unirepContract.verifyStartTransitionProof(
                startedTransitiodEvent.args?._blindedUserState,
                startedTransitiodEvent.args?._blindedHashChain,
                startedTransitiodEvent.args?._GSTRoot,
                startedTransitiodEvent.args?._proof,
            )

            // Proof is invalid, skip this step
            if (!isProofValid) {
                console.log("Invalid Start transition proof")
                continue
            }

            unirepState.addBlindedUserState(startedTransitiodEvent.args?._blindedUserState)
            unirepState.addBlindedHashChain(startedTransitiodEvent.args?._blindedHashChain)
        } else if (occurredEvent === "ProcessedAttestations") {
            const processedAttestationsEvent = processedAttestationsEvents.pop()
            assert(processedAttestationsEvent !== undefined, `Event sequence mismatch: missing processedAttestationsEvent`)
            for (let i = 0; i < numEpochKeyNoncePerEpoch; i++) {
                if(unirepState.blindedUserStateExist(processedAttestationsEvent.args?._inputBlindedUserState) != true){
                    console.log(`Unprocessed blinded user state`)
                    continue
                }
            }

            // TODO: verify GST root
            const isProofValid = await unirepContract.verifyProcessAttestationProof(
                processedAttestationsEvent.args?._outputBlindedUserState,
                processedAttestationsEvent.args?._outputBlindedHashChain,
                processedAttestationsEvent.args?._inputBlindedUserState,
                processedAttestationsEvent.args?._proof,
            )

            // Proof is invalid, skip this step
            if (!isProofValid) {
                console.log("Invalid process attestation proof")
                continue
            }

            unirepState.addBlindedUserState(processedAttestationsEvent.args?._outputBlindedUserState)
            unirepState.addBlindedHashChain(processedAttestationsEvent.args?._outputBlindedHashChain)
        } else if (occurredEvent === "UserStateTransitioned") {
            // const newLeafEvent = newGSTLeafInsertedEvents.pop()
            // assert(newLeafEvent !== undefined, `Event sequence mismatch: missing newGSTLeafInsertedEvent`)
            const userStateTransitionedEvent = userStateTransitionedEvents.pop()
            assert(userStateTransitionedEvent !== undefined, `Event sequence mismatch: missing userStateTransitionedEvent`)

            const newLeaf = userStateTransitionedEvent.args?.userTransitionedData.newGlobalStateTreeLeaf

            const isProofValid = await unirepContract.verifyUserStateTransition(
                newLeaf,
                userStateTransitionedEvent.args?.userTransitionedData.epkNullifiers,
                userStateTransitionedEvent.args?.userTransitionedData.fromEpoch,
                userStateTransitionedEvent.args?.userTransitionedData.blindedUserStates,
                userStateTransitionedEvent.args?.userTransitionedData.fromGlobalStateTree,
                userStateTransitionedEvent.args?.userTransitionedData.blindedHashChains,
                userStateTransitionedEvent.args?.userTransitionedData.fromEpochTree,
                userStateTransitionedEvent.args?.userTransitionedData.proof,
            )
            // Proof is invalid, skip this event
            if (!isProofValid) {
                console.log("Invalid UserStateTransitioned proof")
                continue
            }

            const epkNullifiersInEvent = userStateTransitionedEvent.args?.userTransitionedData.epkNullifiers.map(n => BigInt(n))

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
                (userStateTransitionedEvent.args?.userTransitionedData.fromEpoch.toNumber() === userState.latestTransitionedEpoch)
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
                    assert(ethers.BigNumber.from(newState.newGSTLeaf).eq(newLeaf), 'New GST leaf mismatch')
                    // User transition to this epoch, increment (next) GST leaf index
                    currentEpochGSTLeafIndexToInsert ++
                } else if (epkNullifiersMatched > 0) {
                    throw new Error(`Number of epoch key nullifiers matched ${epkNullifiersMatched} not equal to numEpochKeyNoncePerEpoch ${numEpochKeyNoncePerEpoch}`)
                }
            }
            unirepState.userStateTransition(unirepState.currentEpoch, BigInt(newLeaf), epkNullifiersInEvent)
        } else {
            throw new Error(`Unexpected event: ${occurredEvent}`)
        }
    }
    assert(newGSTLeafInsertedEvents.length == 0, `${newGSTLeafInsertedEvents.length} newGSTLeafInsert events left unprocessed`)
    assert(attestationSubmittedEvents.length == 0, `${attestationSubmittedEvents.length} attestationSubmitted events left unprocessed`)
    assert(nullifierSubmittedEvents.length == 0, `${nullifierSubmittedEvents.length} nullifierSubmitted events left unprocessed`)
    assert(epochEndedEvents.length == 0, `${epochEndedEvents.length} newGSTLeafInsert events left unprocessed`)
    assert(startedTransitionEvents.length == 0, `${startedTransitionEvents.length} startedTransition events left unprocessed`)
    assert(processedAttestationsEvents.length == 0, `${processedAttestationsEvents.length} processedAttestations events left unprocessed`)
    assert(userStateTransitionedEvents.length == 0, `${userStateTransitionedEvents.length} newGSTLeafInsert events left unprocessed`)
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
}