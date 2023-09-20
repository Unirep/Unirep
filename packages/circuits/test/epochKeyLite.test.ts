import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import { genEpochKey, F } from '@unirep/utils'
import { Circuit, CircuitConfig, EpochKeyLiteProof } from '../src'
import { defaultProver } from '../provers/defaultProver'

import { genProofAndVerify } from './utils'

const { NUM_EPOCH_KEY_NONCE_PER_EPOCH } = CircuitConfig.default

const attesterId = BigInt(10210)
const epoch = BigInt(120958)
const id = new Identity()
const chainId = BigInt(1)
const revealNonce = BigInt(0)
const circuitInputs = {
    identity_secret: id.secret,
    epoch,
    attester_id: attesterId,
    nonce: 0,
    reveal_nonce: revealNonce,
    sig_data: 0,
    chain_id: chainId,
}

describe('Epoch key lite circuits', function () {
    this.timeout(300000)

    it('should prove an epoch key', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.epochKeyLite,
                {
                    ...circuitInputs,
                    nonce,
                }
            )
            expect(isValid).to.be.true
            const data = new EpochKeyLiteProof(publicSignals, proof)
            expect(data.epochKey.toString()).to.equal(
                genEpochKey(
                    id.secret,
                    attesterId,
                    epoch,
                    nonce,
                    chainId
                ).toString()
            )
            expect(data.control.toString()).to.equal(
                EpochKeyLiteProof.buildControl({
                    attesterId,
                    epoch,
                    nonce: BigInt(nonce),
                    revealNonce,
                    chainId,
                }).toString()
            )
            expect(data.epoch.toString()).to.equal(epoch.toString())
            expect(data.nonce.toString()).to.equal('0')
            expect(data.revealNonce.toString()).to.equal('0')
            expect(data.attesterId.toString()).to.equal(attesterId.toString())
            expect(data.data.toString()).to.equal('0')
            expect(data.chainId.toString()).to.equal(chainId.toString())
        }
    })

    it('should reveal nonce', async () => {
        const revealNonce = BigInt(1)
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.epochKeyLite,
                {
                    ...circuitInputs,
                    nonce,
                    reveal_nonce: revealNonce,
                }
            )
            expect(isValid).to.be.true
            const data = new EpochKeyLiteProof(publicSignals, proof)
            expect(data.epochKey.toString()).to.equal(
                genEpochKey(
                    id.secret,
                    attesterId,
                    epoch,
                    nonce,
                    chainId
                ).toString()
            )
            expect(data.control.toString()).to.equal(
                EpochKeyLiteProof.buildControl({
                    attesterId,
                    epoch,
                    nonce: BigInt(nonce),
                    revealNonce,
                    chainId,
                }).toString()
            )
            expect(data.epoch.toString()).to.equal(epoch.toString())
            expect(data.nonce.toString()).to.equal(nonce.toString())
            expect(data.revealNonce.toString()).to.equal(revealNonce.toString())
            expect(data.attesterId.toString()).to.equal(attesterId.toString())
            expect(data.data.toString()).to.equal('0')
            expect(data.chainId.toString()).to.equal(chainId.toString())
        }
    })

    it('should prove a data value', async () => {
        const data = BigInt(2349872394872)
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.epochKeyLite,
            {
                ...circuitInputs,
                sig_data: data,
            }
        )
        expect(isValid).to.be.true
        const p = new EpochKeyLiteProof(publicSignals, proof)
        expect(p.epochKey.toString()).to.equal(
            genEpochKey(
                id.secret,
                attesterId,
                epoch,
                circuitInputs.nonce,
                chainId
            ).toString()
        )
        expect(p.epoch.toString()).to.equal(epoch.toString())
        expect(p.nonce.toString()).to.equal('0')
        expect(p.revealNonce.toString()).to.equal('0')
        expect(p.attesterId.toString()).to.equal(attesterId.toString())
        expect(p.data.toString()).to.equal(data.toString())

        const badSignals = [...publicSignals]
        badSignals[2] = '112901' // change the data value
        const _isValid = await defaultProver.verifyProof(
            Circuit.epochKeyLite,
            badSignals,
            proof
        )
        expect(_isValid).to.be.false
    })

    it('should prove chain ID', async () => {
        const chainId = 31007
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.epochKeyLite,
            {
                ...circuitInputs,
                chain_id: chainId,
            }
        )
        expect(isValid).to.be.true
        const data = new EpochKeyLiteProof(publicSignals, proof)
        expect(data.epochKey.toString()).to.equal(
            genEpochKey(
                id.secret,
                attesterId,
                epoch,
                circuitInputs.nonce,
                chainId
            ).toString()
        )
        expect(data.epoch.toString()).to.equal(epoch.toString())
        expect(data.nonce.toString()).to.equal(circuitInputs.nonce.toString())
        expect(data.revealNonce.toString()).to.equal(
            circuitInputs.reveal_nonce.toString()
        )
        expect(data.attesterId.toString()).to.equal(attesterId.toString())
        expect(data.data.toString()).to.equal(circuitInputs.sig_data.toString())
        expect(data.chainId.toString()).to.equal(chainId.toString())
    })

    it('should fail to prove a chain ID that is above max chain ID', async () => {
        const chainId = BigInt(1) << BigInt(36)
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.epochKeyLite, {
                ...circuitInputs,
                chain_id: chainId,
            })
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove a nonce that is above max nonce', async () => {
        const nonce = NUM_EPOCH_KEY_NONCE_PER_EPOCH
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.epochKeyLite, {
                ...circuitInputs,
                nonce,
            })
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range epoch', async () => {
        const epoch = BigInt(2) ** BigInt(64)
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.epochKeyLite, {
                ...circuitInputs,
                epoch,
            })
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range attesterId', async () => {
        const attesterId = BigInt(2) ** BigInt(160)
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.epochKeyLite, {
                ...circuitInputs,
                attester_id: attesterId,
            })
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range revealNonce', async () => {
        const revealNonce = 2
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.epochKeyLite, {
                ...circuitInputs,
                reveal_nonce: revealNonce,
            })
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range nonce', async () => {
        // assuming nonce_bits = 8 this should be 1
        const nonce = F + BigInt(1)
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.epochKeyLite, {
                ...circuitInputs,
                nonce,
            })
                .then(() => rj())
                .catch(() => rs())
        })
    })
})
