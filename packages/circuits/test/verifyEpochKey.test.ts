import { expect } from 'chai'
import { IncrementalMerkleTree, ZkIdentity, hash5 } from '@unirep/crypto'
import { Circuit } from '../src'

import {
    GLOBAL_STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
} from '../config'

import {
    genEpochKeyCircuitInput,
    genProofAndVerify,
    genEpochKey,
} from './utils'

describe('Verify Epoch Key circuits', function () {
    this.timeout(300000)

    it('should prove epoch key membership', async () => {
        for (let nonce = 0; nonce < NUM_EPOCH_KEY_NONCE_PER_EPOCH; nonce++) {
            const attesterId = 10210
            const epoch = 120958
            const posRep = 2988
            const negRep = 987
            const id = new ZkIdentity()
            const tree = new IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
            const leaf = hash5([
                id.identityNullifier,
                attesterId,
                epoch,
                posRep,
                negRep,
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
            })
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
            expect(publicSignals[1]).to.equal(tree.root.toString())
        }
    })
    it('should prove wrong gst root for wrong rep', async () => {
        const attesterId = 10210
        const epoch = 120958
        const posRep = 2988
        const negRep = 987
        const nonce = 0
        const id = new ZkIdentity()
        const tree = new IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
        const leaf = hash5([
            id.identityNullifier,
            attesterId,
            epoch,
            posRep,
            negRep,
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
        const attesterId = 10210
        const epoch = 120958
        const posRep = 2988
        const negRep = 987
        const nonce = 0
        const id = new ZkIdentity()
        const tree = new IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
        const leaf = hash5([
            id.identityNullifier,
            attesterId,
            epoch,
            posRep,
            negRep,
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
        })
        circuitInputs.attester_id = 21789
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
        const attesterId = 10210
        const epoch = 120958
        const posRep = 2988
        const negRep = 987
        const nonce = NUM_EPOCH_KEY_NONCE_PER_EPOCH
        const id = new ZkIdentity()
        const tree = new IncrementalMerkleTree(GLOBAL_STATE_TREE_DEPTH)
        const leaf = hash5([
            id.identityNullifier,
            attesterId,
            epoch,
            posRep,
            negRep,
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
        })
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.verifyEpochKey,
            circuitInputs
        )
        expect(isValid).to.be.false
        expect(publicSignals[0]).to.equal(
            genEpochKey(
                id.identityNullifier,
                attesterId,
                epoch,
                nonce
            ).toString()
        )
        expect(publicSignals[1]).to.equal(tree.root.toString())
    })
})
