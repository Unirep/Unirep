import { expect } from 'chai'
import { Strategy, ZkIdentity } from '../src'

describe('ZkIdentity', function () {
    let identity: ZkIdentity

    it('constructor', async () => {
        identity = new ZkIdentity()
        expect(typeof identity).equal('object')
    })

    it('commitment', async () => {
        const commitment = identity.genIdentityCommitment()
        expect(typeof commitment).equal('bigint')
    })

    it('identityNullifier', async () => {
        const idNullifier = identity.identityNullifier
        expect(typeof idNullifier).equal('bigint')
    })

    it('identityTrapdoor', async () => {
        const idTrapdoor = identity.trapdoor
        expect(typeof idTrapdoor).equal('bigint')
    })

    it('Serialize/Unserialize ZkIdentity', async () => {
        const serializedIdentity = identity.serializeIdentity()
        expect(typeof serializedIdentity).equal('string')

        const unserializedIdentity = new ZkIdentity(
            Strategy.SERIALIZED,
            serializedIdentity
        )
        expect(unserializedIdentity).deep.equal(identity)
    })
})
