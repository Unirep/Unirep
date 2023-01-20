import { expect } from 'chai'
import {
    IncrementalMerkleTree,
    ZkIdentity,
    hash7,
    genEpochKey,
} from '@unirep/utils'
import { Circuit, EpochKeyProof } from '../src'
import { defaultProver } from '../provers/defaultProver'

import { STATE_TREE_DEPTH, NUM_EPOCH_KEY_NONCE_PER_EPOCH } from '../config'

import { genEpochKeyCircuitInput, genProofAndVerify } from './utils'

describe('Verify Epoch Key circuits', function () {
    this.timeout(300000)

    it('should prove epoch key membership', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const attesterId = BigInt(10210)
            const epoch = 120958
            const posRep = 2988
            const negRep = 987
            const graffiti = 1294129
            const timestamp = 214
            const id = new ZkIdentity()
            const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
            const leaf = hash7([
                id.identityNullifier,
                attesterId,
                epoch,
                posRep,
                negRep,
                graffiti,
                timestamp,
            ])
            tree.insert(leaf)
            const circuitInputs = genEpochKeyCircuitInput({
                id,
                tree,
                leafIndex: 0,
                epoch,
                nonce,
                attesterId,
                posRep,
                negRep,
                graffiti,
                timestamp,
            })
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.verifyEpochKey,
                circuitInputs
            )
            expect(isValid).to.be.true
            expect(publicSignals[0]).to.equal(
                genEpochKey(
                    id.identityNullifier,
                    attesterId,
                    epoch,
                    nonce
                ).toString()
            )
            expect(publicSignals[1]).to.equal(tree.root.toString())
            expect(publicSignals[2]).to.equal(
                (
                    (BigInt(attesterId) << BigInt(72)) +
                    (BigInt(epoch) << BigInt(8))
                ).toString()
            )
            const data = new EpochKeyProof(publicSignals, proof)
            expect(data.epoch.toString()).to.equal(epoch.toString())
            expect(data.nonce.toString()).to.equal('0')
            expect(data.revealNonce.toString()).to.equal('0')
            expect(data.attesterId.toString()).to.equal(attesterId.toString())
        }
    })

    it('should reveal nonce value', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const attesterId = BigInt(10210)
            const epoch = 120958
            const posRep = 2988
            const negRep = 987
            const graffiti = 1294129
            const timestamp = 214
            const revealNonce = 1
            const id = new ZkIdentity()
            const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
            const leaf = hash7([
                id.identityNullifier,
                attesterId,
                epoch,
                posRep,
                negRep,
                graffiti,
                timestamp,
            ])
            tree.insert(leaf)
            const circuitInputs = genEpochKeyCircuitInput({
                id,
                tree,
                leafIndex: 0,
                epoch,
                nonce,
                attesterId,
                posRep,
                negRep,
                graffiti,
                timestamp,
                revealNonce,
            })
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.verifyEpochKey,
                circuitInputs
            )
            expect(isValid).to.be.true
            expect(publicSignals[0]).to.equal(
                genEpochKey(
                    id.identityNullifier,
                    attesterId,
                    epoch,
                    nonce
                ).toString()
            )
            expect(publicSignals[1]).to.equal(tree.root.toString())
            expect(publicSignals[2]).to.equal(
                (
                    (BigInt(1) << BigInt(232)) +
                    (BigInt(attesterId) << BigInt(72)) +
                    (BigInt(epoch) << BigInt(8)) +
                    BigInt(nonce)
                ).toString()
            )
            const data = new EpochKeyProof(publicSignals, proof)
            expect(data.epoch.toString()).to.equal(epoch.toString())
            expect(data.nonce.toString()).to.equal(nonce.toString())
            expect(data.revealNonce.toString()).to.equal(revealNonce.toString())
            expect(data.attesterId.toString()).to.equal(attesterId.toString())
        }
    })

    it('should prove a data value', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const attesterId = BigInt(10210)
            const epoch = 120958
            const posRep = 2988
            const negRep = 987
            const graffiti = 1294129
            const timestamp = 214
            const data = BigInt(1288972090)
            const id = new ZkIdentity()
            const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
            const leaf = hash7([
                id.identityNullifier,
                attesterId,
                epoch,
                posRep,
                negRep,
                graffiti,
                timestamp,
            ])
            tree.insert(leaf)
            const circuitInputs = genEpochKeyCircuitInput({
                id,
                tree,
                leafIndex: 0,
                epoch,
                nonce,
                attesterId,
                posRep,
                negRep,
                graffiti,
                timestamp,
                data,
            })
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.verifyEpochKey,
                circuitInputs
            )
            expect(isValid).to.be.true
            expect(publicSignals[0]).to.equal(
                genEpochKey(
                    id.identityNullifier,
                    attesterId,
                    epoch,
                    nonce
                ).toString()
            )
            expect(publicSignals[1]).to.equal(tree.root.toString())
            expect(publicSignals[3].toString()).to.equal(data.toString())
            const _data = new EpochKeyProof(publicSignals, proof)
            expect(_data.epoch.toString()).to.equal(epoch.toString())
            expect(_data.nonce.toString()).to.equal('0')
            expect(_data.revealNonce.toString()).to.equal('0')
            expect(_data.attesterId.toString()).to.equal(attesterId.toString())
        }
    })

    it('data value should be verified in proof', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const attesterId = BigInt(10210)
            const epoch = 120958
            const posRep = 2988
            const negRep = 987
            const graffiti = 1294129
            const timestamp = 214
            const data = BigInt(1288972090)
            const id = new ZkIdentity()
            const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
            const leaf = hash7([
                id.identityNullifier,
                attesterId,
                epoch,
                posRep,
                negRep,
                graffiti,
                timestamp,
            ])
            tree.insert(leaf)
            const circuitInputs = genEpochKeyCircuitInput({
                id,
                tree,
                leafIndex: 0,
                epoch,
                nonce,
                attesterId,
                posRep,
                negRep,
                graffiti,
                timestamp,
                data,
            })
            const { isValid, publicSignals, proof } = await genProofAndVerify(
                Circuit.verifyEpochKey,
                circuitInputs
            )
            expect(isValid).to.be.true
            expect(publicSignals[0]).to.equal(
                genEpochKey(
                    id.identityNullifier,
                    attesterId,
                    epoch,
                    nonce
                ).toString()
            )
            expect(publicSignals[1]).to.equal(tree.root.toString())
            expect(publicSignals[3].toString()).to.equal(data.toString())
            publicSignals[3] = '00000'
            const valid = await defaultProver.verifyProof(
                Circuit.verifyEpochKey,
                publicSignals,
                proof
            )
            expect(valid).to.be.false
        }
    })

    it('should prove wrong gst root for wrong rep', async () => {
        const attesterId = BigInt(10210)
        const epoch = 120958
        const posRep = 2988
        const negRep = 987
        const graffiti = 1294129
        const timestamp = 214
        const nonce = 0
        const id = new ZkIdentity()
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const leaf = hash7([
            id.identityNullifier,
            attesterId,
            epoch,
            posRep,
            negRep,
            graffiti,
            timestamp,
        ])
        tree.insert(leaf)
        const circuitInputs = genEpochKeyCircuitInput({
            id,
            tree,
            leafIndex: 0,
            epoch,
            nonce,
            attesterId,
            posRep,
            negRep,
            graffiti,
            timestamp,
        })
        circuitInputs.pos_rep = 21908
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.verifyEpochKey,
            circuitInputs
        )
        expect(isValid).to.be.true
        expect(publicSignals[0]).to.equal(
            genEpochKey(
                id.identityNullifier,
                attesterId,
                epoch,
                nonce
            ).toString()
        )
        expect(publicSignals[1]).to.not.equal(tree.root.toString())
    })

    it('should prove wrong gst root/epoch key for wrong attester id', async () => {
        const attesterId = BigInt(10210)
        const epoch = 120958
        const posRep = 2988
        const negRep = 987
        const graffiti = 1294129
        const timestamp = 214
        const nonce = 0
        const id = new ZkIdentity()
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const leaf = hash7([
            id.identityNullifier,
            attesterId,
            epoch,
            posRep,
            negRep,
            graffiti,
            timestamp,
        ])
        tree.insert(leaf)
        const circuitInputs = genEpochKeyCircuitInput({
            id,
            tree,
            leafIndex: 0,
            epoch,
            nonce,
            attesterId,
            posRep,
            negRep,
            graffiti,
            timestamp,
        })
        circuitInputs.control = EpochKeyProof.buildControlInput({
            epoch,
            nonce,
            attesterId: 2171828,
        })
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.verifyEpochKey,
            circuitInputs
        )
        expect(isValid).to.be.true
        expect(publicSignals[0]).to.not.equal(
            genEpochKey(
                id.identityNullifier,
                attesterId,
                epoch,
                nonce
            ).toString()
        )
        expect(publicSignals[1]).to.not.equal(tree.root.toString())
    })

    it('should fail to prove invalid nonce', async () => {
        const attesterId = BigInt(10210)
        const epoch = 120958
        const posRep = 2988
        const negRep = 987
        const graffiti = 1294129
        const timestamp = 214
        const nonce = NUM_EPOCH_KEY_NONCE_PER_EPOCH
        const id = new ZkIdentity()
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const leaf = hash7([
            id.identityNullifier,
            attesterId,
            epoch,
            posRep,
            negRep,
            graffiti,
            timestamp,
        ])
        tree.insert(leaf)
        const circuitInputs = genEpochKeyCircuitInput({
            id,
            tree,
            leafIndex: 0,
            epoch,
            nonce,
            attesterId,
            posRep,
            negRep,
            graffiti,
            timestamp,
        })
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.verifyEpochKey, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })
})
