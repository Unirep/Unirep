import { expect } from 'chai'
import { ZkIdentity, hash1 } from '@unirep/utils'
import { Circuit } from '../src'
import { genReputationCircuitInput, genProofAndVerify } from './utils'

describe('Prove reputation from attester circuit', function () {
    this.timeout(300000)

    it('should prove a reputation', async () => {
        const id = new ZkIdentity()
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch: 1,
            nonce: 0,
            attesterId: 1,
            startBalance: { posRep: 0, negRep: 0, graffiti: 0, timestamp: 0 },
        })
        const { isValid } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
    })

    it('should prove a minRep', async () => {
        const id = new ZkIdentity()
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch: 1,
            nonce: 0,
            attesterId: 1,
            startBalance: { posRep: 5, negRep: 1, graffiti: 0, timestamp: 0 },
            minRep: 2,
        })
        const { isValid } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
    })

    it('should fail to prove minRep', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 0
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: { posRep: 10, negRep: 5 },
            minRep: 8,
        })
        try {
            await genProofAndVerify(Circuit.proveReputation, circuitInputs)
            expect(false).to.be.true
        } catch (err) {}
    })

    it('should choose not to prove minRep', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 0
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: { posRep: 5, negRep: 10 },
            minRep: 0,
        })
        const { isValid } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
    })

    it('successfully choose not to prove graffiti with wrong value', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 0
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: { posRep: 0, negRep: 0, graffiti: 0, timestamp: 0 },
            minRep: 0,
            proveGraffiti: false,
            graffitiPreImage: 124124021,
        })
        const { isValid } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
    })

    it('should fail to prove wrong graffiti pre-image', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 0
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: {
                posRep: 0,
                negRep: 0,
                graffiti: 100191,
                timestamp: 0,
            },
            minRep: 0,
            proveGraffiti: true,
            graffitiPreImage: 124124021,
        })
        try {
            await genProofAndVerify(Circuit.proveReputation, circuitInputs)
            expect(false).to.be.true
        } catch (e) {}
    })

    it('should prove graffiti pre-image', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 0
        const preImage = 124914219
        const graffiti = hash1([preImage])
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: { posRep: 0, negRep: 0, graffiti, timestamp: 0 },
            minRep: 0,
            proveGraffiti: true,
            graffitiPreImage: preImage,
        })
        const { isValid } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
    })
})
