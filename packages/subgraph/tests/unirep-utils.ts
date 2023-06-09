import { newMockEvent } from 'matchstick-as'
import { ethereum, BigInt } from '@graphprotocol/graph-ts'
import {
    Attestation,
    AttesterSignedUp,
    EpochEnded,
    EpochTreeLeaf,
    HistoryTreeLeaf,
    StateTreeLeaf,
    UserSignedUp,
    UserStateTransitioned,
} from '../generated/Unirep/Unirep'

export function createAttestationEvent(
    epoch: BigInt,
    epochKey: BigInt,
    attesterId: BigInt,
    fieldIndex: BigInt,
    change: BigInt
): Attestation {
    let attestationEvent = changetype<Attestation>(newMockEvent())

    attestationEvent.parameters = new Array()

    attestationEvent.parameters.push(
        new ethereum.EventParam(
            'epoch',
            ethereum.Value.fromUnsignedBigInt(epoch)
        )
    )
    attestationEvent.parameters.push(
        new ethereum.EventParam(
            'epochKey',
            ethereum.Value.fromUnsignedBigInt(epochKey)
        )
    )
    attestationEvent.parameters.push(
        new ethereum.EventParam(
            'attesterId',
            ethereum.Value.fromUnsignedBigInt(attesterId)
        )
    )
    attestationEvent.parameters.push(
        new ethereum.EventParam(
            'fieldIndex',
            ethereum.Value.fromUnsignedBigInt(fieldIndex)
        )
    )
    attestationEvent.parameters.push(
        new ethereum.EventParam(
            'change',
            ethereum.Value.fromUnsignedBigInt(change)
        )
    )

    return attestationEvent
}

export function createAttesterSignedUpEvent(
    attesterId: BigInt,
    epochLength: BigInt,
    timestamp: BigInt
): AttesterSignedUp {
    let attesterSignedUpEvent = changetype<AttesterSignedUp>(newMockEvent())

    attesterSignedUpEvent.parameters = new Array()

    attesterSignedUpEvent.parameters.push(
        new ethereum.EventParam(
            'attesterId',
            ethereum.Value.fromUnsignedBigInt(attesterId)
        )
    )
    attesterSignedUpEvent.parameters.push(
        new ethereum.EventParam(
            'epochLength',
            ethereum.Value.fromUnsignedBigInt(epochLength)
        )
    )
    attesterSignedUpEvent.parameters.push(
        new ethereum.EventParam(
            'timestamp',
            ethereum.Value.fromUnsignedBigInt(timestamp)
        )
    )

    return attesterSignedUpEvent
}

export function createEpochEndedEvent(
    epoch: BigInt,
    attesterId: BigInt
): EpochEnded {
    let epochEndedEvent = changetype<EpochEnded>(newMockEvent())

    epochEndedEvent.parameters = new Array()

    epochEndedEvent.parameters.push(
        new ethereum.EventParam(
            'epoch',
            ethereum.Value.fromUnsignedBigInt(epoch)
        )
    )
    epochEndedEvent.parameters.push(
        new ethereum.EventParam(
            'attesterId',
            ethereum.Value.fromUnsignedBigInt(attesterId)
        )
    )

    return epochEndedEvent
}

export function createEpochTreeLeafEvent(
    epoch: BigInt,
    attesterId: BigInt,
    index: BigInt,
    leaf: BigInt
): EpochTreeLeaf {
    let epochTreeLeafEvent = changetype<EpochTreeLeaf>(newMockEvent())

    epochTreeLeafEvent.parameters = new Array()

    epochTreeLeafEvent.parameters.push(
        new ethereum.EventParam(
            'epoch',
            ethereum.Value.fromUnsignedBigInt(epoch)
        )
    )
    epochTreeLeafEvent.parameters.push(
        new ethereum.EventParam(
            'attesterId',
            ethereum.Value.fromUnsignedBigInt(attesterId)
        )
    )
    epochTreeLeafEvent.parameters.push(
        new ethereum.EventParam(
            'index',
            ethereum.Value.fromUnsignedBigInt(index)
        )
    )
    epochTreeLeafEvent.parameters.push(
        new ethereum.EventParam('leaf', ethereum.Value.fromUnsignedBigInt(leaf))
    )

    return epochTreeLeafEvent
}

