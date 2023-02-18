import { expect } from 'chai'
import {
    IncrementalMerkleTree,
    ZkIdentity,
    genEpochKey,
    genStateTreeLeaf,
} from '@unirep/utils'
import { Circuit, EpochKeyProof, CircuitConfig } from '../src'
import { defaultProver } from '../provers/defaultProver'

import { genEpochKeyCircuitInput, genProofAndVerify, randomData } from './utils'

const { STATE_TREE_DEPTH, NUM_EPOCH_KEY_NONCE_PER_EPOCH } =
    CircuitConfig.default

describe('Verify Epoch Key circuits', function () {
    this.timeout(300000)

    it('should prove epoch key membership', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const attesterId = BigInt(10210)
            const epoch = 120958
            const data = randomData()
            const id = new ZkIdentity()
            const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
            const leaf = genStateTreeLeaf(
                id.secretHash,
                attesterId,
                epoch,
                data
            )
            tree.insert(leaf)
            const circuitInputs = genEpochKeyCircuitInput({
                id,
                tree,
                leafIndex: 0,
                epoch,
                nonce,
                attesterId,
                data,
            })
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.epochKey,
                circuitInputs
            )
            expect(isValid).to.be.true
            expect(publicSignals[0]).to.equal(
                genEpochKey(id.secretHash, attesterId, epoch, nonce).toString()
            )
            expect(publicSignals[1]).to.equal(tree.root.toString())
            expect(publicSignals[2]).to.equal(
                EpochKeyProof.buildControl({
                    attesterId,
                    epoch,
                    nonce,
                }).toString()
            )
            const p = new EpochKeyProof(publicSignals, proof)
            expect(p.epoch.toString()).to.equal(epoch.toString())
            expect(p.nonce.toString()).to.equal('0')
            expect(p.revealNonce.toString()).to.equal('0')
            expect(p.attesterId.toString()).to.equal(attesterId.toString())
        }
    })

    it('should reveal nonce value', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const attesterId = BigInt(10210)
            const epoch = 120958
            const data = randomData()
            const revealNonce = 1
            const id = new ZkIdentity()
            const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
            const leaf = genStateTreeLeaf(
                id.secretHash,
                attesterId,
                epoch,
                data
            )
            tree.insert(leaf)
            const circuitInputs = genEpochKeyCircuitInput({
                id,
                tree,
                leafIndex: 0,
                epoch,
                nonce,
                attesterId,
                data,
                revealNonce,
            })
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.epochKey,
                circuitInputs
            )
            expect(isValid).to.be.true
            expect(publicSignals[2]).to.equal(
                EpochKeyProof.buildControl({
                    attesterId,
                    epoch,
                    nonce,
                    revealNonce,
                }).toString()
            )
            expect(publicSignals[0]).to.equal(
                genEpochKey(id.secretHash, attesterId, epoch, nonce).toString()
            )
            expect(publicSignals[1]).to.equal(tree.root.toString())
            expect(publicSignals[2]).to.equal(
                EpochKeyProof.buildControl({
                    attesterId,
                    epoch,
                    nonce,
                    revealNonce,
                }).toString()
            )
            const p = new EpochKeyProof(publicSignals, proof)
            expect(p.epoch.toString()).to.equal(epoch.toString())
            expect(p.nonce.toString()).to.equal(nonce.toString())
            expect(p.revealNonce.toString()).to.equal(revealNonce.toString())
            expect(p.attesterId.toString()).to.equal(attesterId.toString())
        }
    })

    it('should prove a data value', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const attesterId = BigInt(10210)
            const epoch = 120958
            const data = randomData()
            const sigData = BigInt(1288972090)
            const id = new ZkIdentity()
            const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
            const leaf = genStateTreeLeaf(
                id.secretHash,
                attesterId,
                epoch,
                data
            )
            tree.insert(leaf)
            const circuitInputs = genEpochKeyCircuitInput({
                id,
                tree,
                leafIndex: 0,
                epoch,
                nonce,
                attesterId,
                sigData,
                data,
            })
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.epochKey,
                circuitInputs
            )
            expect(isValid).to.be.true
            expect(publicSignals[2]).to.equal(
                EpochKeyProof.buildControl({
                    attesterId,
                    epoch,
                    nonce,
                }).toString()
            )
            expect(publicSignals[0]).to.equal(
                genEpochKey(id.secretHash, attesterId, epoch, nonce).toString()
            )
            expect(publicSignals[1]).to.equal(tree.root.toString())
            expect(publicSignals[3].toString()).to.equal(sigData.toString())
            const p = new EpochKeyProof(publicSignals, proof)
            expect(p.epoch.toString()).to.equal(epoch.toString())
            expect(p.nonce.toString()).to.equal('0')
            expect(p.revealNonce.toString()).to.equal('0')
            expect(p.attesterId.toString()).to.equal(attesterId.toString())
        }
    })

    it('data value should be verified in proof', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const attesterId = BigInt(10210)
            const epoch = 120958
            const data = randomData()
            const sigData = BigInt(1288972090)
            const id = new ZkIdentity()
            const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
            const leaf = genStateTreeLeaf(
                id.secretHash,
                attesterId,
                epoch,
                data
            )
            tree.insert(leaf)
            const circuitInputs = genEpochKeyCircuitInput({
                id,
                tree,
                leafIndex: 0,
                epoch,
                nonce,
                attesterId,
                data,
                sigData,
            })
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.epochKey,
                circuitInputs
            )
            expect(isValid).to.be.true
            expect(publicSignals[0]).to.equal(
                genEpochKey(id.secretHash, attesterId, epoch, nonce).toString()
            )
            expect(publicSignals[1]).to.equal(tree.root.toString())
            expect(publicSignals[3].toString()).to.equal(sigData.toString())
            publicSignals[3] = '00000'
            const valid = await defaultProver.verifyProof(
                Circuit.epochKey,
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
        const id = new ZkIdentity()
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const leaf = genStateTreeLeaf(id.secretHash, attesterId, epoch, data)
        tree.insert(leaf)
        const circuitInputs = genEpochKeyCircuitInput({
            id,
            tree,
            leafIndex: 0,
            epoch,
            nonce,
            attesterId,
            data,
        })
        circuitInputs.data[0] = 21908
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.epochKey,
            circuitInputs
        )
        expect(isValid).to.be.true
        expect(publicSignals[0]).to.equal(
            genEpochKey(id.secretHash, attesterId, epoch, nonce).toString()
        )
        expect(publicSignals[1]).to.not.equal(tree.root.toString())
    })

    it('should prove wrong gst root/epoch key for wrong attester id', async () => {
        const attesterId = BigInt(10210)
        const epoch = 120958
        const data = randomData()
        const nonce = 0
        const id = new ZkIdentity()
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const leaf = genStateTreeLeaf(id.secretHash, attesterId, epoch, data)
        tree.insert(leaf)
        const circuitInputs = genEpochKeyCircuitInput({
            id,
            tree,
            leafIndex: 0,
            epoch,
            nonce,
            attesterId,
            data,
        })
        circuitInputs.attester_id = 2171828
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.epochKey,
            circuitInputs
        )
        expect(isValid).to.be.true
        expect(publicSignals[0]).to.not.equal(
            genEpochKey(id.secretHash, attesterId, epoch, nonce).toString()
        )
        expect(publicSignals[1]).to.not.equal(tree.root.toString())
    })

    it('should fail to prove invalid nonce', async () => {
        const attesterId = BigInt(10210)
        const epoch = 120958
        const data = randomData()
        const nonce = NUM_EPOCH_KEY_NONCE_PER_EPOCH
        const id = new ZkIdentity()
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const leaf = genStateTreeLeaf(id.secretHash, attesterId, epoch, data)
        tree.insert(leaf)
        const circuitInputs = genEpochKeyCircuitInput({
            id,
            tree,
            leafIndex: 0,
            epoch,
            nonce,
            attesterId,
            data,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.epochKey, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })
})
