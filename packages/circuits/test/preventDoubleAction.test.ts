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
    PreventDoubleActionProof,
    EpochKeyLiteProof,
} from '../src'
import { defaultProver } from '../provers/defaultProver'

import {
    genProofAndVerify,
    randomData,
    genPreventDoubleActionCircuitInput,
    genV4Identity,
} from './utils'

const { STATE_TREE_DEPTH, NUM_EPOCH_KEY_NONCE_PER_EPOCH } =
    CircuitConfig.default

describe('Prevent double action circuit', function () {
    this.timeout(300000)

    it('should prove epoch key membership with external nullifier', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const attesterId = BigInt(10210)
            const epoch = 120958
            const data = randomData()
            const id = new Identity()
            const newId = genV4Identity(id)
            const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
            const leaf = genStateTreeLeaf(newId.secret, attesterId, epoch, data)
            tree.insert(leaf)
            const externalNullifier = BigInt(1)
            const circuitInputs = genPreventDoubleActionCircuitInput({
                id,
                tree,
                leafIndex: 0,
                epoch,
                nonce,
                attesterId,
                data,
                externalNullifier,
            })
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.preventDoubleAction,
                circuitInputs
            )
            expect(isValid).to.be.true
            expect(publicSignals[0]).to.equal(
                genEpochKey(newId.secret, attesterId, epoch, nonce).toString()
            )
            expect(publicSignals[1]).to.equal(tree.root.toString())
            expect(publicSignals[2]).to.equal(
                EpochKeyLiteProof.buildControl({
                    attesterId,
                    epoch,
                    nonce,
                }).toString()
            )
            const nullifier = poseidon2([newId.nullifier, externalNullifier])
            expect(publicSignals[3]).to.equal(nullifier.toString())

            const p = new PreventDoubleActionProof(publicSignals, proof)
            expect(p.epoch.toString()).to.equal(epoch.toString())
            expect(p.nonce.toString()).to.equal('0')
            expect(p.revealNonce.toString()).to.equal('0')
            expect(p.attesterId.toString()).to.equal(attesterId.toString())
            expect(p.epochKey.toString()).to.equal(
                genEpochKey(newId.secret, attesterId, epoch, nonce).toString()
            )
            expect(p.stateTreeRoot.toString()).to.equal(tree.root.toString())
            expect(p.sigData.toString()).to.equal('0')
            expect(p.control.toString()).to.equal(
                EpochKeyLiteProof.buildControl({
                    attesterId,
                    epoch,
                    nonce,
                }).toString()
            )
            expect(p.nullifier.toString()).to.equal(nullifier.toString())
        }
    })

    it('should reveal nonce value', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const attesterId = BigInt(10210)
            const epoch = 120958
            const data = randomData()
            const revealNonce = 1
            const id = new Identity()
            const newId = genV4Identity(id)
            const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
            const leaf = genStateTreeLeaf(newId.secret, attesterId, epoch, data)
            tree.insert(leaf)
            const externalNullifier = BigInt(1)
            const circuitInputs = genPreventDoubleActionCircuitInput({
                id,
                tree,
                leafIndex: 0,
                epoch,
                nonce,
                attesterId,
                data,
                revealNonce,
                externalNullifier,
            })
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.preventDoubleAction,
                circuitInputs
            )
            expect(isValid).to.be.true
            expect(publicSignals[0]).to.equal(
                genEpochKey(newId.secret, attesterId, epoch, nonce).toString()
            )
            expect(publicSignals[1]).to.equal(tree.root.toString())
            const nullifier = poseidon2([newId.nullifier, externalNullifier])
            expect(publicSignals[2]).to.equal(
                EpochKeyLiteProof.buildControl({
                    attesterId,
                    epoch,
                    nonce,
                    revealNonce,
                }).toString()
            )
            expect(publicSignals[3]).to.equal(nullifier.toString())

            const p = new PreventDoubleActionProof(publicSignals, proof)
            expect(p.epoch.toString()).to.equal(epoch.toString())
            expect(p.nonce.toString()).to.equal(nonce.toString())
            expect(p.revealNonce.toString()).to.equal(revealNonce.toString())
            expect(p.attesterId.toString()).to.equal(attesterId.toString())
            expect(p.epochKey.toString()).to.equal(
                genEpochKey(newId.secret, attesterId, epoch, nonce).toString()
            )
            expect(p.stateTreeRoot.toString()).to.equal(tree.root.toString())
            expect(p.sigData.toString()).to.equal('0')
            expect(p.nullifier.toString()).to.equal(nullifier.toString())
        }
    })

    it('should prove a data value', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const attesterId = BigInt(10210)
            const epoch = 120958
            const data = randomData()
            const sigData = BigInt(1288972090)
            const id = new Identity()
            const newId = genV4Identity(id)
            const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
            const leaf = genStateTreeLeaf(newId.secret, attesterId, epoch, data)
            tree.insert(leaf)
            const externalNullifier = BigInt(1)
            const circuitInputs = genPreventDoubleActionCircuitInput({
                id,
                tree,
                leafIndex: 0,
                epoch,
                nonce,
                attesterId,
                sigData,
                data,
                externalNullifier,
            })
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.preventDoubleAction,
                circuitInputs
            )
            expect(isValid).to.be.true
            expect(publicSignals[0]).to.equal(
                genEpochKey(newId.secret, attesterId, epoch, nonce).toString()
            )
            expect(publicSignals[1]).to.equal(tree.root.toString())
            expect(publicSignals[2]).to.equal(
                EpochKeyLiteProof.buildControl({
                    attesterId,
                    epoch,
                    nonce,
                }).toString()
            )
            const nullifier = poseidon2([newId.nullifier, externalNullifier])
            expect(publicSignals[3]).to.equal(nullifier.toString())
            expect(publicSignals[4].toString()).to.equal(sigData.toString())

            const p = new PreventDoubleActionProof(publicSignals, proof)
            expect(p.epoch.toString()).to.equal(epoch.toString())
            expect(p.nonce.toString()).to.equal('0')
            expect(p.revealNonce.toString()).to.equal('0')
            expect(p.attesterId.toString()).to.equal(attesterId.toString())
            expect(p.epochKey.toString()).to.equal(
                genEpochKey(newId.secret, attesterId, epoch, nonce).toString()
            )
            expect(p.stateTreeRoot.toString()).to.equal(tree.root.toString())
            expect(p.sigData.toString()).to.equal(sigData.toString())
            expect(p.control.toString()).to.equal(
                EpochKeyLiteProof.buildControl({
                    attesterId,
                    epoch,
                    nonce,
                }).toString()
            )
            expect(p.nullifier.toString()).to.equal(nullifier.toString())
        }
    })

    it('data value should be verified in proof', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const attesterId = BigInt(10210)
            const epoch = 120958
            const data = randomData()
            const sigData = BigInt(1288972090)
            const id = new Identity()
            const newId = genV4Identity(id)
            const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
            const leaf = genStateTreeLeaf(newId.secret, attesterId, epoch, data)
            tree.insert(leaf)
            const externalNullifier = BigInt(1)
            const circuitInputs = genPreventDoubleActionCircuitInput({
                id,
                tree,
                leafIndex: 0,
                epoch,
                nonce,
                attesterId,
                data,
                sigData,
                externalNullifier,
            })
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.preventDoubleAction,
                circuitInputs
            )
            expect(isValid).to.be.true
            expect(publicSignals[0]).to.equal(
                genEpochKey(newId.secret, attesterId, epoch, nonce).toString()
            )
            expect(publicSignals[1]).to.equal(tree.root.toString())
            const nullifier = poseidon2([newId.nullifier, externalNullifier])
            expect(publicSignals[3]).to.equal(nullifier.toString())
            expect(publicSignals[4].toString()).to.equal(sigData.toString())

            const p = new PreventDoubleActionProof(publicSignals, proof)
            expect(p.epoch.toString()).to.equal(epoch.toString())
            expect(p.nonce.toString()).to.equal('0')
            expect(p.revealNonce.toString()).to.equal('0')
            expect(p.attesterId.toString()).to.equal(attesterId.toString())
            expect(p.epochKey.toString()).to.equal(
                genEpochKey(newId.secret, attesterId, epoch, nonce).toString()
            )
            expect(p.stateTreeRoot.toString()).to.equal(tree.root.toString())
            expect(p.sigData.toString()).to.equal(sigData.toString())
            expect(p.control.toString()).to.equal(
                EpochKeyLiteProof.buildControl({
                    attesterId,
                    epoch,
                    nonce,
                }).toString()
            )
            expect(p.nullifier.toString()).to.equal(nullifier.toString())

            publicSignals[4] = '00000'
            const valid = await defaultProver.verifyProof(
                Circuit.preventDoubleAction,
                publicSignals,
                proof
            )
            expect(valid).to.be.false
        }
    })

    it('should prove wrong gst root for wrong rep', async () => {
        const attesterId = BigInt(10210)
        const epoch = 120958
        const data = randomData()
        const nonce = 0
        const id = new Identity()
        const newId = genV4Identity(id)
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const leaf = genStateTreeLeaf(newId.secret, attesterId, epoch, data)
        tree.insert(leaf)
        const externalNullifier = BigInt(1)
        const circuitInputs = genPreventDoubleActionCircuitInput({
            id,
            tree,
            leafIndex: 0,
            epoch,
            nonce,
            attesterId,
            data,
            externalNullifier,
        })
        circuitInputs.data[0] = 21908
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.preventDoubleAction,
            circuitInputs
        )
        expect(isValid).to.be.true
        expect(publicSignals[0]).to.equal(
            genEpochKey(newId.secret, attesterId, epoch, nonce).toString()
        )
        expect(publicSignals[1]).to.not.equal(tree.root.toString())
    })

    it('should prove wrong gst root/epoch key for wrong attester id', async () => {
        const attesterId = BigInt(10210)
        const epoch = 120958
        const data = randomData()
        const nonce = 0
        const id = new Identity()
        const newId = genV4Identity(id)
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const leaf = genStateTreeLeaf(newId.secret, attesterId, epoch, data)
        tree.insert(leaf)
        const externalNullifier = BigInt(1)
        const circuitInputs = genPreventDoubleActionCircuitInput({
            id,
            tree,
            leafIndex: 0,
            epoch,
            nonce,
            attesterId,
            data,
            externalNullifier,
        })

        circuitInputs.attester_id = 2171828
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.preventDoubleAction,
            circuitInputs
        )
        expect(isValid).to.be.true

        expect(publicSignals[0]).to.not.equal(
            genEpochKey(newId.secret, attesterId, epoch, nonce).toString()
        )
        expect(publicSignals[1]).to.not.equal(tree.root.toString())
    })
})