export function createHistoryTreeLeafEvent(
    attesterId: BigInt,
    leaf: BigInt
): HistoryTreeLeaf {
    let historyTreeLeafEvent = changetype<HistoryTreeLeaf>(newMockEvent())

    historyTreeLeafEvent.parameters = new Array()

    historyTreeLeafEvent.parameters.push(
        new ethereum.EventParam(
            'attesterId',
            ethereum.Value.fromUnsignedBigInt(attesterId)
        )
    )
    historyTreeLeafEvent.parameters.push(
        new ethereum.EventParam('leaf', ethereum.Value.fromUnsignedBigInt(leaf))
    )

    return historyTreeLeafEvent
}

export function createStateTreeLeafEvent(
    epoch: BigInt,
    attesterId: BigInt,
    index: BigInt,
    leaf: BigInt
): StateTreeLeaf {
    let stateTreeLeafEvent = changetype<StateTreeLeaf>(newMockEvent())

    stateTreeLeafEvent.parameters = new Array()

    stateTreeLeafEvent.parameters.push(
        new ethereum.EventParam(
            'epoch',
            ethereum.Value.fromUnsignedBigInt(epoch)
        )
    )
    stateTreeLeafEvent.parameters.push(
        new ethereum.EventParam(
            'attesterId',
            ethereum.Value.fromUnsignedBigInt(attesterId)
        )
    )
    stateTreeLeafEvent.parameters.push(
        new ethereum.EventParam(
            'index',
            ethereum.Value.fromUnsignedBigInt(index)
        )
    )
    stateTreeLeafEvent.parameters.push(
        new ethereum.EventParam('leaf', ethereum.Value.fromUnsignedBigInt(leaf))
    )

    return stateTreeLeafEvent
}

export function createUserSignedUpEvent(
    epoch: BigInt,
    identityCommitment: BigInt,
    attesterId: BigInt,
    leafIndex: BigInt
): UserSignedUp {
    let userSignedUpEvent = changetype<UserSignedUp>(newMockEvent())

    userSignedUpEvent.parameters = new Array()

    userSignedUpEvent.parameters.push(
        new ethereum.EventParam(
            'epoch',
            ethereum.Value.fromUnsignedBigInt(epoch)
        )
    )
    userSignedUpEvent.parameters.push(
        new ethereum.EventParam(
            'identityCommitment',
            ethereum.Value.fromUnsignedBigInt(identityCommitment)
        )
    )
    userSignedUpEvent.parameters.push(
        new ethereum.EventParam(
            'attesterId',
            ethereum.Value.fromUnsignedBigInt(attesterId)
        )
    )
    userSignedUpEvent.parameters.push(
        new ethereum.EventParam(
            'leafIndex',
            ethereum.Value.fromUnsignedBigInt(leafIndex)
        )
    )

    return userSignedUpEvent
}

export function createUserStateTransitionedEvent(
    epoch: BigInt,
    attesterId: BigInt,
    leafIndex: BigInt,
    hashedLeaf: BigInt,
    nullifier: BigInt
): UserStateTransitioned {
    let userStateTransitionedEvent = changetype<UserStateTransitioned>(
        newMockEvent()
    )

    userStateTransitionedEvent.parameters = new Array()

    userStateTransitionedEvent.parameters.push(
        new ethereum.EventParam(
            'epoch',
            ethereum.Value.fromUnsignedBigInt(epoch)
        )
    )
    userStateTransitionedEvent.parameters.push(
        new ethereum.EventParam(
            'attesterId',
            ethereum.Value.fromUnsignedBigInt(attesterId)
        )
    )
    userStateTransitionedEvent.parameters.push(
        new ethereum.EventParam(
            'leafIndex',
            ethereum.Value.fromUnsignedBigInt(leafIndex)
        )
    )
    userStateTransitionedEvent.parameters.push(
        new ethereum.EventParam(
            'hashedLeaf',
            ethereum.Value.fromUnsignedBigInt(hashedLeaf)
        )
    )
    userStateTransitionedEvent.parameters.push(
        new ethereum.EventParam(
            'nullifier',
            ethereum.Value.fromUnsignedBigInt(nullifier)
        )
    )

    return userStateTransitionedEvent
}
