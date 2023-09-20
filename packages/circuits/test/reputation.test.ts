import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import { genEpochKey } from '@unirep/utils'
import randomf from 'randomf'
import { Circuit, CircuitConfig, ReputationProof } from '../src'
import { genReputationCircuitInput, genProofAndVerify } from './utils'

const { SUM_FIELD_COUNT, NUM_EPOCH_KEY_NONCE_PER_EPOCH, REPL_NONCE_BITS } =
    CircuitConfig.default

const id = new Identity()
const epoch = 20
const nonce = 1
const attesterId = 219090124810
const chainId = 432
const revealNonce = 0
const startBalance = [20, 5]
const config = {
    id,
    epoch,
    nonce,
    attesterId,
    chainId,
    revealNonce,
    startBalance,
}

const control = {
    epoch,
    nonce,
    attesterId,
    chainId,
    revealNonce,
}

describe('Prove reputation from attester circuit', function () {
    this.timeout(300000)

    it('should prove a reputation', async () => {
        const circuitInputs = genReputationCircuitInput(config)
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.reputation,
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
        expect(data.graffiti.toString()).to.equal('0')
        // check two control outputs
        const controlOut = ReputationProof.buildControl(control)
        expect(data.control0.toString()).to.equal(controlOut[0].toString())
        expect(data.control1.toString()).to.equal(controlOut[1].toString())
    })

    it('should prove a minRep', async () => {
        const minRep = 2
        const proveMinRep = 1
        const startBalance = [5, 1]
        const circuitInputs = genReputationCircuitInput({
            ...config,
            startBalance,
            minRep,
            proveMinRep,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.reputation,
            circuitInputs
        )
        expect(isValid).to.be.true

        const data = new ReputationProof(publicSignals, proof)
        expect(data.epoch.toString()).to.equal(epoch.toString())
        expect(data.nonce.toString()).to.equal('0')
        expect(data.revealNonce.toString()).to.equal('0')
        expect(data.attesterId.toString()).to.equal(attesterId.toString())
        expect(data.proveMinRep.toString()).to.equal(proveMinRep.toString())
        expect(data.proveMaxRep.toString()).to.equal('0')
        expect(data.proveZeroRep.toString()).to.equal('0')
        expect(data.minRep.toString()).to.equal(minRep.toString())
        expect(data.maxRep.toString()).to.equal('0')
        expect(data.proveGraffiti.toString()).to.equal('0')
        expect(data.graffiti.toString()).to.equal('0')
        const controlOut = ReputationProof.buildControl({
            ...control,
            minRep,
            proveMinRep,
        })
        expect(data.control0.toString()).to.equal(controlOut[0].toString())
        expect(data.control1.toString()).to.equal(controlOut[1].toString())
    })

    it('should prove a maxRep', async () => {
        const maxRep = 4
        const proveMaxRep = 1
        const startBalance = [5, 10]
        const circuitInputs = genReputationCircuitInput({
            ...config,
            startBalance,
            maxRep,
            proveMaxRep,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.reputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        const data = new ReputationProof(publicSignals, proof)
        expect(data.epoch.toString()).to.equal(epoch.toString())
        expect(data.nonce.toString()).to.equal('0')
        expect(data.revealNonce.toString()).to.equal('0')
        expect(data.attesterId.toString()).to.equal(attesterId.toString())
        expect(data.proveMinRep.toString()).to.equal('0')
        expect(data.proveMaxRep.toString()).to.equal(proveMaxRep.toString())
        expect(data.proveZeroRep.toString()).to.equal('0')
        expect(data.minRep.toString()).to.equal('0')
        expect(data.maxRep.toString()).to.equal(maxRep.toString())
        expect(data.proveGraffiti.toString()).to.equal('0')
        expect(data.graffiti.toString()).to.equal('0')
        const controlOut = ReputationProof.buildControl({
            ...control,
            maxRep,
            proveMaxRep,
        })
        expect(data.control0.toString()).to.equal(controlOut[0].toString())
        expect(data.control1.toString()).to.equal(controlOut[1].toString())
    })

    it('should prove a minRep and maxRep', async () => {
        const minRep = 0
        const maxRep = 0
        const proveMaxRep = 1
        const proveMinRep = 1
        const startBalance = [10, 10]
        const circuitInputs = genReputationCircuitInput({
            ...config,
            startBalance,
            minRep,
            maxRep,
            proveMaxRep,
            proveMinRep,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.reputation,
            circuitInputs
        )
        expect(isValid).to.be.true

        const data = new ReputationProof(publicSignals, proof)
        expect(data.epoch.toString()).to.equal(epoch.toString())
        expect(data.nonce.toString()).to.equal('0')
        expect(data.revealNonce.toString()).to.equal('0')
        expect(data.attesterId.toString()).to.equal(attesterId.toString())
        expect(data.proveMinRep.toString()).to.equal(proveMinRep.toString())
        expect(data.proveMaxRep.toString()).to.equal(proveMaxRep.toString())
        expect(data.proveZeroRep.toString()).to.equal('0')
        expect(data.minRep.toString()).to.equal(minRep.toString())
        expect(data.maxRep.toString()).to.equal(maxRep.toString())
        expect(data.proveGraffiti.toString()).to.equal('0')
        expect(data.graffiti.toString()).to.equal('0')
        const controlOut = ReputationProof.buildControl({
            ...control,
            minRep,
            maxRep,
            proveMinRep,
            proveMaxRep,
        })
        expect(data.control0.toString()).to.equal(controlOut[0].toString())
        expect(data.control1.toString()).to.equal(controlOut[1].toString())
    })

    it('should prove a minRep and maxRep and zero rep', async () => {
        const minRep = 0
        const maxRep = 0
        const proveMaxRep = 1
        const proveMinRep = 1
        const proveZeroRep = 1
        const revealNonce = 1
        const startBalance = [10, 10]
        const circuitInputs = genReputationCircuitInput({
            ...config,
            startBalance,
            minRep,
            maxRep,
            proveMaxRep,
            proveMinRep,
            proveZeroRep,
            revealNonce,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.reputation,
            circuitInputs
        )
        expect(isValid).to.be.true

        const data = new ReputationProof(publicSignals, proof)
        expect(data.epoch.toString()).to.equal(epoch.toString())
        expect(data.nonce.toString()).to.equal(nonce.toString())
        expect(data.revealNonce.toString()).to.equal(revealNonce.toString())
        expect(data.attesterId.toString()).to.equal(attesterId.toString())
        expect(data.proveMinRep.toString()).to.equal(proveMinRep.toString())
        expect(data.proveMaxRep.toString()).to.equal(proveMaxRep.toString())
        expect(data.proveZeroRep.toString()).to.equal(proveZeroRep.toString())
        expect(data.minRep.toString()).to.equal(minRep.toString())
        expect(data.maxRep.toString()).to.equal(maxRep.toString())
        expect(data.proveGraffiti.toString()).to.equal('0')
        expect(data.graffiti.toString()).to.equal('0')
        const controlOut = ReputationProof.buildControl({
            ...control,
            minRep,
            maxRep,
            proveMaxRep,
            proveMinRep,
            proveZeroRep,
            revealNonce,
        })
        expect(data.control0.toString()).to.equal(controlOut[0].toString())
        expect(data.control1.toString()).to.equal(controlOut[1].toString())
    })

    it('should fail to prove zero rep', async () => {
        const proveZeroRep = 1
        const startBalance = [10, 5]
        const circuitInputs = genReputationCircuitInput({
            ...config,
            startBalance,
            proveZeroRep,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.reputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove maxRep', async () => {
        const maxRep = 8
        const proveMaxRep = 1
        const startBalance = [10, 5]
        const circuitInputs = genReputationCircuitInput({
            ...config,
            startBalance,
            maxRep,
            proveMaxRep,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.reputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove minRep', async () => {
        const minRep = 8
        const proveMinRep = 1
        const startBalance = [10, 5]
        const circuitInputs = genReputationCircuitInput({
            ...config,
            startBalance,
            minRep,
            proveMinRep,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.reputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should choose not to prove minRep', async () => {
        const minRep = 10000
        const proveMinRep = 0
        const startBalance = [5, 10]
        const circuitInputs = genReputationCircuitInput({
            ...config,
            startBalance,
            minRep,
            proveMinRep,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.reputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        const data = new ReputationProof(publicSignals, proof)
        expect(data.epoch.toString()).to.equal(epoch.toString())
        expect(data.nonce.toString()).to.equal('0')
        expect(data.revealNonce.toString()).to.equal('0')
        expect(data.attesterId.toString()).to.equal(attesterId.toString())
        expect(data.proveMinRep.toString()).to.equal(proveMinRep.toString())
        expect(data.proveMaxRep.toString()).to.equal('0')
        expect(data.proveZeroRep.toString()).to.equal('0')
        expect(data.minRep.toString()).to.equal(minRep.toString())
        expect(data.maxRep.toString()).to.equal('0')
        expect(data.proveGraffiti.toString()).to.equal('0')
        expect(data.graffiti.toString()).to.equal('0')
        const controlOut = ReputationProof.buildControl({
            ...control,
            minRep,
            proveMinRep,
        })
        expect(data.control0.toString()).to.equal(controlOut[0].toString())
        expect(data.control1.toString()).to.equal(controlOut[1].toString())
    })

    it('successfully choose not to prove graffiti with wrong value', async () => {
        const graffiti = 124124021
        const proveGraffiti = false
        const circuitInputs = genReputationCircuitInput({
            ...config,
            proveGraffiti,
            graffiti,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.reputation,
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
        expect(data.graffiti.toString()).to.equal(graffiti.toString())
        const controlOut = ReputationProof.buildControl({
            ...control,
            proveGraffiti,
        })
        expect(data.control0.toString()).to.equal(controlOut[0].toString())
        expect(data.control1.toString()).to.equal(controlOut[1].toString())
    })

    it('should fail to prove wrong graffiti', async () => {
        const minRep = 0
        const proveGraffiti = true
        const startBalance = [...Array(SUM_FIELD_COUNT).fill(0), 100191]
        const graffiti = BigInt(124124021) << BigInt(REPL_NONCE_BITS)
        const circuitInputs = genReputationCircuitInput({
            ...config,
            startBalance,
            minRep,
            proveGraffiti,
            graffiti,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.reputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should prove graffiti', async () => {
        const graffiti = BigInt(124914219)
        const graffitiWithNonce = graffiti << BigInt(REPL_NONCE_BITS)
        const proveGraffiti = 1
        const startBalance = [
            ...Array(SUM_FIELD_COUNT).fill(0),
            graffitiWithNonce,
        ]
        const circuitInputs = genReputationCircuitInput({
            ...config,
            proveGraffiti,
            graffiti,
            startBalance,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.reputation,
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
        expect(data.graffiti.toString()).to.equal(graffiti.toString())
        const controlOut = ReputationProof.buildControl({
            ...control,
            proveGraffiti,
        })
        expect(data.control0.toString()).to.equal(controlOut[0].toString())
        expect(data.control1.toString()).to.equal(controlOut[1].toString())
    })

    it('should not reveal nonce', async () => {
        const circuitInputs = genReputationCircuitInput(config)
        const { isValid, proof, publicSignals } = await genProofAndVerify(
            Circuit.reputation,
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
        expect(data.graffiti.toString()).to.equal('0')
        const controlOut = ReputationProof.buildControl(control)
        expect(data.control0.toString()).to.equal(controlOut[0].toString())
        expect(data.control1.toString()).to.equal(controlOut[1].toString())
    })

    it('should reveal nonce', async () => {
        const revealNonce = 1
        const circuitInputs = genReputationCircuitInput({
            ...config,
            revealNonce,
        })
        const { isValid, proof, publicSignals } = await genProofAndVerify(
            Circuit.reputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        const data = new ReputationProof(publicSignals, proof)
        expect(data.epoch.toString()).to.equal(epoch.toString())
        expect(data.nonce.toString()).to.equal(nonce.toString())
        expect(data.revealNonce.toString()).to.equal(revealNonce.toString())
        expect(data.attesterId.toString()).to.equal(attesterId.toString())
        expect(data.proveMinRep.toString()).to.equal('0')
        expect(data.proveMaxRep.toString()).to.equal('0')
        expect(data.proveZeroRep.toString()).to.equal('0')
        expect(data.minRep.toString()).to.equal('0')
        expect(data.maxRep.toString()).to.equal('0')
        expect(data.proveGraffiti.toString()).to.equal('0')
        expect(data.graffiti.toString()).to.equal('0')
        const controlOut = ReputationProof.buildControl({
            ...control,
            revealNonce,
        })
        expect(data.control0.toString()).to.equal(controlOut[0].toString())
        expect(data.control1.toString()).to.equal(controlOut[1].toString())
    })

    it('should output an epoch key', async () => {
        const circuitInputs = genReputationCircuitInput(config)
        const { isValid, proof, publicSignals } = await genProofAndVerify(
            Circuit.reputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        const data = new ReputationProof(publicSignals, proof)
        expect(data.epoch.toString()).to.equal(epoch.toString())
        expect(data.nonce.toString()).to.equal('0')
        expect(data.revealNonce.toString()).to.equal(revealNonce.toString())
        expect(data.attesterId.toString()).to.equal(attesterId.toString())
        expect(data.proveMinRep.toString()).to.equal('0')
        expect(data.proveMaxRep.toString()).to.equal('0')
        expect(data.proveZeroRep.toString()).to.equal('0')
        expect(data.minRep.toString()).to.equal('0')
        expect(data.maxRep.toString()).to.equal('0')
        expect(data.proveGraffiti.toString()).to.equal('0')
        expect(data.graffiti.toString()).to.equal('0')
        expect(data.epochKey.toString()).to.equal(
            genEpochKey(
                id.secret,
                attesterId.toString(),
                epoch,
                nonce,
                chainId
            ).toString()
        )
    })

    it('should fail to prove a nonce that is above max nonce', async () => {
        const nonce = NUM_EPOCH_KEY_NONCE_PER_EPOCH
        const circuitInputs = genReputationCircuitInput({
            ...config,
            nonce,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.reputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range attesterId', async () => {
        const attesterId = BigInt(2) ** BigInt(160)
        const circuitInputs = genReputationCircuitInput({
            ...config,
            attesterId,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.reputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range revealNonce', async () => {
        const revealNonce = 2
        const circuitInputs = genReputationCircuitInput({
            ...config,
            revealNonce,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.reputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range proveGraffiti', async () => {
        const proveGraffiti = 2
        const circuitInputs = genReputationCircuitInput({
            ...config,
            proveGraffiti,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.reputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range proveMinRep', async () => {
        const proveMinRep = 2
        const circuitInputs = genReputationCircuitInput({
            ...config,
            proveMinRep,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.reputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range proveMaxRep', async () => {
        const proveMaxRep = 2
        const circuitInputs = genReputationCircuitInput({
            ...config,
            proveMaxRep,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.reputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range proveZeroRep', async () => {
        const proveZeroRep = 2
        const circuitInputs = genReputationCircuitInput({
            ...config,
            proveZeroRep,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.reputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range minRep', async () => {
        const minRep = BigInt(2) ** BigInt(64)
        const circuitInputs = genReputationCircuitInput({
            ...config,
            minRep,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.reputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range maxRep', async () => {
        const maxRep = BigInt(2) ** BigInt(64)
        const circuitInputs = genReputationCircuitInput({
            ...config,
            maxRep,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.reputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })
})
