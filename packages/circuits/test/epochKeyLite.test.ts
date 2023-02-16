import { expect } from 'chai'
import { ZkIdentity, genEpochKey } from '@unirep/utils'
import { Circuit, CircuitConfig, EpochKeyLiteProof } from '../src'
import { defaultProver } from '../provers/defaultProver'

import { genProofAndVerify } from './utils'

const { NUM_EPOCH_KEY_NONCE_PER_EPOCH } = CircuitConfig.default

describe('Epoch key lite circuits', function () {
    this.timeout(300000)

    it('should prove an epoch key', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const attesterId = BigInt(10210)
            const epoch = 120958
            const id = new ZkIdentity()
            const circuitInputs = {
                identity_secret: id.secretHash,
                epoch,
                attester_id: attesterId,
                nonce,
                reveal_nonce: 0,
                sig_data: 0,
            }
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.epochKeyLite,
                circuitInputs
            )
            expect(isValid).to.be.true
            const data = new EpochKeyLiteProof(publicSignals, proof)
            expect(data.epochKey.toString()).to.equal(
                genEpochKey(id.secretHash, attesterId, epoch, nonce).toString()
            )
            expect(data.control).to.equal(
                EpochKeyLiteProof.buildControl({
                    attesterId,
                    epoch,
                    nonce,
                }).toString()
            )
            expect(data.epoch.toString()).to.equal(epoch.toString())
            expect(data.nonce.toString()).to.equal('0')
            expect(data.revealNonce.toString()).to.equal('0')
            expect(data.attesterId.toString()).to.equal(attesterId.toString())
            expect(data.data.toString()).to.equal('0')
        }
    })

    it('should reveal nonce', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const attesterId = BigInt(10210)
            const epoch = 120958
            const id = new ZkIdentity()
            const revealNonce = 1
            const circuitInputs = {
                identity_secret: id.secretHash,
                epoch,
                attester_id: attesterId,
                nonce,
                reveal_nonce: revealNonce,
                sig_data: 0,
            }
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.epochKeyLite,
                circuitInputs
            )
            expect(isValid).to.be.true
            const data = new EpochKeyLiteProof(publicSignals, proof)
            expect(data.epochKey.toString()).to.equal(
                genEpochKey(id.secretHash, attesterId, epoch, nonce).toString()
            )
            expect(data.control).to.equal(
                EpochKeyLiteProof.buildControl({
                    attesterId,
                    epoch,
                    nonce,
                    revealNonce,
                }).toString()
            )
            expect(data.epoch.toString()).to.equal(epoch.toString())
            expect(data.nonce.toString()).to.equal(nonce.toString())
            expect(data.revealNonce.toString()).to.equal('1')
            expect(data.attesterId.toString()).to.equal(attesterId.toString())
            expect(data.data.toString()).to.equal('0')
        }
    })

    it('should prove a data value', async () => {
        const attesterId = BigInt(10210)
        const epoch = 120958
        const nonce = 1
        const id = new ZkIdentity()
        const _data = BigInt(210128912581953498913)
        const circuitInputs = {
            identity_secret: id.secretHash,
            epoch,
            attester_id: attesterId,
            nonce,
            reveal_nonce: 0,
            sig_data: _data,
        }
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.epochKeyLite,
            circuitInputs
        )
        expect(isValid).to.be.true
        const data = new EpochKeyLiteProof(publicSignals, proof)
        expect(data.epochKey.toString()).to.equal(
            genEpochKey(id.secretHash, attesterId, epoch, nonce).toString()
        )
        expect(data.epoch.toString()).to.equal(epoch.toString())
        expect(data.nonce.toString()).to.equal('0')
        expect(data.revealNonce.toString()).to.equal('0')
        expect(data.attesterId.toString()).to.equal(attesterId.toString())
        expect(data.data.toString()).to.equal(_data.toString())

        const badSignals = [...publicSignals]
        badSignals[2] = '112901' // change the data value
        const _isValid = await defaultProver.verifyProof(
            Circuit.epochKeyLite,
            badSignals,
            proof
        )
        expect(_isValid).to.be.false
    })

    it('should fail to prove a nonce that is above max nonce', async () => {
        const attesterId = BigInt(10210)
        const epoch = 120958
        const nonce = NUM_EPOCH_KEY_NONCE_PER_EPOCH
        const id = new ZkIdentity()
        const _data = BigInt(210128912581953498913)
        const circuitInputs = {
            identity_secret: id.secretHash,
            epoch,
            attester_id: attesterId,
            nonce,
            reveal_nonce: 0,
            sig_data: _data,
        }
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.epochKeyLite, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range epoch', async () => {
        const attesterId = BigInt(10210)
        const epoch = BigInt(2) ** BigInt(64)
        const nonce = 0
        const id = new ZkIdentity()
        const _data = BigInt(210128912581953498913)
        const circuitInputs = {
            identity_secret: id.secretHash,
            epoch,
            attester_id: attesterId,
            nonce,
            reveal_nonce: 0,
            sig_data: _data,
        }
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.epochKeyLite, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range attesterId', async () => {
        const attesterId = BigInt(2) ** BigInt(160)
        const epoch = 18241924
        const nonce = 0
        const id = new ZkIdentity()
        const _data = BigInt(210128912581953498913)
        const circuitInputs = {
            identity_secret: id.secretHash,
            epoch,
            attester_id: attesterId,
            nonce,
            reveal_nonce: 0,
            sig_data: _data,
        }
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.epochKeyLite, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range revealNonce', async () => {
        const attesterId = 479187498124
        const epoch = 18241924
        const nonce = 0
        const id = new ZkIdentity()
        const _data = BigInt(210128912581953498913)
        const circuitInputs = {
            identity_secret: id.secretHash,
            epoch,
            attester_id: attesterId,
            nonce,
            reveal_nonce: 2,
            sig_data: _data,
        }
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.epochKeyLite, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })
})
