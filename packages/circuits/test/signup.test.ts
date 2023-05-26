import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import { genStateTreeLeaf } from '@unirep/utils'
import { Circuit, CircuitConfig, SignupProof } from '../src'

import { genProofAndVerify, genSignupCircuitInput } from './utils'

const { FIELD_COUNT } = CircuitConfig.default

describe('Signup circuits', function () {
    this.timeout(300000)

    it('should generate a signup proof with 0 data', async () => {
        const id = new Identity()
        const epoch = 35234
        const attesterId = BigInt(12345)
        const circuitInputs = genSignupCircuitInput({
            id,
            epoch,
            attesterId,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.signup,
            circuitInputs
        )
        expect(isValid).to.be.true
        const data = new SignupProof(publicSignals, proof)
        expect(data.attesterId.toString()).to.equal(attesterId.toString())
        expect(data.identityCommitment.toString()).to.equal(
            id.commitment.toString()
        )
        expect(data.epoch.toString()).to.equal(epoch.toString())
        expect(data.stateTreeLeaf.toString()).to.equal(
            genStateTreeLeaf(
                id.secret,
                attesterId,
                epoch,
                Array(FIELD_COUNT).fill(0)
            ).toString()
        )
        expect(data.control.toString()).to.equal(
            SignupProof.buildControl({ attesterId, epoch }).toString()
        )
    })

    it('should fail to prove an out of range attesterId', async () => {
        const id = new Identity()
        const epoch = 0
        const attesterId = BigInt(1) << BigInt(160)
        const circuitInputs = genSignupCircuitInput({
            id,
            epoch,
            attesterId,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.signup, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range epoch', async () => {
        const id = new Identity()
        const epoch = BigInt(1) << BigInt(48)
        const attesterId = BigInt(1234)
        const circuitInputs = genSignupCircuitInput({
            id,
            epoch,
            attesterId,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.signup, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should build control', async () => {
        const id = new Identity()
        const epoch = 0
        const attesterId = BigInt(12345)
        const circuitInputs = genSignupCircuitInput({
            id,
            epoch,
            attesterId,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.signup,
            circuitInputs
        )
        expect(isValid).to.be.true
        const data = new SignupProof(publicSignals, proof)
        const control = SignupProof.buildControl({ attesterId, epoch })
        expect(data.control.toString()).to.equal(control.toString())
    })
})
