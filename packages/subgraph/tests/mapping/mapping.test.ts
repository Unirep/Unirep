import { describe, test, assert } from 'matchstick-as'
import { BigInt } from '@graphprotocol/graph-ts'
import { handleUserSignedUp } from '../../src/mapping'
import { createNewUserSignedUpEvent } from './utils'

let UNIREP_ENTITY_TYPE = 'UserSignedUp'

describe('handleUserSignedUp()', () => {
    test('Should create a new user entity', () => {
        // Call mappings
        let newUserSignedUpEvent = createNewUserSignedUpEvent(
            new BigInt(1),
            'mockIdentityCommitment',
            'mockAttesterId',
            'mockEpochKey',
            'mockCreatedAt',
            'mockAirdropRep'
        )

        handleUserSignedUp(newUserSignedUpEvent)

        assert.entityCount(UNIREP_ENTITY_TYPE, 1)
        assert.fieldEquals(
            UNIREP_ENTITY_TYPE,
            '1',
            'identityCommitment',
            'mockIdentityCommitment'
        )
    })
})
