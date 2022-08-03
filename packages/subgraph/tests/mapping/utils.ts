import {
    Address,
    ethereum,
    JSONValue,
    Value,
    ipfs,
    json,
    Bytes,
    BigDecimal,
    BigInt,
} from '@graphprotocol/graph-ts'
import { newMockEvent } from 'matchstick-as'
import { UserSignedUp } from '../../generated/Unirep/Unirep'

export function handleUserSignedUp(events: UserSignedUp[]): void {}

export function createNewUserSignedUpEvent(
    id: BigInt,
    identityCommitment: string,
    attesterId: string,
    epochKey: string,
    createdAt: string,
    airdropRep: string
): UserSignedUp {
    let newUserSignedUpEvent = changetype<UserSignedUp>(newMockEvent())

    newUserSignedUpEvent.parameters = new Array()
    let idCommitmentParam = new ethereum.EventParam(
        'idCommitment',
        ethereum.Value.fromString(identityCommitment)
    )
    let attesterIdParam = new ethereum.EventParam(
        'attesterId',
        ethereum.Value.fromString(attesterId)
    )

    let epochKeyParam = new ethereum.EventParam(
        'epochKey',
        ethereum.Value.fromString(epochKey)
    )
    let createdAtParam = new ethereum.EventParam(
        'createdAt',
        ethereum.Value.fromString(createdAt)
    )
    let airdropRepParam = new ethereum.EventParam(
        'airdropRep',
        ethereum.Value.fromString(airdropRep)
    )

    newUserSignedUpEvent.parameters.push(idCommitmentParam)
    newUserSignedUpEvent.parameters.push(attesterIdParam)
    newUserSignedUpEvent.parameters.push(epochKeyParam)
    newUserSignedUpEvent.parameters.push(createdAtParam)
    newUserSignedUpEvent.parameters.push(airdropRepParam)

    return newUserSignedUpEvent
}
