import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import { genStateTreeLeaf } from '@unirep/utils'
import { Circuit, CircuitConfig, SignupProof } from '../src'
import { genProofAndVerify, genSignupCircuitInput } from './utils'

const { FIELD_COUNT, ATTESTER_ID_BITS, EPOCH_BITS, CHAIN_ID_BITS } =
    CircuitConfig.default

const id = new Identity()
const epoch = 35234
const attesterId = BigInt(12345)
const chainId = 1234
const config = {
    id,
    epoch,
    attesterId,
    chainId,
}

describe('Signup circuits', function () {
    this.timeout(300000)

    it('should generate a signup proof with 0 data', async () => {
        const circuitInputs = genSignupCircuitInput(config)
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
                Array(FIELD_COUNT).fill(0),
                chainId
            ).toString()
        )
        expect(data.control.toString()).to.equal(
            SignupProof.buildControl({ attesterId, epoch, chainId }).toString()
        )
    })

    it('should fail to prove an out of range attesterId', async () => {
        const attesterId = BigInt(1) << ATTESTER_ID_BITS
        const circuitInputs = genSignupCircuitInput({
            ...config,
            attesterId,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.signup, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of range epoch', async () => {
        const epoch = BigInt(1) << EPOCH_BITS
        const circuitInputs = genSignupCircuitInput({
            ...config,
            epoch,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.signup, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should fail to prove an out of chain id', async () => {
        const chainId = BigInt(1) << CHAIN_ID_BITS
        const circuitInputs = genSignupCircuitInput({
            ...config,
            chainId,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.signup, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })

    it('should build control', async () => {
        const circuitInputs = genSignupCircuitInput(config)
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.signup,
            circuitInputs
        )
        expect(isValid).to.be.true
        const data = new SignupProof(publicSignals, proof)
        const control = SignupProof.buildControl({ attesterId, epoch, chainId })
        expect(data.control.toString()).to.equal(control.toString())
    })
})
