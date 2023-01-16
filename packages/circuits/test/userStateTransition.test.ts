import { expect } from 'chai'
import { ZkIdentity, IncrementalMerkleTree, hash7 } from '@unirep/utils'
import { Circuit } from '../src'
import {
    genProofAndVerify,
    genEpochKey,
    genUserStateTransitionCircuitInput,
    genUserStateTransitionNullifier,
} from './utils'
import { NUM_EPOCH_KEY_NONCE_PER_EPOCH, STATE_TREE_DEPTH } from '../config'

describe('User state transition', function () {
    this.timeout(300000)

    it('should do a user state transition', async () => {
        const id = new ZkIdentity()
        const fromEpoch = 1
        const toEpoch = 5
        const attesterId = 290
        const posRep = 10
        const negRep = 108
        const graffiti = 190129
        const timestamp = 9241
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        tree.insert(
            hash7([
                id.identityNullifier,
                attesterId,
                fromEpoch,
                posRep,
                negRep,
                graffiti,
                timestamp,
            ])
        )
        const circuitInputs = genUserStateTransitionCircuitInput({
            id,
            fromEpoch,
            toEpoch,
            attesterId,
            startBalance: { posRep, negRep, graffiti, timestamp },
            tree,
            leafIndex: 0,
        })
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.userStateTransition,
            circuitInputs
        )
        expect(isValid, 'invalid proof').to.be.true
        expect(publicSignals[0]).to.equal(tree.root.toString())
        const newLeaf = hash7([
            id.identityNullifier,
            attesterId,
            toEpoch,
            posRep,
            negRep,
            graffiti,
            timestamp,
        ])
        expect(publicSignals[1]).to.equal(newLeaf.toString())
        const transitionNullifier = genUserStateTransitionNullifier(
            id.identityNullifier,
            fromEpoch,
            attesterId
        )
        expect(publicSignals[2]).to.equal(transitionNullifier.toString())
    })

    it('should do a user state transition with new rep', async () => {
        const id = new ZkIdentity()
        const fromEpoch = 1
        const toEpoch = 5
        const attesterId = 290
        const posRep = 10
        const negRep = 108
        const graffiti = 1241
        const timestamp = 124
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        tree.insert(
            hash7([
                id.identityNullifier,
                attesterId,
                fromEpoch,
                posRep,
                negRep,
                graffiti,
                timestamp,
            ])
        )
        const epochKey = genEpochKey(
            id.identityNullifier,
            attesterId,
            fromEpoch,
            0
        )
        const circuitInputs = genUserStateTransitionCircuitInput({
            id,
            fromEpoch,
            toEpoch,
            attesterId,
            startBalance: { posRep, negRep, graffiti, timestamp },
            tree,
            leafIndex: 0,
            epochKeyBalances: {
                [epochKey.toString()]: {
                    posRep: 10,
                    negRep: 20,
                },
            },
        })
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.userStateTransition,
            circuitInputs
        )
        expect(isValid).to.be.true
        expect(publicSignals[0]).to.equal(tree.root.toString())
        const newLeaf = hash7([
            id.identityNullifier,
            attesterId,
            toEpoch,
            posRep + 10,
            negRep + 20,
            graffiti,
            timestamp,
        ])
        expect(publicSignals[1]).to.equal(newLeaf.toString())
        const transitionNullifier = genUserStateTransitionNullifier(
            id.identityNullifier,
            fromEpoch,
            attesterId
        )
        expect(publicSignals[2]).to.equal(transitionNullifier.toString())
    })

    it('should do a user state transition with many new rep', async () => {
        const id = new ZkIdentity()
        const fromEpoch = 1
        const toEpoch = 5
        const attesterId = 290
        const posRep = 10
        const negRep = 108
        const graffiti = 1241
        const timestamp = 124
        const tree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        tree.insert(
            hash7([
                id.identityNullifier,
                attesterId,
                fromEpoch,
                posRep,
                negRep,
                graffiti,
                timestamp,
            ])
        )
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(id.identityNullifier, attesterId, fromEpoch, i)
            )
        const circuitInputs = genUserStateTransitionCircuitInput({
            id,
            fromEpoch,
            toEpoch,
            attesterId,
            startBalance: { posRep, negRep, graffiti, timestamp },
            tree,
            leafIndex: 0,
            epochKeyBalances: epochKeys.reduce(
                (acc, val) => ({
                    ...acc,
                    [val.toString()]: { posRep: 10, negRep: 20 },
                }),
                {}
            ),
        })
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.userStateTransition,
            circuitInputs
        )
        expect(isValid).to.be.true
        expect(publicSignals[0]).to.equal(tree.root.toString())
        const newLeaf = hash7([
            id.identityNullifier,
            attesterId,
            toEpoch,
            posRep + NUM_EPOCH_KEY_NONCE_PER_EPOCH * 10,
            negRep + NUM_EPOCH_KEY_NONCE_PER_EPOCH * 20,
            graffiti,
            timestamp,
        ])
        expect(publicSignals[1]).to.equal(newLeaf.toString())
        const transitionNullifier = genUserStateTransitionNullifier(
            id.identityNullifier,
            fromEpoch,
            attesterId
        )
        expect(publicSignals[2]).to.equal(transitionNullifier.toString())
    })
})
