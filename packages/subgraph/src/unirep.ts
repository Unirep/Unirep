import {
    Attestation as AttestationEvent,
    AttesterSignedUp as AttesterSignedUpEvent,
    EpochEnded as EpochEndedEvent,
    EpochTreeLeaf as EpochTreeLeafEvent,
    HistoryTreeLeaf as HistoryTreeLeafEvent,
    StateTreeLeaf as StateTreeLeafEvent,
    UserSignedUp as UserSignedUpEvent,
    UserStateTransitioned as UserStateTransitionedEvent,
} from '../generated/Unirep/Unirep'
import {
    Attestation,
    AttesterSignedUp,
    EpochEnded,
    EpochTreeLeaf,
    HistoryTreeLeaf,
    StateTreeLeaf,
    UserSignedUp,
    UserStateTransitioned,
} from '../generated/schema'
import { log } from '@graphprotocol/graph-ts'

export function handleAttestation(event: AttestationEvent): void {
    let entity = new Attestation(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    entity.epoch = event.params.epoch
    entity.epochKey = event.params.epochKey
    entity.attesterId = event.params.attesterId
    entity.fieldIndex = event.params.fieldIndex
    entity.change = event.params.change

    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash

    entity.save()
}

export function handleAttesterSignedUp(event: AttesterSignedUpEvent): void {
    let entity = new AttesterSignedUp(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    entity.attesterId = event.params.attesterId
    entity.epochLength = event.params.epochLength
    entity.timestamp = event.params.timestamp

    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash

    entity.save()
}

export function handleEpochEnded(event: EpochEndedEvent): void {
    let entity = new EpochEnded(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    entity.epoch = event.params.epoch
    entity.attesterId = event.params.attesterId

    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash

    entity.save()
}

export function handleEpochTreeLeaf(event: EpochTreeLeafEvent): void {
    let entity = new EpochTreeLeaf(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    entity.epoch = event.params.epoch
    entity.attesterId = event.params.attesterId
    entity.index = event.params.index
    entity.leaf = event.params.leaf

    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash

    entity.save()
}

export function handleHistoryTreeLeaf(event: HistoryTreeLeafEvent): void {
    let entity = new HistoryTreeLeaf(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    entity.attesterId = event.params.attesterId
    entity.leaf = event.params.leaf

    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash

    entity.save()
}

export function handleStateTreeLeaf(event: StateTreeLeafEvent): void {
    let entity = new StateTreeLeaf(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    entity.epoch = event.params.epoch
    entity.attesterId = event.params.attesterId
    entity.index = event.params.index
    entity.leaf = event.params.leaf

    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash

    entity.save()
}

export function handleUserSignedUp(event: UserSignedUpEvent): void {
    let entity = new UserSignedUp(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    entity.epoch = event.params.epoch
    entity.identityCommitment = event.params.identityCommitment
    entity.attesterId = event.params.attesterId
    entity.leafIndex = event.params.leafIndex

    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash

    entity.save()
}

export function handleUserStateTransitioned(
    event: UserStateTransitionedEvent
): void {
    let entity = new UserStateTransitioned(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    entity.epoch = event.params.epoch
    entity.attesterId = event.params.attesterId
    entity.leafIndex = event.params.leafIndex
    entity.hashedLeaf = event.params.hashedLeaf
    entity.nullifier = event.params.nullifier

    entity.blockNumber = event.block.number
    entity.blockTimestamp = event.block.timestamp
    entity.transactionHash = event.transaction.hash

    entity.save()
}
