import { expect } from 'chai'
import { Identity } from '@semaphore-protocol/identity'
import {
    IncrementalMerkleTree,
    genEpochKey,
    stringifyBigInts,
    genStateTreeLeaf,
    genEpochTreeLeaf,
} from '@unirep/utils'
import { Circuit, CircuitConfig } from '../src'
import { randomData, combineData, genProofAndVerify } from './utils'
const {
    EPOCH_TREE_DEPTH,
    EPOCH_TREE_ARITY,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    STATE_TREE_DEPTH,
    SUM_FIELD_COUNT,
    FIELD_COUNT,
} = CircuitConfig.default

describe('User state transition', function () {
    this.timeout(300000)

    it('should do a user state transition', async () => {
        const id = new Identity()
        const fromEpoch = 1
        const toEpoch = 5
        const attesterId = BigInt(1249021895182290)
        const data = randomData()
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const epochTree = new IncrementalMerkleTree(EPOCH_TREE_DEPTH)
        stateTree.insert(
            genStateTreeLeaf(id.secret, attesterId, fromEpoch, data)
        )
        const stateTreeProof = stateTree.createProof(0)
        epochTree.insert(0)
        const epochTreeProof = epochTree.createProof(0)
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(id.secret, BigInt(attesterId), fromEpoch, i)
            )
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.userStateTransition,
            {
                from_epoch: fromEpoch,
                to_epoch: toEpoch,
                identity_secret: id.secret,
                state_tree_indexes: stateTreeProof.pathIndices,
                state_tree_elements: stateTreeProof.siblings,
                attester_id: attesterId,
                data,
                new_data: epochKeys.map(() => Array(FIELD_COUNT).fill(0)),
                epoch_tree_elements: epochKeys.map(
                    () => epochTreeProof.siblings
                ),
                epoch_tree_indices: epochKeys.map(
                    () => epochTreeProof.pathIndices
                ),
                epoch_tree_root: epochTree.root,
            }
        )
        expect(isValid, 'invalid proof').to.be.true
        expect(publicSignals[0]).to.equal(stateTree.root.toString())
        const newLeaf = genStateTreeLeaf(id.secret, attesterId, toEpoch, data)
        expect(publicSignals[1]).to.equal(newLeaf.toString())
        const expectedKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(0)
            .map((_, i) => {
                return genEpochKey(id.secret, attesterId, fromEpoch, i)
            })
        for (let x = 0; x < NUM_EPOCH_KEY_NONCE_PER_EPOCH; x++) {
            expect(publicSignals[2 + x]).to.equal(expectedKeys[x].toString())
        }
    })

    it('should do a user state transition with new rep', async () => {
        for (let x = 0; x < NUM_EPOCH_KEY_NONCE_PER_EPOCH; x++) {
            const id = new Identity()
            const fromEpoch = 1
            const toEpoch = 5
            const attesterId = BigInt(1249021895182290)
            const data = randomData()
            const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
                .fill(null)
                .map((_, i) =>
                    genEpochKey(id.secret, BigInt(attesterId), fromEpoch, i)
                )
            const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
            const epochTree = new IncrementalMerkleTree(EPOCH_TREE_DEPTH)
            stateTree.insert(
                genStateTreeLeaf(id.secret, attesterId, fromEpoch, data)
            )
            const stateTreeProof = stateTree.createProof(0)
            epochTree.insert(0)
            const newData0 = randomData()
            epochTree.insert(genEpochTreeLeaf(epochKeys[x], newData0))
            const epochTreeProofs = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
                .fill(0)
                .map((_, i) => {
                    if (i === x) {
                        return epochTree.createProof(1)
                    } else {
                        return epochTree.createProof(0)
                    }
                })
            const { isValid, publicSignals } = await genProofAndVerify(
                Circuit.userStateTransition,
                {
                    from_epoch: fromEpoch,
                    to_epoch: toEpoch,
                    identity_secret: id.secret,
                    state_tree_indexes: stateTreeProof.pathIndices,
                    state_tree_elements: stateTreeProof.siblings,
                    attester_id: attesterId,
                    data,
                    new_data: epochKeys.map((_, i) => {
                        if (i === x) {
                            return newData0
                        }
                        return Array(FIELD_COUNT).fill(0)
                    }),
                    epoch_tree_elements: epochTreeProofs.map((p) => p.siblings),
                    epoch_tree_indices: epochTreeProofs.map(
                        (p) => p.pathIndices
                    ),
                    epoch_tree_root: epochTree.root,
                }
            )
            expect(isValid, 'invalid proof').to.be.true
            expect(publicSignals[0]).to.equal(stateTree.root.toString())
            const newLeaf = genStateTreeLeaf(
                id.secret,
                attesterId,
                toEpoch,
                combineData(data, newData0)
            )
            expect(publicSignals[1]).to.equal(newLeaf.toString())
            const expectedKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
                .fill(0)
                .map((_, i) => {
                    if (i === x) {
                        return genEpochKey(
                            id.secret,
                            attesterId,
                            fromEpoch,
                            i + NUM_EPOCH_KEY_NONCE_PER_EPOCH
                        )
                    }
                    return genEpochKey(id.secret, attesterId, fromEpoch, i)
                })
            for (let y = 0; y < NUM_EPOCH_KEY_NONCE_PER_EPOCH; y++) {
                expect(publicSignals[2 + y]).to.equal(
                    expectedKeys[y].toString()
                )
            }
        }
    })

    it('should fail to UST with new data and bad inclusion proof', async () => {
        const id = new Identity()
        const fromEpoch = 1
        const toEpoch = 5
        const attesterId = BigInt(1249021895182290)
        const data = randomData()
        const stateTree = new IncrementalMerkleTree(STATE_TREE_DEPTH)
        const epochTree = new IncrementalMerkleTree(EPOCH_TREE_DEPTH)
        stateTree.insert(
            genStateTreeLeaf(id.secret, attesterId, fromEpoch, data)
        )
        const stateTreeProof = stateTree.createProof(0)
        epochTree.insert(0)
        const epochTreeProof = epochTree.createProof(0)
        const epochKeys = Array(NUM_EPOCH_KEY_NONCE_PER_EPOCH)
            .fill(null)
            .map((_, i) =>
                genEpochKey(id.secret, BigInt(attesterId), fromEpoch, i)
            )
        const circuitInputs = {
            from_epoch: fromEpoch,
            to_epoch: toEpoch,
            identity_secret: id.secret,
            state_tree_indexes: stateTreeProof.pathIndices,
            state_tree_elements: stateTreeProof.siblings,
            attester_id: attesterId,
            data,
            new_data: epochKeys.map(() => Array(FIELD_COUNT).fill(1)),
            epoch_tree_elements: epochKeys.map(() => epochTreeProof.siblings),
            epoch_tree_indices: epochKeys.map(() => epochTreeProof.pathIndices),
            epoch_tree_root: epochTree.root,
        }
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.userStateTransition, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })
})
