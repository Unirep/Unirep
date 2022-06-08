import { BigNumber, ethers } from 'ethers'
import { CircuitName, UnirepEvents } from './types'
import {
    UnirepTypes,
    UnirepEvent,
    AttestationEvent,
    Unirep,
    UnirepABI,
} from '@unirep/contracts'
import { SnarkProof, ZkIdentity } from '@unirep/crypto'

import { IUnirepState, IUserState } from './interfaces'
import Attestation from './Attestation'
import UnirepState from './UnirepState'
import UserState from './UserState'
import { UnirepProtocol } from './UnirepProtocol'
import {
    IndexedProcessedAttestationsProofEvent,
    IndexedStartedTransitionProofEvent,
    IndexedUserStateTransitionProofEvent,
} from '@unirep/contracts/build/src/contracts/Unirep'

const DEFAULT_START_BLOCK = 0

// TODO: integrate with circom

const parseEventProof = (
    circuitName: CircuitName,
    event: ethers.Event
): { proof; publicSignals } => {
    let args = event?.args?.proof
    const emptyArray: ethers.BigNumber[] = []
    let formatPublicSignals
    if (circuitName === CircuitName.verifyEpochKey) {
        formatPublicSignals = emptyArray
            .concat(args?.globalStateTree, args?.epoch, args?.epochKey)
            .map((n) => n.toBigInt())
    } else if (circuitName === CircuitName.proveReputation) {
        formatPublicSignals = emptyArray
            .concat(
                args?.repNullifiers,
                args?.epoch,
                args?.epochKey,
                args?.globalStateTree,
                args?.attesterId,
                args?.proveReputationAmount,
                args?.minRep,
                args?.proveGraffiti,
                args?.graffitiPreImage
            )
            .map((n) => n.toBigInt())
    } else if (circuitName === CircuitName.proveUserSignUp) {
        formatPublicSignals = emptyArray
            .concat(
                args?.epoch,
                args?.epochKey,
                args?.globalStateTree,
                args?.attesterId,
                args?.userHasSignedUp
            )
            .map((n) => n.toBigInt())
    } else if (circuitName === CircuitName.startTransition) {
        args = event?.args
        formatPublicSignals = emptyArray
            .concat(
                args?.blindedUserState,
                args?.blindedHashChain,
                args?.globalStateTree
            )
            .map((n) => n.toBigInt())
    } else if (circuitName === CircuitName.processAttestations) {
        args = event?.args
        formatPublicSignals = emptyArray
            .concat(
                args?.outputBlindedUserState,
                args?.outputBlindedHashChain,
                args?.inputBlindedUserState
            )
            .map((n) => n.toBigInt())
    } else if (circuitName === CircuitName.userStateTransition) {
        formatPublicSignals = emptyArray
            .concat(
                args.newGlobalStateTreeLeaf,
                args.epkNullifiers,
                args.transitionFromEpoch,
                args.blindedUserStates,
                args.fromGlobalStateTree,
                args.blindedHashChains,
                args.fromEpochTree
            )
            .map((n) => n.toBigInt())
    } else {
        throw new Error(
            `Unirep protocol: cannot find circuit name ${circuitName}`
        )
    }
    const proof = args?.proof
    const formattedProof: SnarkProof = {
        pi_a: [BigInt(proof[0]), BigInt(proof[1]), BigInt('1')],
        pi_b: [
            [BigInt(proof[3]), BigInt(proof[2])],
            [BigInt(proof[5]), BigInt(proof[4])],
            [BigInt('1'), BigInt('0')],
        ],
        pi_c: [BigInt(proof[6]), BigInt(proof[7]), BigInt('1')],
    }
    return {
        proof: formattedProof,
        publicSignals: formatPublicSignals,
    }
}

/**
 * Verify contract events' proof
 * @param circuit The name of the circuit
 * @param contract Unirep smart contract in ethers.Contract type
 * @param event The event from the unirep contract
 * @returns formatted proof and publicSignals to be verified by snarkjs
 */
