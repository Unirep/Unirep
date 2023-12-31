import { expect } from 'chai'
import { Circuit, CircuitConfig, SpendReputationProof } from '../src'
import {
    genSpendReputationCircuitInput,
    genProofAndVerify,
    randomData,
} from './utils'

const { NUM_EPOCH_KEY_NONCE_PER_EPOCH } = CircuitConfig.default

const epoch = 20
const nonce = 0
const attesterId = 219090124810
const chainId = 432
const revealNonce = 0
const spenderData = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
    .fill(null)
    .map((_, i) => randomData())
const receiverData = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
    .fill(null)
    .map((_, i) => randomData())
const spendAmount = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
    .fill(null)
    .map((_, i) => randomData())
const spenderIdentitySecret = 4
const receiverIdentitySecret = 5

const config = {
    epoch,
    nonce,
    revealNonce,
    attesterId,
    spenderIdentitySecret,
    receiverIdentitySecret,
    spenderData,
    receiverData,
    chainId,
    spendAmount,
}

const control = {
    attesterId,
    epoch,
    nonce,
    revealNonce,
    chainId,
    spenderIdentitySecret,
    receiverIdentitySecret,
    spendAmount,
}

describe('Prove spendReputation', function () {
    this.timeout(300000)

    it('should prove a spend reputation', async () => {
        const circuitInputs = genSpendReputationCircuitInput(config)
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.spendReputation,
            circuitInputs
        )

        expect(isValid).to.be.true
        const data = new SpendReputationProof(publicSignals, proof)
        expect(data.epoch.toString()).to.equal(epoch.toString())
        expect(data.nonce.toString()).to.equal(nonce.toString())
        expect(data.revealNonce.toString()).to.equal(revealNonce.toString())
        expect(data.attesterId.toString()).to.equal(attesterId.toString())
        expect(data.chainId.toString()).to.equal(chainId.toString())
        // check control outputs
        const controlOut = SpendReputationProof.buildControl(control)
        expect(data.control.toString()).to.equal(controlOut.toString())
    })
})
