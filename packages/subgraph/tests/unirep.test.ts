import {
    assert,
    describe,
    test,
    clearStore,
    beforeAll,
    afterAll,
} from 'matchstick-as/assembly/index'
import { BigInt } from '@graphprotocol/graph-ts'
import { Attestation } from '../generated/schema'
import {
    Attestation as AttestationEvent,
    Unirep,
} from '../generated/Unirep/Unirep'
import { handleAttestation } from '../src/unirep'
import { createAttestationEvent } from './unirep-utils'

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe('Describe entity assertions', () => {
    beforeAll(() => {
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
    })

    afterAll(() => {
        clearStore()
    })

    // For more test scenarios, see:
    // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

    test('Attestation created and stored', () => {
        assert.entityCount('Attestation', 1)

        // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
        assert.fieldEquals(
            'Attestation',
            '0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000',
            'epoch',
            '234'
        )
        assert.fieldEquals(
            'Attestation',
            '0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000',
            'epochKey',
            '234'
        )
        assert.fieldEquals(
            'Attestation',
            '0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000',
            'attesterId',
            '234'
        )
        assert.fieldEquals(
            'Attestation',
            '0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000',
            'fieldIndex',
            '234'
        )
        assert.fieldEquals(
            'Attestation',
            '0xa16081f360e3847006db660bae1c6d1b2e17ec2a01000000',
            'change',
            '234'
        )

        // More assert options:
        // https://thegraph.com/docs/en/developer/matchstick/#asserts
    })
})
