import {
    AttestationSubmitted,
    EpochEnded,
    IndexedEpochKeyProof,
    IndexedProcessedAttestationsProof,
    IndexedReputationProof,
    IndexedStartedTransitionProof,
    IndexedUserStateTransitionProof,
    UserSignedUp,
    UserStateTransitioned,
} from '../generated/Unirep/Unirep'
import { ReputationEntity } from '../generated/schema'
import { buildId } from './utils'
import { createOrLoadUser } from './entities/user'

export function handleAttestationSubmitted(event: AttestationSubmitted): void {}

export function handleEpochEnded(event: EpochEnded): void {}

export function handleIndexedEpochKeyProof(event: IndexedEpochKeyProof): void {}

export function handleIndexedProcessedAttestationsProof(
    event: IndexedProcessedAttestationsProof
): void {}

export function handleIndexedReputationProof(
    event: IndexedReputationProof
): void {
    const id = buildId(event)
    let reputationEntity = ReputationEntity.load(id)
    let userEntity = createOrLoadUser(event)

    if (reputationEntity == null) {
        reputationEntity = new ReputationEntity(id)
    }

    reputationEntity.user = userEntity.id
    reputationEntity.createdAt = event.block.timestamp

    reputationEntity.save()
}

export function handleIndexedStartedTransitionProof(
    event: IndexedStartedTransitionProof
): void {}

export function handleIndexedUserStateTransitionProof(
    event: IndexedUserStateTransitionProof
): void {}

export function handleUserSignedUp(event: UserSignedUp): void {
    let userEntity = createOrLoadUser(event)

    userEntity.identityCommitment =
        event.params.identityCommitment.toBigDecimal()
    userEntity.attesterId = event.params.attesterId.toBigDecimal()
    userEntity.epochKey = event.params.epoch

    userEntity.createdAt = event.block.timestamp
    userEntity.airdropRep = event.params.airdropAmount

    userEntity.save()
}

export function handleUserStateTransitioned(
    event: UserStateTransitioned
): void {}
