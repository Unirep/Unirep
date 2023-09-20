import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import {
    IncrementalMerkleTree,
    genEpochKey,
    genStateTreeLeaf,
} from '@unirep/utils'
import { Circuit, EpochKeyProof, CircuitConfig } from '../src'
import { defaultProver } from '../provers/defaultProver'

import { genEpochKeyCircuitInput, genProofAndVerify, randomData } from './utils'

const { STATE_TREE_DEPTH, NUM_EPOCH_KEY_NONCE_PER_EPOCH } =
    CircuitConfig.default

const attesterId = BigInt(10210)
const epoch = BigInt(120958)
const data = randomData()
const id = new Identity()
const chainId = BigInt(1)
const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
const leaf = genStateTreeLeaf(id.secret, attesterId, epoch, data, chainId)
const nonce = BigInt(0)
const revealNonce = BigInt(0)
tree.insert(leaf)
const leafIndex = tree.indexOf(leaf)

const config = {
    revealNonce,
    id,
    tree,
    leafIndex,
    epoch,
    nonce,
    attesterId,
    data,
    chainId,
}

describe('Verify Epoch Key circuits', function () {
    this.timeout(300000)

    it('should prove epoch key membership', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const circuitInputs = genEpochKeyCircuitInput({
                ...config,
                nonce,
            })
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.epochKey,
                circuitInputs
            )
            expect(isValid).to.be.true
            const p = new EpochKeyProof(publicSignals, proof)
            expect(p.epochKey.toString()).to.equal(
                genEpochKey(
                    id.secret,
                    attesterId,
                    epoch,
                    nonce,
                    chainId
                ).toString()
            )
            expect(p.stateTreeRoot.toString()).to.equal(tree.root.toString())
            expect(p.control.toString()).to.equal(
                EpochKeyProof.buildControl({
                    attesterId,
                    epoch,
                    revealNonce,
                    nonce: BigInt(nonce),
                    chainId,
                }).toString()
            )
            expect(p.epoch.toString()).to.equal(epoch.toString())
            expect(p.nonce.toString()).to.equal('0')
            expect(p.revealNonce.toString()).to.equal('0')
            expect(p.attesterId.toString()).to.equal(attesterId.toString())
            expect(p.chainId.toString()).to.equal(chainId.toString())
        }
    })

    it('should reveal nonce value', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const revealNonce = BigInt(1)
            const circuitInputs = genEpochKeyCircuitInput({
                ...config,
                revealNonce,
                nonce,
            })
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.epochKey,
                circuitInputs
            )
            expect(isValid).to.be.true
            const p = new EpochKeyProof(publicSignals, proof)
            expect(p.epochKey.toString()).to.equal(
                genEpochKey(
                    id.secret,
                    attesterId,
                    epoch,
                    nonce,
                    chainId
                ).toString()
            )
            expect(p.stateTreeRoot.toString()).to.equal(tree.root.toString())
            expect(p.control.toString()).to.equal(
                EpochKeyProof.buildControl({
                    attesterId,
                    epoch,
                    nonce: BigInt(nonce),
                    revealNonce,
                    chainId,
                }).toString()
            )
            expect(p.epoch.toString()).to.equal(epoch.toString())
            expect(p.nonce.toString()).to.equal(nonce.toString())
            expect(p.revealNonce.toString()).to.equal(revealNonce.toString())
            expect(p.attesterId.toString()).to.equal(attesterId.toString())
        }
    })

    it('should prove a data value', async () => {
        const sigData = BigInt(1288972090)
        const circuitInputs = genEpochKeyCircuitInput({
            ...config,
            sigData,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.epochKey,
            circuitInputs
        )
        expect(isValid).to.be.true
        const p = new EpochKeyProof(publicSignals, proof)
        expect(p.control.toString()).to.equal(
            EpochKeyProof.buildControl({
                attesterId,
                epoch,
                nonce,
                revealNonce,
                chainId,
            }).toString()
        )
        expect(p.epochKey.toString()).to.equal(
            genEpochKey(id.secret, attesterId, epoch, nonce, chainId).toString()
        )
        expect(p.stateTreeRoot.toString()).to.equal(tree.root.toString())
        expect(p.data.toString()).to.equal(sigData.toString())
        expect(p.epoch.toString()).to.equal(epoch.toString())
        expect(p.nonce.toString()).to.equal('0')
        expect(p.revealNonce.toString()).to.equal('0')
        expect(p.attesterId.toString()).to.equal(attesterId.toString())
        expect(p.chainId.toString()).to.equal(chainId.toString())
    })

    it('data value should be verified in proof', async () => {
        const sigData = BigInt(1288972090)

        const circuitInputs = genEpochKeyCircuitInput({
            ...config,
            sigData,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.epochKey,
            circuitInputs
        )
        expect(isValid).to.be.true
        publicSignals[3] = '00000'
        const valid = await defaultProver.verifyProof(
            Circuit.epochKey,
            publicSignals,
            proof
        )
        expect(valid).to.be.false
    })

    it('should prove wrong gst root for wrong rep', async () => {
        const circuitInputs = genEpochKeyCircuitInput(config)
        circuitInputs.data[0] = 21908
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.epochKey,
            circuitInputs
        )
        expect(isValid).to.be.true
        const p = new EpochKeyProof(publicSignals, proof)
        expect(p.epochKey.toString()).to.equal(
            genEpochKey(id.secret, attesterId, epoch, nonce, chainId).toString()
        )
        expect(p.stateTreeRoot.toString()).to.not.equal(tree.root.toString())
    })

    it('should prove wrong gst root/epoch key for wrong attester id', async () => {
        const circuitInputs = genEpochKeyCircuitInput(config)
        circuitInputs.attester_id = 2171828
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.epochKey,
            circuitInputs
        )
        expect(isValid).to.be.true
        const p = new EpochKeyProof(publicSignals, proof)
        expect(p.epochKey.toString()).to.not.equal(
            genEpochKey(id.secret, attesterId, epoch, nonce, chainId).toString()
        )
        expect(p.stateTreeRoot.toString()).to.not.equal(tree.root.toString())
    })

    it('should fail to prove invalid nonce', async () => {
        const nonce = NUM_EPOCH_KEY_NONCE_PER_EPOCH
        const circuitInputs = genEpochKeyCircuitInput({
            ...config,
            nonce,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.epochKey, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })
})