const verifyProofEvent = async (
    circuit: CircuitName,
    contract: Unirep,
    event: UnirepEvents
): Promise<boolean> => {
    // try-catch ethers CALL_EXCEPTION error if proof is invalid
    // Error: call revert exception [ See: https://links.ethers.org/v5-errors-CALL_EXCEPTION ]
    if (circuit === CircuitName.verifyEpochKey) {
        try {
            const isValid = contract.verifyEpochKeyValidity(event.args.proof as UnirepTypes.EpochKeyProofStruct)
            return isValid
        } catch (_) { }
    } else if (circuit === CircuitName.proveReputation) {
        try {
            const isValid = contract.verifyReputation(event.args.proof as UnirepTypes.ReputationProofStruct)
            return isValid
        } catch (_) { }
    } else if (circuit === CircuitName.proveUserSignUp) {
        try {
            const isValid = await contract.verifyUserSignUp(event.args.proof as UnirepTypes.SignUpProofStruct)
            return isValid
        } catch (_) { }
    } else if (circuit === CircuitName.startTransition) {
        const {
            blindedUserState,
            blindedHashChain,
            globalStateTree,
            proof,
        } = (event as IndexedStartedTransitionProofEvent).args
        try {
            const isValid = contract.verifyStartTransitionProof(
                blindedUserState,
                blindedHashChain,
                globalStateTree,
                proof,
            )
            return isValid
        } catch (_) { }
    } else if (circuit === CircuitName.processAttestations) {
        const {
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            proof,
        } = (event as IndexedProcessedAttestationsProofEvent).args
        try {
            const isValid = contract.verifyProcessAttestationProof(
                outputBlindedUserState,
                outputBlindedHashChain,
                inputBlindedUserState,
                proof,
            )
            return isValid
        } catch (_) { }
    } else if (circuit === CircuitName.userStateTransition) {
        try {
            const isValid = await contract
                .verifyUserStateTransition(
                    event.args.proof as UnirepTypes.UserTransitionProofStruct
                )
            return isValid
        } catch (_) { }
    }
    return false
}

/**
 * Verify one user state transition action. It composes of `transitionEvent`, `startTransitionEvent`, and `processAttestationEvent`s.
 * @param transitionEvent The user state transition event
 * @param startTransitionEvent The start transition event
 * @param processAttestationEvents The process attestations event
 * @returns True if all proofs of the events are valid, false otherwise.
 */
const verifyUSTEvents = async (
    contract: Unirep,
    transitionEvent: IndexedUserStateTransitionProofEvent,
    startTransitionEvent: IndexedStartedTransitionProofEvent,
    processAttestationEvents: IndexedProcessedAttestationsProofEvent[]
): Promise<boolean> => {
    // verify the final UST proof
    const isValid = await verifyProofEvent(
        CircuitName.userStateTransition,
        contract,
        transitionEvent
    )
    if (!isValid) {
        return false
    }

    // verify the start transition proof
    const isStartTransitionProofValid = await verifyProofEvent(
        CircuitName.startTransition,
        contract,
        startTransitionEvent
    )
    if (!isStartTransitionProofValid) {
        return false
    }

    // verify process attestations proofs
    const transitionArgs = transitionEvent?.args?.proof
    const isProcessAttestationValid = await verifyProcessAttestationEvents(
        contract,
        processAttestationEvents,
        transitionArgs.blindedUserStates[0],
        transitionArgs.blindedUserStates[1]
    )
    if (!isProcessAttestationValid) {
        return false
    }
    return true
}

/**
 * Verify all process attestations events. One input blinded user state should be the output of other process attestations proof
 * @param processAttestationEvents All process attestation events
 * @param startBlindedUserState The blinded user state from `startTrantision` proof
 * @param finalBlindedUserState The Final output of the latest `processAttestation` proof
 * @returns True if all events are valid and blinded user state are connected
 */
const verifyProcessAttestationEvents = async (
    contract: Unirep,
    processAttestationEvents: IndexedProcessedAttestationsProofEvent[],
    startBlindedUserState: BigNumber,
    finalBlindedUserState: BigNumber
): Promise<boolean> => {
    let currentBlindedUserState = startBlindedUserState
    // The rest are process attestations proofs
    for (let i = 0; i < processAttestationEvents.length; i++) {
        const args = processAttestationEvents[i]?.args
        const isValid = await verifyProofEvent(
            CircuitName.processAttestations,
            contract,
            processAttestationEvents[i]
        )
        if (!isValid) return false
        currentBlindedUserState = args?.outputBlindedUserState
    }
    return currentBlindedUserState.eq(finalBlindedUserState)
}

