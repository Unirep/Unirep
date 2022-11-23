import { expect } from 'chai'
import { ZkIdentity, hash1 } from '@unirep/utils'
import { Circuit, ReputationProof } from '../src'
import { genReputationCircuitInput, genProofAndVerify } from './utils'

describe('Prove reputation from attester circuit', function () {
    this.timeout(300000)

    it('should prove a reputation', async () => {
        const id = new ZkIdentity()
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch: 1,
            nonce: 2,
            attesterId: 1,
            startBalance: { posRep: 0, negRep: 0, graffiti: 0, timestamp: 0 },
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        const data = new ReputationProof(publicSignals, proof)
        expect(data.epoch.toString()).to.equal('1')
        expect(data.nonce.toString()).to.equal('0')
        expect(data.revealNonce.toString()).to.equal('0')
        expect(data.attesterId.toString()).to.equal('1')
        expect(data.proveMinRep.toString()).to.equal('0')
        expect(data.proveMaxRep.toString()).to.equal('0')
        expect(data.proveZeroRep.toString()).to.equal('0')
        expect(data.minRep.toString()).to.equal('0')
        expect(data.maxRep.toString()).to.equal('0')
        expect(data.proveGraffiti.toString()).to.equal('0')
        expect(data.graffitiPreImage.toString()).to.equal('0')
    })

    it('should prove a minRep', async () => {
        const id = new ZkIdentity()
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch: 1,
            nonce: 1,
            attesterId: 1,
            startBalance: { posRep: 5, negRep: 1, graffiti: 0, timestamp: 0 },
            minRep: 2,
            proveMinRep: 1,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        const data = new ReputationProof(publicSignals, proof)
        expect(data.epoch.toString()).to.equal('1')
        expect(data.nonce.toString()).to.equal('0')
        expect(data.revealNonce.toString()).to.equal('0')
        expect(data.attesterId.toString()).to.equal('1')
        expect(data.proveMinRep.toString()).to.equal('1')
        expect(data.proveMaxRep.toString()).to.equal('0')
        expect(data.proveZeroRep.toString()).to.equal('0')
        expect(data.minRep.toString()).to.equal('2')
        expect(data.maxRep.toString()).to.equal('0')
        expect(data.proveGraffiti.toString()).to.equal('0')
        expect(data.graffitiPreImage.toString()).to.equal('0')
    })

    it('should prove a maxRep', async () => {
        const id = new ZkIdentity()
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch: 1,
            nonce: 1,
            attesterId: 1,
            startBalance: { posRep: 5, negRep: 10, graffiti: 0, timestamp: 0 },
            maxRep: 4,
            proveMaxRep: 1,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        const data = new ReputationProof(publicSignals, proof)
        expect(data.epoch.toString()).to.equal('1')
        expect(data.nonce.toString()).to.equal('0')
        expect(data.revealNonce.toString()).to.equal('0')
        expect(data.attesterId.toString()).to.equal('1')
        expect(data.proveMinRep.toString()).to.equal('0')
        expect(data.proveMaxRep.toString()).to.equal('1')
        expect(data.proveZeroRep.toString()).to.equal('0')
        expect(data.minRep.toString()).to.equal('0')
        expect(data.maxRep.toString()).to.equal('4')
        expect(data.proveGraffiti.toString()).to.equal('0')
        expect(data.graffitiPreImage.toString()).to.equal('0')
    })

    it('should prove a minRep and maxRep', async () => {
        const id = new ZkIdentity()
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch: 1,
            nonce: 2,
            attesterId: 1,
            startBalance: { posRep: 10, negRep: 10, graffiti: 0, timestamp: 0 },
            minRep: 0,
            maxRep: 0,
            proveMaxRep: 1,
            proveMinRep: 1,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        const data = new ReputationProof(publicSignals, proof)
        expect(data.epoch.toString()).to.equal('1')
        expect(data.nonce.toString()).to.equal('0')
        expect(data.revealNonce.toString()).to.equal('0')
        expect(data.attesterId.toString()).to.equal('1')
        expect(data.proveMinRep.toString()).to.equal('1')
        expect(data.proveMaxRep.toString()).to.equal('1')
        expect(data.proveZeroRep.toString()).to.equal('0')
        expect(data.minRep.toString()).to.equal('0')
        expect(data.maxRep.toString()).to.equal('0')
        expect(data.proveGraffiti.toString()).to.equal('0')
        expect(data.graffitiPreImage.toString()).to.equal('0')
    })

    it('should prove a minRep and maxRep and zero rep', async () => {
        const id = new ZkIdentity()
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch: 1,
            nonce: 0,
            attesterId: 1,
            startBalance: { posRep: 10, negRep: 10, graffiti: 0, timestamp: 0 },
            minRep: 0,
            maxRep: 0,
            proveMaxRep: 1,
            proveMinRep: 1,
            proveZeroRep: 1,
            revealNonce: 1,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        expect(publicSignals[2].toString()).to.equal(
            ReputationProof.buildControlInput({
                epoch: 1,
                nonce: 0,
                attesterId: 1,
                revealNonce: 1,
                proveGraffiti: 0,
                minRep: 0,
                maxRep: 0,
                proveMaxRep: 1,
                proveMinRep: 1,
                proveZeroRep: 1,
            })[0].toString()
        )
        const data = new ReputationProof(publicSignals, proof)
        expect(data.epoch.toString()).to.equal('1')
        expect(data.nonce.toString()).to.equal('0')
        expect(data.revealNonce.toString()).to.equal('1')
        expect(data.attesterId.toString()).to.equal('1')
        expect(data.proveMinRep.toString()).to.equal('1')
        expect(data.proveMaxRep.toString()).to.equal('1')
        expect(data.proveZeroRep.toString()).to.equal('1')
        expect(data.minRep.toString()).to.equal('0')
        expect(data.maxRep.toString()).to.equal('0')
        expect(data.proveGraffiti.toString()).to.equal('0')
        expect(data.graffitiPreImage.toString()).to.equal('0')
    })

    it('should fail to prove zero rep', async () => {
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
            proveZeroRep: 1,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.proveReputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove maxRep', async () => {
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
            maxRep: 8,
            proveMaxRep: 1,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.proveReputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
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
            proveMinRep: 1,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.proveReputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should choose not to prove minRep', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 0
        const minRep = 10000
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: { posRep: 5, negRep: 10 },
            minRep,
            proveMinRep: 0,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        const data = new ReputationProof(publicSignals, proof)
        expect(data.epoch.toString()).to.equal(epoch.toString())
        expect(data.nonce.toString()).to.equal('0')
        expect(data.revealNonce.toString()).to.equal('0')
        expect(data.attesterId.toString()).to.equal(attesterId.toString())
        expect(data.proveMinRep.toString()).to.equal('0')
        expect(data.proveMaxRep.toString()).to.equal('0')
        expect(data.proveZeroRep.toString()).to.equal('0')
        expect(data.minRep.toString()).to.equal(minRep.toString())
        expect(data.maxRep.toString()).to.equal('0')
        expect(data.proveGraffiti.toString()).to.equal('0')
        expect(data.graffitiPreImage.toString()).to.equal('0')
    })

    it('successfully choose not to prove graffiti with wrong value', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 0
        const graffitiPreImage = 124124021
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: { posRep: 0, negRep: 0, graffiti: 0, timestamp: 0 },
            minRep: 0,
            proveGraffiti: false,
            graffitiPreImage,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        const data = new ReputationProof(publicSignals, proof)
        expect(data.epoch.toString()).to.equal(epoch.toString())
        expect(data.nonce.toString()).to.equal('0')
        expect(data.revealNonce.toString()).to.equal('0')
        expect(data.attesterId.toString()).to.equal(attesterId.toString())
        expect(data.proveMinRep.toString()).to.equal('0')
        expect(data.proveMaxRep.toString()).to.equal('0')
        expect(data.proveZeroRep.toString()).to.equal('0')
        expect(data.minRep.toString()).to.equal('0')
        expect(data.maxRep.toString()).to.equal('0')
        expect(data.proveGraffiti.toString()).to.equal('0')
        expect(data.graffitiPreImage.toString()).to.equal(
            graffitiPreImage.toString()
        )
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
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.proveReputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should prove graffiti pre-image', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 0
        const graffitiPreImage = 124914219
        const graffiti = hash1([graffitiPreImage])
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: { posRep: 0, negRep: 0, graffiti, timestamp: 0 },
            minRep: 0,
            proveGraffiti: true,
            graffitiPreImage,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        const data = new ReputationProof(publicSignals, proof)
        expect(data.epoch.toString()).to.equal(epoch.toString())
        expect(data.nonce.toString()).to.equal('0')
        expect(data.revealNonce.toString()).to.equal('0')
        expect(data.attesterId.toString()).to.equal(attesterId.toString())
        expect(data.proveMinRep.toString()).to.equal('0')
        expect(data.proveMaxRep.toString()).to.equal('0')
        expect(data.proveZeroRep.toString()).to.equal('0')
        expect(data.minRep.toString()).to.equal('0')
        expect(data.maxRep.toString()).to.equal('0')
        expect(data.proveGraffiti.toString()).to.equal('1')
        expect(data.graffitiPreImage.toString()).to.equal(
            graffitiPreImage.toString()
        )
    })

    it('should not reveal nonce', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 1
        const preImage = 124914219
        const graffiti = hash1([preImage])
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: { posRep: 0, negRep: 0, graffiti, timestamp: 0 },
        })
        const { isValid, proof, publicSignals } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        const data = new ReputationProof(publicSignals, proof)
        expect(data.epoch.toString()).to.equal(epoch.toString())
        expect(data.nonce.toString()).to.equal('0')
        expect(data.revealNonce.toString()).to.equal('0')
        expect(data.attesterId.toString()).to.equal(attesterId.toString())
        expect(data.proveMinRep.toString()).to.equal('0')
        expect(data.proveMaxRep.toString()).to.equal('0')
        expect(data.proveZeroRep.toString()).to.equal('0')
        expect(data.minRep.toString()).to.equal('0')
        expect(data.maxRep.toString()).to.equal('0')
        expect(data.proveGraffiti.toString()).to.equal('0')
        expect(data.graffitiPreImage.toString()).to.equal('0')
    })

    it('should reveal nonce', async () => {
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
            revealNonce: 1,
        })
        const { isValid, proof, publicSignals } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        const data = new ReputationProof(publicSignals, proof)
        expect(data.epoch.toString()).to.equal(epoch.toString())
        expect(data.nonce.toString()).to.equal(nonce.toString())
        expect(data.revealNonce.toString()).to.equal('1')
        expect(data.attesterId.toString()).to.equal(attesterId.toString())
        expect(data.proveMinRep.toString()).to.equal('0')
        expect(data.proveMaxRep.toString()).to.equal('0')
        expect(data.proveZeroRep.toString()).to.equal('0')
        expect(data.minRep.toString()).to.equal('0')
        expect(data.maxRep.toString()).to.equal('0')
        expect(data.proveGraffiti.toString()).to.equal('0')
        expect(data.graffitiPreImage.toString()).to.equal('0')
    })
})
