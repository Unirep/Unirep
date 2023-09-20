import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import {
    IncrementalMerkleTree,
    genEpochKey,
    genStateTreeLeaf,
} from '@unirep/utils'
import { poseidon2 } from 'poseidon-lite'
import {
    Circuit,
    CircuitConfig,
    ScopeNullifierProof,
    EpochKeyLiteProof,
} from '../src'

import {
    genProofAndVerify,
    randomData,
    genPreventDoubleActionCircuitInput,
} from './utils'

const { STATE_TREE_DEPTH, NUM_EPOCH_KEY_NONCE_PER_EPOCH } =
    CircuitConfig.default

const attesterId = BigInt(10210)
const epoch = BigInt(120958)
const data = randomData()
const id = new Identity()
const chainId = BigInt(1234)
const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
const leaf = genStateTreeLeaf(id.secret, attesterId, epoch, data, chainId)
tree.insert(leaf)
const scope = BigInt(1)
const nonce = BigInt(0)
const revealNonce = BigInt(0)
const leafIndex = tree.indexOf(leaf)
const config = {
    id,
    tree,
    leafIndex,
    epoch,
    nonce,
    revealNonce,
    attesterId,
    data,
    scope,
    chainId,
}

describe('Prevent double action circuit', function () {
    this.timeout(300000)

    it('should prove epoch key membership with nullifier', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const circuitInputs = genPreventDoubleActionCircuitInput({
                ...config,
                nonce,
            })
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.scopeNullifier,
                circuitInputs
            )
            expect(isValid).to.be.true

            const p = new ScopeNullifierProof(publicSignals, proof)
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
                EpochKeyLiteProof.buildControl({
                    attesterId,
                    epoch,
                    nonce: BigInt(nonce),
                    revealNonce,
                    chainId,
                }).toString()
            )
            const nullifier = poseidon2([scope, id.secret])
            expect(p.nullifier.toString()).to.equal(nullifier.toString())
            expect(p.epoch.toString()).to.equal(epoch.toString())
            expect(p.nonce.toString()).to.equal('0')
            expect(p.revealNonce.toString()).to.equal('0')
            expect(p.attesterId.toString()).to.equal(attesterId.toString())
        }
    })

    it('should reveal nonce value', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const revealNonce = 1
            const circuitInputs = genPreventDoubleActionCircuitInput({
                ...config,
                nonce,
                revealNonce,
            })
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.scopeNullifier,
                circuitInputs
            )
            expect(isValid).to.be.true
            const p = new ScopeNullifierProof(publicSignals, proof)
            const nullifier = poseidon2([scope, id.secret])
            expect(p.epoch.toString()).to.equal(epoch.toString())
            expect(p.nonce.toString()).to.equal(nonce.toString())
            expect(p.revealNonce.toString()).to.equal(revealNonce.toString())
            expect(p.attesterId.toString()).to.equal(attesterId.toString())
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
            expect(p.sigData.toString()).to.equal('0')
            expect(p.nullifier.toString()).to.equal(nullifier.toString())
        }
    })

    it('should prove a data value', async () => {
        const sigData = BigInt(1288972090)
        const circuitInputs = genPreventDoubleActionCircuitInput({
            ...config,
            sigData,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.scopeNullifier,
            circuitInputs
        )
        expect(isValid).to.be.true
        const nullifier = poseidon2([scope, id.secret])
        const p = new ScopeNullifierProof(publicSignals, proof)
        expect(p.epoch.toString()).to.equal(epoch.toString())
        expect(p.nonce.toString()).to.equal('0')
        expect(p.revealNonce.toString()).to.equal('0')
        expect(p.attesterId.toString()).to.equal(attesterId.toString())
        expect(p.epochKey.toString()).to.equal(
            genEpochKey(id.secret, attesterId, epoch, nonce, chainId).toString()
        )
        expect(p.stateTreeRoot.toString()).to.equal(tree.root.toString())
        expect(p.sigData.toString()).to.equal(sigData.toString())
        expect(p.control.toString()).to.equal(
            EpochKeyLiteProof.buildControl({
                attesterId,
                epoch,
                nonce,
                revealNonce,
                chainId,
            }).toString()
        )
        expect(p.nullifier.toString()).to.equal(nullifier.toString())
    })

    it('should prove a scope', async () => {
        const scope = BigInt(234)
        const circuitInputs = genPreventDoubleActionCircuitInput({
            ...config,
            scope,
        })
        const { isValid, publicSignals, proof } = await genProofAndVerify(
            Circuit.scopeNullifier,
            circuitInputs
        )
        expect(isValid).to.be.true
        const nullifier = poseidon2([scope, id.secret])
        const p = new ScopeNullifierProof(publicSignals, proof)
        expect(p.epoch.toString()).to.equal(epoch.toString())
        expect(p.nonce.toString()).to.equal('0')
        expect(p.revealNonce.toString()).to.equal('0')
        expect(p.attesterId.toString()).to.equal(attesterId.toString())
        expect(p.epochKey.toString()).to.equal(
            genEpochKey(id.secret, attesterId, epoch, nonce, chainId).toString()
        )
        expect(p.stateTreeRoot.toString()).to.equal(tree.root.toString())
        expect(p.control.toString()).to.equal(
            EpochKeyLiteProof.buildControl({
                attesterId,
                epoch,
                nonce,
                revealNonce,
                chainId,
            }).toString()
        )
        expect(p.nullifier.toString()).to.equal(nullifier.toString())
    })
})