/**
 * Retrieves and parses on-chain Unirep contract data to create an off-chain
 * representation as a UnirepState object.
 * @param protocol Configured unirep protocol
 * @param provider An Ethereum provider
 * @param address The address of the Unirep contract
 * @param _unirepState The stored unirep state that the function start with
 */
const genUnirepState = async (
    protocol: UnirepProtocol,
    provider: ethers.providers.Provider,
    address: string,
    _unirepState?: IUnirepState
) => {
    const unirepContract = (await new ethers.Contract(
        address,
        UnirepABI,
        provider
    )) as Unirep
    let unirepState: UnirepState

    if (!_unirepState) {
        unirepState = new UnirepState(protocol.config)
    } else {
        unirepState = UnirepState.fromJSON(_unirepState)
    }

    const latestBlock = _unirepState?.latestProcessedBlock
    const startBlock =
        latestBlock != undefined ? latestBlock + 1 : DEFAULT_START_BLOCK

    const UserSignedUpFilter = unirepContract.filters.UserSignedUp()
    const userSignedUpEvents = await unirepContract.queryFilter(
        UserSignedUpFilter,
        startBlock
    )

    const UserStateTransitionedFilter =
        unirepContract.filters.UserStateTransitioned()
    const userStateTransitionedEvents = await unirepContract.queryFilter(
        UserStateTransitionedFilter,
        startBlock
    )

    const attestationSubmittedFilter =
        unirepContract.filters.AttestationSubmitted()
    const attestationSubmittedEvents = await unirepContract.queryFilter(
        attestationSubmittedFilter,
        startBlock
    )

    const epochEndedFilter = unirepContract.filters.EpochEnded()
    const epochEndedEvents = await unirepContract.queryFilter(
        epochEndedFilter,
        startBlock
    )

    const sequencerFilter = unirepContract.filters.Sequencer()
    const sequencerEvents = await unirepContract.queryFilter(
        sequencerFilter,
        startBlock
    )

    // proof events
    const emptyArray: ethers.Event[] = []
    const transitionFilter =
        unirepContract.filters.IndexedUserStateTransitionProof()
    const transitionEvents = await unirepContract.queryFilter(transitionFilter)

    const startTransitionFilter =
        unirepContract.filters.IndexedStartedTransitionProof()
    const startTransitionEvents = await unirepContract.queryFilter(
        startTransitionFilter
    )

    const processAttestationsFilter =
        unirepContract.filters.IndexedProcessedAttestationsProof()
    const processAttestationsEvents = await unirepContract.queryFilter(
        processAttestationsFilter
    )

    const epochKeyProofFilter = unirepContract.filters.IndexedEpochKeyProof()
    const epochKeyProofEvent = await unirepContract.queryFilter(
        epochKeyProofFilter
    )

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
    const isProofIndexValid = {}
    const spentProofIndex = {}
    isProofIndexValid[0] = true
    const events = emptyArray.concat(
        transitionEvents,
        startTransitionEvents,
        processAttestationsEvents,
        epochKeyProofEvent,
        repProofEvent,
        signUpProofEvent
    )
    for (const event of events) {
        const proofIndex = Number(event?.args?.proofIndex)
        proofIndexMap[proofIndex] = event
    }

    for (let i = 0; i < sequencerEvents.length; i++) {
        const sequencerEvent = sequencerEvents[i]
        // console.log('Generating Unirep State progress: ', i, '/', sequencerEvents.length)
        const blockNumber = sequencerEvent.blockNumber
        if (blockNumber < startBlock) continue
        const occurredEvent = sequencerEvent.args?.userEvent
        if (occurredEvent === UnirepEvent.UserSignedUp) {
            const signUpEvent = userSignedUpEvents.pop()
            if (signUpEvent === undefined) {
                console.log(
                    `Event sequence mismatch: missing UserSignedUp event`
                )
                continue
            }
            const args = signUpEvent?.args
            const epoch = Number(args?.epoch)
            const commitment = args?.identityCommitment.toBigInt()
            const attesterId = Number(args?.attesterId)
            const airdrop = Number(args?.airdropAmount)

            await unirepState.signUp(
                epoch,
                commitment,
                attesterId,
                airdrop,
                blockNumber
            )
        } else if (occurredEvent === UnirepEvent.AttestationSubmitted) {
            const attestationSubmittedEvent = attestationSubmittedEvents.pop()
            if (attestationSubmittedEvent === undefined) {
                console.log(
                    `Event sequence mismatch: missing AttestationSubmitted event`
                )
                continue
            }
            const args = attestationSubmittedEvent?.args
            const epoch = Number(args?.epoch)
            const toProofIndex = Number(args?.toProofIndex)
            const fromProofIndex = Number(args?.fromProofIndex)
            const attestation_ = args?.attestation
            const event = proofIndexMap[toProofIndex]
            const results = event?.args?.proof

            if (isProofIndexValid[toProofIndex] === undefined) {
                let isValid
                if (event.event === 'IndexedEpochKeyProof') {
                    isValid = await verifyProofEvent(
                        CircuitName.verifyEpochKey,
                        unirepContract,
                        event
                    )
                } else if (event.event === 'IndexedReputationProof') {
                    isValid = await verifyProofEvent(
                        CircuitName.proveReputation,
                        unirepContract,
                        event
                    )
                } else if (event.event === 'IndexedUserSignedUpProof') {
                    isValid = await verifyProofEvent(
                        CircuitName.proveUserSignUp,
                        unirepContract,
                        event
                    )
                } else {
                    console.log('Cannot find the attestation event')
                    continue
                }

                // verify the proof of the given proof index
                if (!isValid) {
                    console.log(
                        'Proof is invalid: ',
                        event.event,
                        ' , transaction hash: ',
                        event.transactionHash
                    )
                    isProofIndexValid[toProofIndex] = false
                    continue
                }

                // verify GSTRoot of the proof
                const isGSTRootExisted = unirepState.GSTRootExists(
                    results?.globalStateTree,
                    epoch
                )
                if (!isGSTRootExisted) {
                    console.log('Global state tree root does not exist')
                    isProofIndexValid[toProofIndex] = false
                    continue
                }

                // if it is SpendRepuation event, check the reputation nullifiers
                if (
                    args?.attestationEvent === AttestationEvent.SpendReputation
                ) {
                    let validNullifier = true
                    const nullifiers = results?.repNullifiers.map((n) =>
                        BigInt(n)
                    )
                    const nullifiersAmount = Number(
                        results?.proveReputationAmount
                    )
                    for (let j = 0; j < nullifiersAmount; j++) {
                        if (unirepState.nullifierExist(nullifiers[j])) {
                            console.log(
                                'duplicated nullifier',
                                BigInt(nullifiers[j]).toString()
                            )
                            validNullifier = false
                            break
                        }
                    }

                    if (validNullifier) {
                        for (let j = 0; j < nullifiersAmount; j++) {
                            unirepState.addReputationNullifiers(
                                nullifiers[j],
                                blockNumber
                            )
                        }
                    } else {
                        isProofIndexValid[toProofIndex] = false
                        continue
                    }
                }
                isProofIndexValid[toProofIndex] = true
            }
            if (fromProofIndex && isProofIndexValid[fromProofIndex]) {
                const fromEvent = proofIndexMap[fromProofIndex]
                if (fromEvent?.event !== 'IndexedReputationProof') {
                    console.log(
                        `The proof index ${fromProofIndex} is not a reputation proof`
                    )
                    continue
                }

                const proveReputationAmount = Number(
                    fromEvent?.args?.proof?.proveReputationAmount
                )
                const repInAttestation =
                    Number(attestation_.posRep) + Number(attestation_.negRep)
                if (proveReputationAmount < repInAttestation) {
                    console.log(
                        `The attestation requires ${repInAttestation} reputation`
                    )
                    continue
                }
            }
            if (fromProofIndex && spentProofIndex[fromProofIndex]) {
                console.log(
                    `The reputation proof index ${fromProofIndex} has been spent in other attestation`
                )
                continue
            }
            if (
                isProofIndexValid[toProofIndex] &&
                isProofIndexValid[fromProofIndex]
            ) {
                // update attestation
                const attestation = new Attestation(attestation_)
                const epochKey = args?.epochKey
                if (epochKey.eq(results?.epochKey)) {
                    unirepState.addAttestation(
                        epochKey.toString(),
                        attestation,
                        blockNumber
                    )
                }
                if (fromProofIndex !== 0) spentProofIndex[fromProofIndex] = true
            }
        } else if (occurredEvent === UnirepEvent.EpochEnded) {
            const epochEndedEvent = epochEndedEvents.pop()
            if (epochEndedEvent === undefined) {
                console.log(`Event sequence mismatch: missing epochEndedEvent`)
                continue
            }
            const epoch = epochEndedEvent.args?.epoch.toNumber()

            await unirepState.epochTransition(epoch, blockNumber)
        } else if (occurredEvent === UnirepEvent.UserStateTransitioned) {
            const userStateTransitionedEvent = userStateTransitionedEvents.pop()
            if (userStateTransitionedEvent === undefined) {
                console.log(
                    `Event sequence mismatch: missing userStateTransitionedEvent`
                )
                continue
            }
            const args = userStateTransitionedEvent?.args
            const epoch = Number(args?.epoch)
            const newLeaf = args?.hashedLeaf.toBigInt()
            const proofIndex = Number(args?.proofIndex)
            const event = proofIndexMap[proofIndex]
            const proofArgs = event?.args?.proof
            const fromEpoch = Number(proofArgs?.transitionFromEpoch)

            if (isProofIndexValid[proofIndex] === undefined) {
                let isValid = false
                if (event.event !== 'IndexedUserStateTransitionProof') {
                    isProofIndexValid[proofIndex] = false
                    continue
                }

                const proofIndexes = event?.args?.proofIndexRecords.map((n) =>
                    Number(n)
                )
                const startTransitionEvent = proofIndexMap[proofIndexes[0]]
                if (
                    startTransitionEvent === undefined ||
                    startTransitionEvent?.event !==
                    'IndexedStartedTransitionProof'
                ) {
                    isProofIndexValid[proofIndex] = false
                    continue
                }

                const processAttestationEvents: IndexedProcessedAttestationsProofEvent[] =
                    []
                for (let j = 1; j < proofIndexes.length; j++) {
                    if (proofIndexes[j] === 0) isValid = false
                    const processAttestationEvent =
                        proofIndexMap[proofIndexes[j]]
                    if (
                        processAttestationEvent === undefined ||
                        processAttestationEvent?.event !==
                        'IndexedProcessedAttestationsProof'
                    ) {
                        isProofIndexValid[proofIndex] = false
                        continue
                    }
                    processAttestationEvents.push(processAttestationEvent)
                }
                isValid = await verifyUSTEvents(
                    unirepContract,
                    event,
                    startTransitionEvent,
                    processAttestationEvents
                )
                if (!isValid) {
                    console.log(
                        'Proof is invalid: ',
                        event.event,
                        ' , transaction hash: ',
                        event.transactionHash
                    )
                    isProofIndexValid[proofIndex] = false
                    continue
                }

                const GSTRoot = proofArgs?.fromGlobalStateTree
                // check if GST root matches
                const isGSTRootExisted = unirepState.GSTRootExists(
                    GSTRoot,
                    fromEpoch
                )
                if (!isGSTRootExisted) {
                    console.log('Global state tree root does not exist')
                    isProofIndexValid[proofIndex] = false
                    continue
                }

                // Check if epoch tree root matches
                const epochTreeRoot = proofArgs?.fromEpochTree
                const isEpochTreeExisted =
                    await unirepState.epochTreeRootExists(
                        epochTreeRoot,
                        fromEpoch
                    )
                if (!isEpochTreeExisted) {
                    console.log('Epoch tree root mismatches')
                    isProofIndexValid[proofIndex] = false
                    continue
                }
                isProofIndexValid[proofIndex] = true
            }

            if (isProofIndexValid[proofIndex]) {
                const epkNullifiersInEvent = proofArgs?.epkNullifiers?.map(
                    (n) => BigInt(n)
                )
                let exist = false
                for (let nullifier of epkNullifiersInEvent) {
                    if (unirepState.nullifierExist(nullifier)) {
                        console.log(
                            'duplicated nullifier',
                            nullifier.toString()
                        )
                        exist = true
                        break
                    }
                }
                if (!exist) {
                    unirepState.userStateTransition(
                        fromEpoch,
                        newLeaf,
                        epkNullifiersInEvent,
                        blockNumber
                    )
                }
            }
        } else {
            console.log('unexpected event', occurredEvent)
        }
    }
    return unirepState
}

