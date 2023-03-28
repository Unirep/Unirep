import { expect } from 'chai'
import { ZkIdentity, hash1, genEpochKey } from '@unirep/utils'
import { Circuit, CircuitConfig, ReputationProof } from '../src'
import { genReputationCircuitInput, genProofAndVerify } from './utils'

const { SUM_FIELD_COUNT, NUM_EPOCH_KEY_NONCE_PER_EPOCH } = CircuitConfig.default

describe('Prove reputation from attester circuit', function () {
    this.timeout(300000)

    it('should prove a reputation', async () => {
        const id = new ZkIdentity()
        const epoch = 20
        const nonce = 2
        const attesterId = 219090124810
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        // check two control outputs
        for (let i = 0; i < 2; i++) {
            expect(publicSignals[i + 2].toString()).to.equal(
                ReputationProof.buildControl({
                    epoch,
                    nonce,
                    attesterId,
                })[i].toString()
            )
        }
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

    it('should prove a minRep', async () => {
        const id = new ZkIdentity()
        const epoch = 20
        const nonce = 1
        const attesterId = 219090124810
        const minRep = 2
        const proveMinRep = 1
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: [5, 1],
            minRep,
            proveMinRep,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        // check two control outputs
        for (let i = 0; i < 2; i++) {
            expect(publicSignals[i + 2].toString()).to.equal(
                ReputationProof.buildControl({
                    epoch,
                    nonce,
                    attesterId,
                    minRep,
                    proveMinRep,
                })[i].toString()
            )
        }
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
        expect(data.graffitiPreImage.toString()).to.equal('0')
    })

    it('should prove a maxRep', async () => {
        const id = new ZkIdentity()
        const epoch = 20
        const nonce = 1
        const attesterId = 219090124810
        const maxRep = 4
        const proveMaxRep = 1
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: [5, 10],
            maxRep,
            proveMaxRep,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        // check two control outputs
        for (let i = 0; i < 2; i++) {
            expect(publicSignals[i + 2].toString()).to.equal(
                ReputationProof.buildControl({
                    epoch,
                    nonce,
                    attesterId,
                    maxRep,
                    proveMaxRep,
                })[i].toString()
            )
        }
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
        expect(data.graffitiPreImage.toString()).to.equal('0')
    })

    it('should prove a minRep and maxRep', async () => {
        const id = new ZkIdentity()
        const epoch = 20
        const nonce = 2
        const attesterId = 219090124810
        const minRep = 0
        const maxRep = 0
        const proveMaxRep = 1
        const proveMinRep = 1
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: [10, 10],
            minRep,
            maxRep,
            proveMaxRep,
            proveMinRep,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        // check two control outputs
        for (let i = 0; i < 2; i++) {
            expect(publicSignals[i + 2].toString()).to.equal(
                ReputationProof.buildControl({
                    epoch,
                    nonce,
                    attesterId,
                    minRep,
                    maxRep,
                    proveMinRep,
                    proveMaxRep,
                })[i].toString()
            )
        }
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
        expect(data.graffitiPreImage.toString()).to.equal('0')
    })

    it('should prove a minRep and maxRep and zero rep', async () => {
        const id = new ZkIdentity()
        const epoch = 20
        const nonce = 0
        const attesterId = 219090124810
        const minRep = 0
        const maxRep = 0
        const proveMaxRep = 1
        const proveMinRep = 1
        const proveZeroRep = 1
        const revealNonce = 1
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: [10, 10],
            minRep,
            maxRep,
            proveMaxRep,
            proveMinRep,
            proveZeroRep,
            revealNonce,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        // check two control outputs
        for (let i = 0; i < 2; i++) {
            expect(publicSignals[i + 2].toString()).to.equal(
                ReputationProof.buildControl({
                    epoch,
                    nonce,
                    attesterId,
                    minRep,
                    maxRep,
                    proveMaxRep,
                    proveMinRep,
                    proveZeroRep,
                    revealNonce,
                })[i].toString()
            )
        }
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
        expect(data.graffitiPreImage.toString()).to.equal('0')
    })

    it('should fail to prove zero rep', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 0
        const proveZeroRep = 1
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: [10, 5],
            proveZeroRep,
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
        const maxRep = 8
        const proveMaxRep = 1
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: [10, 5],
            maxRep,
            proveMaxRep,
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
        const minRep = 8
        const proveMinRep = 1
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: [10, 5],
            minRep,
            proveMinRep,
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
        const proveMinRep = 0
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: [5, 10],
            minRep,
            proveMinRep,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        // check two control outputs
        for (let i = 0; i < 2; i++) {
            expect(publicSignals[i + 2].toString()).to.equal(
                ReputationProof.buildControl({
                    epoch,
                    nonce,
                    attesterId,
                    minRep,
                })[i].toString()
            )
        }
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
        expect(data.graffitiPreImage.toString()).to.equal('0')
    })

    it('successfully choose not to prove graffiti with wrong value', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 0
        const graffitiPreImage = 124124021
        const proveGraffiti = false
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            proveGraffiti,
            graffitiPreImage,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        // check two control outputs
        for (let i = 0; i < 2; i++) {
            expect(publicSignals[i + 2].toString()).to.equal(
                ReputationProof.buildControl({
                    epoch,
                    nonce,
                    attesterId,
                    proveGraffiti,
                })[i].toString()
            )
        }
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
        const minRep = 0
        const proveGraffiti = true
        const graffitiPreImage = 124124021
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: [...Array(SUM_FIELD_COUNT).fill(0), 100191],
            minRep,
            proveGraffiti,
            graffitiPreImage,
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
        const proveGraffiti = true
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            proveGraffiti,
            graffitiPreImage,
            startBalance: [...Array(SUM_FIELD_COUNT).fill(0), graffiti],
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        // check two control outputs
        for (let i = 0; i < 2; i++) {
            expect(publicSignals[i + 2].toString()).to.equal(
                ReputationProof.buildControl({
                    epoch,
                    nonce,
                    attesterId,
                    proveGraffiti,
                })[i].toString()
            )
        }
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
            startBalance: [...Array(SUM_FIELD_COUNT).fill(0), graffiti],
        })
        const { isValid, proof, publicSignals } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        // check two control outputs
        for (let i = 0; i < 2; i++) {
            expect(publicSignals[i + 2].toString()).to.equal(
                ReputationProof.buildControl({
                    epoch,
                    nonce,
                    attesterId,
                })[i].toString()
            )
        }
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
        const revealNonce = 1
        const graffiti = hash1([preImage])
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: [...Array(SUM_FIELD_COUNT).fill(0), graffiti],
            revealNonce,
        })
        const { isValid, proof, publicSignals } = await genProofAndVerify(
            Circuit.proveReputation,
            circuitInputs
        )
        expect(isValid).to.be.true
        // check two control outputs
        for (let i = 0; i < 2; i++) {
            expect(publicSignals[i + 2].toString()).to.equal(
                ReputationProof.buildControl({
                    epoch,
                    nonce,
                    attesterId,
                    revealNonce,
                })[i].toString()
            )
        }
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
        expect(data.graffitiPreImage.toString()).to.equal('0')
    })

    it('should output an epoch key', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 0
        const preImage = 124914219
        const revealNonce = 1
        const graffiti = hash1([preImage])
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: [...Array(SUM_FIELD_COUNT).fill(0), graffiti],
            revealNonce,
        })
        const { isValid, proof, publicSignals } = await genProofAndVerify(
            Circuit.proveReputation,
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
        expect(data.graffitiPreImage.toString()).to.equal('0')
        expect(data.epochKey.toString()).to.equal(
            genEpochKey(
                id.secretHash,
                attesterId.toString(),
                epoch,
                nonce
            ).toString()
        )
    })

    it('should fail to prove a nonce that is above max nonce', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = NUM_EPOCH_KEY_NONCE_PER_EPOCH
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: [10, 5],
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.proveReputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range attesterId', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = BigInt(2) ** BigInt(160)
        const nonce = 0
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: [10, 5],
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.proveReputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range revealNonce', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 0
        const revealNonce = 2
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: [10, 5],
            revealNonce,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.proveReputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range proveGraffiti', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 0
        const proveGraffiti = 2
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: [10, 5],
            proveGraffiti,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.proveReputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range proveMinRep', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 0
        const proveMinRep = 2
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: [10, 5],
            proveMinRep,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.proveReputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range proveMaxRep', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 0
        const proveMaxRep = 2
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: [10, 5],
            proveMaxRep,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.proveReputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range proveZeroRep', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 0
        const proveZeroRep = 2
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: [10, 5],
            proveZeroRep,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.proveReputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range minRep', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 0
        const minRep = BigInt(2) ** BigInt(64)
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: [10, 5],
            minRep,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.proveReputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range maxRep', async () => {
        const id = new ZkIdentity()
        const epoch = 1028
        const attesterId = 10210
        const nonce = 0
        const maxRep = BigInt(2) ** BigInt(64)
        const circuitInputs = genReputationCircuitInput({
            id,
            epoch,
            nonce,
            attesterId,
            startBalance: [10, 5],
            maxRep,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.proveReputation, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })
})
