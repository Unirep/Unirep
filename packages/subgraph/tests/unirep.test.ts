import {
    assert,
    describe,
    test,
    clearStore,
    afterAll,
} from 'matchstick-as/assembly/index'
import { BigInt } from '@graphprotocol/graph-ts'
import {
    handleAttestation,
    handleAttesterSignedUp,
    handleEpochEnded,
    handleEpochTreeLeaf,
    handleHistoryTreeLeaf,
    handleStateTreeLeaf,
    handleUserSignedUp,
    handleUserStateTransitioned,
} from '../src/unirep'
import {
    createAttestationEvent,
    createAttesterSignedUpEvent,
    createEpochEndedEvent,
    createEpochTreeLeafEvent,
    createHistoryTreeLeafEvent,
    createStateTreeLeafEvent,
    createUserSignedUpEvent,
    createUserStateTransitionedEvent,
} from './unirep-utils'

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0
let DEFAULT_ADDRESS = '0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000'

describe('Describe entity assertions', () => {
    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function

    afterAll(() => {
        clearStore()
    })

    // For more test scenarios, see:
    // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

    test('Attestation created and stored', () => {
        let SCHEMA = 'Attestation'
        let epoch = BigInt.fromI32(234)
        let epochKey = BigInt.fromI32(234)
        let attesterId = BigInt.fromI32(234)
        let fieldIndex = BigInt.fromI32(234)
        let change = BigInt.fromI32(234)
        let newAttestationEvent = createAttestationEvent(
            epoch,
            epochKey,
            attesterId,
            fieldIndex,
            change
        )
        handleAttestation(newAttestationEvent)

        assert.entityCount(SCHEMA, 1)

        assert.fieldEquals(SCHEMA, DEFAULT_ADDRESS, 'epoch', epoch.toString())
        assert.fieldEquals(
            SCHEMA,
            DEFAULT_ADDRESS,
            'epochKey',
            epochKey.toString()
        )
        assert.fieldEquals(
            SCHEMA,
            DEFAULT_ADDRESS,
            'attesterId',
            attesterId.toString()
        )
        assert.fieldEquals(
            SCHEMA,
            DEFAULT_ADDRESS,
            'fieldIndex',
            fieldIndex.toString()
        )
        assert.fieldEquals(SCHEMA, DEFAULT_ADDRESS, 'change', change.toString())

        // More assert options:
        // https://thegraph.com/docs/en/developer/matchstick/#asserts
    })

    test('Attester created and stored', () => {
        let SCHEMA = 'Attester'
        let attesterId = BigInt.fromI32(234)
        let epochLength = BigInt.fromI32(234)
        let timestamp = BigInt.fromI32(234)
        let newAttesterSignedUpEvent = createAttesterSignedUpEvent(
            attesterId,
            epochLength,
            timestamp
        )
        handleAttesterSignedUp(newAttesterSignedUpEvent)

        assert.entityCount(SCHEMA, 1)

        assert.fieldEquals(
            SCHEMA,
            DEFAULT_ADDRESS,
            'attesterId',
            attesterId.toString()
        )
        assert.fieldEquals(
            SCHEMA,
            DEFAULT_ADDRESS,
            'epochLength',
            epochLength.toString()
        )
        assert.fieldEquals(
            SCHEMA,
            DEFAULT_ADDRESS,
            'startTimestamp',
            timestamp.toString()
        )
    })

    test('Epoch created and stored', () => {
        let SCHEMA = 'Epoch'
        let attesterId = BigInt.fromI32(234)
        let epoch = BigInt.fromI32(123)
        let newEpochEndedEvent = createEpochEndedEvent(epoch, attesterId)
        handleEpochEnded(newEpochEndedEvent)

        assert.entityCount(SCHEMA, 1)

        assert.fieldEquals(
            SCHEMA,
            DEFAULT_ADDRESS,
            'attesterId',
            attesterId.toString()
        )
        assert.fieldEquals(SCHEMA, DEFAULT_ADDRESS, 'number', epoch.toString())
    })

    test('User created and stored', () => {
        let SCHEMA = 'User'
        let attesterId = BigInt.fromI32(234)
        let epoch = BigInt.fromI32(123)
        let identityCommitment = BigInt.fromI32(234)
        let leafIndex = BigInt.fromI32(3)
        let newSignedUpEvent = createUserSignedUpEvent(
            epoch,
            identityCommitment,
            attesterId,
            leafIndex
        )
        handleUserSignedUp(newSignedUpEvent)

        assert.entityCount(SCHEMA, 1)

        assert.fieldEquals(
            SCHEMA,
            DEFAULT_ADDRESS,
            'commitment',
            identityCommitment.toString()
        )
        assert.fieldEquals(SCHEMA, DEFAULT_ADDRESS, 'epoch', epoch.toString())
        assert.fieldEquals(
            SCHEMA,
            DEFAULT_ADDRESS,
            'attesterId',
            attesterId.toString()
        )
        assert.fieldEquals(
            SCHEMA,
            DEFAULT_ADDRESS,
            'leafIndex',
            leafIndex.toString()
        )
    })

    test('StateTreeLeaf created and stored', () => {
        let SCHEMA = 'StateTreeLeaf'
        let attesterId = BigInt.fromI32(234)
        let epoch = BigInt.fromI32(123)
        let index = BigInt.fromI32(234)
        let leaf = BigInt.fromI32(3)
        let newStateTreeLeafEvent = createStateTreeLeafEvent(
            epoch,
            attesterId,
            index,
            leaf
        )
        handleStateTreeLeaf(newStateTreeLeafEvent)

        assert.entityCount(SCHEMA, 1)

        assert.fieldEquals(SCHEMA, DEFAULT_ADDRESS, 'epoch', epoch.toString())
        assert.fieldEquals(SCHEMA, DEFAULT_ADDRESS, 'leaf', leaf.toString())
        assert.fieldEquals(SCHEMA, DEFAULT_ADDRESS, 'index', index.toString())
        assert.fieldEquals(
            SCHEMA,
            DEFAULT_ADDRESS,
            'attesterId',
            attesterId.toString()
        )
    })

    test('EpochTreeLeaf created and stored', () => {
        let SCHEMA = 'EpochTreeLeaf'
        let attesterId = BigInt.fromI32(234)
        let epoch = BigInt.fromI32(123)
        let index = BigInt.fromI32(234)
        let leaf = BigInt.fromI32(3)
        let newEpochTreeLeafEvent = createEpochTreeLeafEvent(
            epoch,
            attesterId,
            index,
            leaf
        )
        handleEpochTreeLeaf(newEpochTreeLeafEvent)

        assert.entityCount(SCHEMA, 1)

        assert.fieldEquals(SCHEMA, DEFAULT_ADDRESS, 'epoch', epoch.toString())
        assert.fieldEquals(SCHEMA, DEFAULT_ADDRESS, 'leaf', leaf.toString())
        assert.fieldEquals(SCHEMA, DEFAULT_ADDRESS, 'index', index.toString())
        assert.fieldEquals(
            SCHEMA,
            DEFAULT_ADDRESS,
            'attesterId',
            attesterId.toString()
        )
    })

    test('HistoryTreeLeaf created and stored', () => {
        let SCHEMA = 'HistoryTreeLeaf'
        let attesterId = BigInt.fromI32(234)
        let leaf = BigInt.fromI32(3)

        let newHistoryTreeLeafEvent = createHistoryTreeLeafEvent(
            attesterId,
            leaf
        )
        handleHistoryTreeLeaf(newHistoryTreeLeafEvent)

        assert.entityCount(SCHEMA, 1)

        assert.fieldEquals(SCHEMA, DEFAULT_ADDRESS, 'leaf', leaf.toString())
        assert.fieldEquals(
            SCHEMA,
            DEFAULT_ADDRESS,
            'attesterId',
            attesterId.toString()
        )
    })

    test('Epoch created and stored', () => {
        let SCHEMA = 'Epoch'
        let attesterId = BigInt.fromI32(234)
        let number = BigInt.fromI32(3)

        let newEpochEndedEvent = createEpochEndedEvent(number, attesterId)
        handleEpochEnded(newEpochEndedEvent)

        assert.entityCount(SCHEMA, 1)

        assert.fieldEquals(SCHEMA, DEFAULT_ADDRESS, 'number', number.toString())
        assert.fieldEquals(
            SCHEMA,
            DEFAULT_ADDRESS,
            'attesterId',
            attesterId.toString()
        )
    })

    test('Nullifier created and stored', () => {
        let SCHEMA = 'Nullifier'
        let attesterId = BigInt.fromI32(234)
        let epoch = BigInt.fromI32(3)
        let nullifier = BigInt.fromI32(123456)
        let hashedLeaf = BigInt.fromI32(456)
        let leafIndex = BigInt.fromI32(234)

        let newUserStateTransitionedEvent = createUserStateTransitionedEvent(
            epoch,
            attesterId,
            leafIndex,
            hashedLeaf,
            nullifier
        )
        handleUserStateTransitioned(newUserStateTransitionedEvent)

        assert.entityCount(SCHEMA, 1)

        assert.fieldEquals(SCHEMA, DEFAULT_ADDRESS, 'epoch', epoch.toString())
        assert.fieldEquals(
            SCHEMA,
            DEFAULT_ADDRESS,
            'attesterId',
            attesterId.toString()
        )
        assert.fieldEquals(
            SCHEMA,
            DEFAULT_ADDRESS,
            'nullifier',
            nullifier.toString()
        )
    })

    test('User created and stored', () => {
        let SCHEMA = 'User'
        let attesterId = BigInt.fromI32(234)
        let epoch = BigInt.fromI32(3)
        let commitment = BigInt.fromI32(123456)
        let leafIndex = BigInt.fromI32(5)

        let newUserSignedUpEvent = createUserSignedUpEvent(
            epoch,
            commitment,
            attesterId,
            leafIndex
        )
        handleUserSignedUp(newUserSignedUpEvent)

        assert.entityCount(SCHEMA, 1)

        assert.fieldEquals(SCHEMA, DEFAULT_ADDRESS, 'epoch', epoch.toString())
        assert.fieldEquals(
            SCHEMA,
            DEFAULT_ADDRESS,
            'attesterId',
            attesterId.toString()
        )
        assert.fieldEquals(
            SCHEMA,
            DEFAULT_ADDRESS,
            'commitment',
            commitment.toString()
        )
        assert.fieldEquals(
            SCHEMA,
            DEFAULT_ADDRESS,
            'leafIndex',
            leafIndex.toString()
        )
    })

    test('Attester created and stored', () => {
        let SCHEMA = 'Attester'
        let attesterId = BigInt.fromI32(234)
        let startTimestamp = BigInt.fromI32(300)
        let epochLength = BigInt.fromI32(500)

        let newAttesterSignedUpEvent = createAttesterSignedUpEvent(
            attesterId,
            epochLength,
            startTimestamp
        )
        handleAttesterSignedUp(newAttesterSignedUpEvent)

        assert.entityCount(SCHEMA, 1)

        assert.fieldEquals(
            SCHEMA,
            DEFAULT_ADDRESS,
            'attesterId',
            attesterId.toString()
        )
        assert.fieldEquals(
            SCHEMA,
            DEFAULT_ADDRESS,
            'startTimestamp',
            startTimestamp.toString()
        )
        assert.fieldEquals(
            SCHEMA,
            DEFAULT_ADDRESS,
            'epochLength',
            epochLength.toString()
        )
    })
})
