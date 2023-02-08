import { expect } from 'chai'
import { ZkIdentity, genEpochKey } from '@unirep/utils'
import { Circuit, EpochKeyLiteProof } from '../src'
import { defaultProver } from '../provers/defaultProver'

import { NUM_EPOCH_KEY_NONCE_PER_EPOCH } from '../config'

import { genProofAndVerify } from './utils'

describe('Epoch key lite circuits', function () {
    this.timeout(300000)

    it('should prove an epoch key', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const attesterId = BigInt(10210)
            const epoch = 120958
            const id = new ZkIdentity()
            const circuitInputs = {
                identity_nullifier: id.identityNullifier,
                control: EpochKeyLiteProof.buildControlInput({
                    epoch,
                    attesterId,
                    nonce,
                }),
                data: 0,
            }
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.epochKeyLite,
                circuitInputs
            )
            expect(isValid).to.be.true
            const data = new EpochKeyLiteProof(publicSignals, proof)
            expect(data.epochKey.toString()).to.equal(
                genEpochKey(
                    id.identityNullifier,
                    attesterId,
                    epoch,
                    nonce
                ).toString()
            )
            expect(data.control).to.equal(
                (
                    (BigInt(attesterId) << BigInt(72)) +
                    (BigInt(epoch) << BigInt(8))
                ).toString()
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
            const circuitInputs = {
                identity_nullifier: id.identityNullifier,
                control: EpochKeyLiteProof.buildControlInput({
                    epoch,
                    attesterId,
                    nonce,
                    revealNonce: 1,
                }),
                data: 0,
            }
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.epochKeyLite,
                circuitInputs
            )
            expect(isValid).to.be.true
            const data = new EpochKeyLiteProof(publicSignals, proof)
            expect(data.epochKey.toString()).to.equal(
                genEpochKey(
                    id.identityNullifier,
                    attesterId,
                    epoch,
                    nonce
                ).toString()
            )
            expect(data.control).to.equal(
                (
                    (BigInt(1) << BigInt(232)) +
                    (BigInt(attesterId) << BigInt(72)) +
                    (BigInt(epoch) << BigInt(8)) +
                    BigInt(nonce)
                ).toString()
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
            identity_nullifier: id.identityNullifier,
            control: EpochKeyLiteProof.buildControlInput({
                epoch,
                attesterId,
                nonce,
            }),
            data: _data,
        }
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.epochKeyLite,
            circuitInputs
        )
        expect(isValid).to.be.true
        const data = new EpochKeyLiteProof(publicSignals, proof)
        expect(data.epochKey.toString()).to.equal(
            genEpochKey(
                id.identityNullifier,
                attesterId,
                epoch,
                nonce
            ).toString()
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
            identity_nullifier: id.identityNullifier,
            control: EpochKeyLiteProof.buildControlInput({
                epoch,
                attesterId,
                nonce,
            }),
            data: _data,
        }
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.epochKeyLite, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove a control with too many bits', async () => {
        const attesterId = BigInt(10210)
        const epoch = 120958
        const nonce = NUM_EPOCH_KEY_NONCE_PER_EPOCH
        const id = new ZkIdentity()
        const _data = BigInt(210128912581953498913)
        const circuitInputs = {
            identity_nullifier: id.identityNullifier,
            control:
                EpochKeyLiteProof.buildControlInput({
                    epoch,
                    attesterId,
                    nonce,
                }) +
                (BigInt(1) << BigInt(233)),
            data: _data,
        }
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.epochKeyLite, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })
})