/**
 * This function works mostly the same as genUnirepState,
 * except that it also updates the user's state during events processing.
 * @param protocol Configured unirep protocol
 * @param provider An Ethereum provider
 * @param address The address of the Unirep contract
 * @param userIdentity The semaphore identity of the user
 * @param _userState The stored user state that the function start with
 */
const genUserState = async (
    protocol: UnirepProtocol,
    provider: ethers.providers.Provider,
    address: string,
    userIdentity: ZkIdentity,
    _userState?: IUserState
) => {
    const unirepContract = (await new ethers.Contract(
        address,
        UnirepABI,
        provider
    )) as Unirep

    let userState: UserState

    if (!_userState) {
        userState = new UserState(protocol.config, userIdentity)
    } else {
        userState = UserState.fromJSONAndID(userIdentity, _userState)
    }

    const latestBlock = _userState?.latestProcessedBlock
    const startBlock =
        latestBlock != undefined ? latestBlock + 1 : DEFAULT_START_BLOCK

    const UserSignedUpFilter = unirepContract.filters.UserSignedUp()
    const userSignedUpEvents = await unirepContract.queryFilter(
        UserSignedUpFilter,
        startBlock
    )

    const UserStateTransitionedFilter =
        unirepContract.filters.UserStateTransitioned()
    const userStateTransitionedEvents = await unirepContract.queryFilter(
        UserStateTransitionedFilter,
        startBlock
    )

    const attestationSubmittedFilter =
        unirepContract.filters.AttestationSubmitted()
    const attestationSubmittedEvents = await unirepContract.queryFilter(
        attestationSubmittedFilter,
        startBlock
    )

    const epochEndedFilter = unirepContract.filters.EpochEnded()
    const epochEndedEvents = await unirepContract.queryFilter(
        epochEndedFilter,
        startBlock
    )

    const sequencerFilter = unirepContract.filters.Sequencer()
    const sequencerEvents = await unirepContract.queryFilter(
        sequencerFilter,
        startBlock
    )

    // proof events
    const emptyArray: ethers.Event[] = []
    const transitionFilter =
        unirepContract.filters.IndexedUserStateTransitionProof()
    const transitionEvents = await unirepContract.queryFilter(transitionFilter)

    const startTransitionFilter =
        unirepContract.filters.IndexedStartedTransitionProof()
    const startTransitionEvents = await unirepContract.queryFilter(
        startTransitionFilter
    )

    const processAttestationsFilter =
        unirepContract.filters.IndexedProcessedAttestationsProof()
    const processAttestationsEvents = await unirepContract.queryFilter(
        processAttestationsFilter
    )

    const epochKeyProofFilter = unirepContract.filters.IndexedEpochKeyProof()
    const epochKeyProofEvent = await unirepContract.queryFilter(
        epochKeyProofFilter
    )

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
    const isProofIndexValid = {}
    const spentProofIndex = {}
    isProofIndexValid[0] = true
    const events = emptyArray.concat(
        transitionEvents,
        startTransitionEvents,
        processAttestationsEvents,
        epochKeyProofEvent,
        repProofEvent,
        signUpProofEvent
    )
    for (const event of events) {
        const proofIndex = Number(event?.args?.proofIndex)
        proofIndexMap[proofIndex] = event
    }

    for (let i = 0; i < sequencerEvents.length; i++) {
        // console.log('Generating User State progress: ', i, '/', sequencerEvents.length)
        const sequencerEvent = sequencerEvents[i]
        const blockNumber = sequencerEvent.blockNumber
        if (blockNumber < startBlock) continue
        const occurredEvent = sequencerEvent.args?.userEvent
        if (occurredEvent === UnirepEvent.UserSignedUp) {
            const signUpEvent = userSignedUpEvents.pop()
            if (signUpEvent === undefined) {
                console.log(
                    `Event sequence mismatch: missing UserSignedUp event`
                )
                continue
            }
            const args = signUpEvent?.args
            const epoch = Number(args?.epoch)
            const commitment = args?.identityCommitment.toBigInt()
            const attesterId = Number(args?.attesterId)
            const airdrop = Number(args?.airdropAmount)

            await userState.signUp(
                epoch,
                commitment,
                attesterId,
                airdrop,
                blockNumber
            )
        } else if (occurredEvent === UnirepEvent.AttestationSubmitted) {
            const attestationSubmittedEvent = attestationSubmittedEvents.pop()
            if (attestationSubmittedEvent === undefined) {
                console.log(
                    `Event sequence mismatch: missing AttestationSubmitted event`
                )
                continue
            }
            const args = attestationSubmittedEvent?.args
            const epoch = Number(args?.epoch)
            const toProofIndex = Number(args?.toProofIndex)
            const fromProofIndex = Number(args?.fromProofIndex)
            const attestation_ = args?.attestation
            const event = proofIndexMap[toProofIndex]
            const results = event?.args?.proof

            if (isProofIndexValid[toProofIndex] === undefined) {
                let isValid
                if (event.event === 'IndexedEpochKeyProof') {
                    isValid = await verifyProofEvent(
                        CircuitName.verifyEpochKey,
                        unirepContract,
                        event
                    )
                } else if (event.event === 'IndexedReputationProof') {
                    isValid = await verifyProofEvent(
                        CircuitName.proveReputation,
                        unirepContract,
                        event
                    )
                } else if (event.event === 'IndexedUserSignedUpProof') {
                    isValid = await verifyProofEvent(
                        CircuitName.proveUserSignUp,
                        unirepContract,
                        event
                    )
                } else {
                    console.log('Cannot find the attestation event')
                    continue
                }

                // verify the proof of the given proof index
                if (!isValid) {
                    console.log(
                        'Proof is invalid: ',
                        event.event,
                        ' , transaction hash: ',
                        event.transactionHash
                    )
                    isProofIndexValid[toProofIndex] = false
                    continue
                }

                // verify GSTRoot of the proof
                const isGSTRootExisted = userState.GSTRootExists(
                    results?.globalStateTree,
                    epoch
                )
                if (!isGSTRootExisted) {
                    console.log('Global state tree root does not exist')
                    isProofIndexValid[toProofIndex] = false
                    continue
                }

                // if it is SpendRepuation event, check the reputation nullifiers
                if (
                    args?.attestationEvent === AttestationEvent.SpendReputation
                ) {
                    let validNullifier = true
                    const nullifiers = results?.repNullifiers.map((n) =>
                        BigInt(n)
                    )
                    const nullifiersAmount = Number(
                        results?.proveReputationAmount
                    )
                    for (let j = 0; j < nullifiersAmount; j++) {
                        if (userState.nullifierExist(nullifiers[j])) {
                            console.log(
                                'duplicated nullifier',
                                BigInt(nullifiers[j]).toString()
                            )
                            validNullifier = false
                            break
                        }
                    }

                    if (validNullifier) {
                        for (let j = 0; j < nullifiersAmount; j++) {
                            userState.addReputationNullifiers(
                                nullifiers[j],
                                blockNumber
                            )
                        }
                    } else {
                        isProofIndexValid[toProofIndex] = false
                        continue
                    }
                }
                isProofIndexValid[toProofIndex] = true
            }
            if (fromProofIndex && isProofIndexValid[fromProofIndex]) {
                const fromEvent = proofIndexMap[fromProofIndex]
                if (fromEvent?.event !== 'IndexedReputationProof') {
                    console.log(
                        `The proof index ${fromProofIndex} is not a reputation proof`
                    )
                    continue
                }

                const proveReputationAmount = Number(
                    fromEvent?.args?.proof?.proveReputationAmount
                )
                const repInAttestation =
                    Number(attestation_.posRep) + Number(attestation_.negRep)
                if (proveReputationAmount < repInAttestation) {
                    console.log(
                        `The attestation requires ${repInAttestation} reputation`
                    )
                    continue
                }
            }
            if (fromProofIndex && spentProofIndex[fromProofIndex]) {
                console.log(
                    `The reputation proof index ${fromProofIndex} has been spent in other attestation`
                )
                continue
            }
            if (
                isProofIndexValid[toProofIndex] &&
                isProofIndexValid[fromProofIndex]
            ) {
                // update attestation
                const attestation = new Attestation(attestation_)
                const epochKey = args?.epochKey
                if (epochKey.eq(results?.epochKey)) {
                    userState.addAttestation(
                        epochKey.toString(),
                        attestation,
                        blockNumber
                    )
                }
                if (fromProofIndex !== 0) spentProofIndex[fromProofIndex] = true
            }
        } else if (occurredEvent === UnirepEvent.EpochEnded) {
            const epochEndedEvent = epochEndedEvents.pop()
            if (epochEndedEvent === undefined) {
                console.log(`Event sequence mismatch: missing epochEndedEvent`)
                continue
            }
            const epoch = epochEndedEvent.args?.epoch.toNumber()

            await userState.epochTransition(epoch, blockNumber)
        } else if (occurredEvent === UnirepEvent.UserStateTransitioned) {
            const userStateTransitionedEvent = userStateTransitionedEvents.pop()
            if (userStateTransitionedEvent === undefined) {
                console.log(
                    `Event sequence mismatch: missing userStateTransitionedEvent`
                )
                continue
            }
            const args = userStateTransitionedEvent?.args
            const epoch = Number(args?.epoch)
            const newLeaf = args?.hashedLeaf.toBigInt()
            const proofIndex = Number(args?.proofIndex)
            const event = proofIndexMap[proofIndex]
            const proofArgs = event?.args?.proof
            const fromEpoch = Number(proofArgs?.transitionFromEpoch)

            if (isProofIndexValid[proofIndex] === undefined) {
                let isValid = false
                if (event.event !== 'IndexedUserStateTransitionProof') {
                    isProofIndexValid[proofIndex] = false
                    continue
                }

                const proofIndexes = event?.args?.proofIndexRecords.map((n) =>
                    Number(n)
                )
                const startTransitionEvent = proofIndexMap[proofIndexes[0]]
                if (
                    startTransitionEvent === undefined ||
                    startTransitionEvent?.event !==
                    'IndexedStartedTransitionProof'
                ) {
                    isProofIndexValid[proofIndex] = false
                    continue
                }

                const processAttestationEvents: IndexedProcessedAttestationsProofEvent[] =
                    []
                for (let j = 1; j < proofIndexes.length; j++) {
                    if (proofIndexes[j] === 0) isValid = false
                    const processAttestationEvent =
                        proofIndexMap[proofIndexes[j]]
                    if (
                        processAttestationEvent === undefined ||
                        processAttestationEvent?.event !==
                        'IndexedProcessedAttestationsProof'
                    ) {
                        isProofIndexValid[proofIndex] = false
                        continue
                    }
                    processAttestationEvents.push(processAttestationEvent)
                }
                isValid = await verifyUSTEvents(
                    unirepContract,
                    event,
                    startTransitionEvent,
                    processAttestationEvents
                )
                if (!isValid) {
                    console.log(
                        'Proof is invalid: ',
                        event.event,
                        ' , transaction hash: ',
                        event.transactionHash
                    )
                    isProofIndexValid[proofIndex] = false
                    continue
                }

                const GSTRoot = proofArgs?.fromGlobalStateTree
                // check if GST root matches
                const isGSTRootExisted = userState.GSTRootExists(
                    GSTRoot,
                    fromEpoch
                )
                if (!isGSTRootExisted) {
                    console.log('Global state tree root does not exist')
                    isProofIndexValid[proofIndex] = false
                    continue
                }

                // Check if epoch tree root matches
                const epochTreeRoot = proofArgs?.fromEpochTree
                const isEpochTreeExisted = await userState.epochTreeRootExists(
                    epochTreeRoot,
                    fromEpoch
                )
                if (!isEpochTreeExisted) {
                    console.log('Epoch tree root mismatches')
                    isProofIndexValid[proofIndex] = false
                    continue
                }
                isProofIndexValid[proofIndex] = true
            }

            if (isProofIndexValid[proofIndex]) {
                const epkNullifiersInEvent = proofArgs?.epkNullifiers?.map(
                    (n) => n.toBigInt()
                )
                let exist = false
                for (let nullifier of epkNullifiersInEvent) {
                    if (userState.nullifierExist(nullifier)) {
                        console.log(
                            'duplicated nullifier',
                            nullifier.toString()
                        )
                        exist = true
                        break
                    }
                }
                if (!exist) {
                    await userState.userStateTransition(
                        fromEpoch,
                        newLeaf,
                        epkNullifiersInEvent,
                        blockNumber
                    )
                }
            }
        } else {
            console.log('unexpected event', occurredEvent)
        }
    }
    return userState
}

export { genUnirepState, genUserState }
