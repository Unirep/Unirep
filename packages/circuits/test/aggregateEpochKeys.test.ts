import { expect } from 'chai'
import { SparseMerkleTree, hash3, hash4, hash6 } from '@unirep/utils'
import { Circuit } from '../src'
import { defaultEpochTreeLeaf, genProofAndVerify } from './utils'
import {
    EPOCH_TREE_DEPTH,
    EPOCH_TREE_ARITY,
    AGGREGATE_KEY_COUNT,
} from '../config'

describe('Multiple SMT updates', function () {
    this.timeout(300000)
    it('should update many leaves in an SMT', async () => {
        const tree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf,
            EPOCH_TREE_ARITY
        )
        const startRoot = tree.root
        const newLeaves = Array(AGGREGATE_KEY_COUNT)
            .fill(null)
            .map((_, i) => ({
                posRep: BigInt(i * 100),
                negRep: BigInt(i),
                leafIndex: BigInt(i * 500),
                graffiti: BigInt(14910215185105109),
                timestamp: BigInt(+new Date()),
            }))
        const attesterId = 0x1924419
        const epoch = 12490
        const hashchainIndex = 129
        const circuitInputs = {
            start_root: startRoot,
            epoch_keys: newLeaves.map(({ leafIndex }) => leafIndex),
            epoch_key_balances: newLeaves.map(
                ({ posRep, negRep, graffiti, timestamp }) => [
                    posRep,
                    negRep,
                    graffiti,
                    timestamp,
                ]
            ),
            old_epoch_key_hashes: newLeaves.map(() => defaultEpochTreeLeaf),
            path_elements: newLeaves.map((d) => {
                const p = tree.createProof(d.leafIndex)
                tree.update(
                    d.leafIndex,
                    hash4([d.posRep, d.negRep, d.graffiti, d.timestamp])
                )
                return p
            }),
            epoch,
            attester_id: attesterId,
            hashchain_index: hashchainIndex,
            epoch_key_count: AGGREGATE_KEY_COUNT, // process all of them
        }
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.aggregateEpochKeys,
            circuitInputs
        )
        const hashchain = newLeaves.reduce((acc, obj) => {
            return hash6([
                acc,
                obj.leafIndex,
                obj.posRep,
                obj.negRep,
                obj.graffiti,
                obj.timestamp,
            ])
        }, hash3([attesterId, epoch, hashchainIndex]))
        expect(isValid).to.be.true
        expect(publicSignals[0].toString()).to.equal(tree.root.toString())
        expect(publicSignals[1].toString()).to.equal(hashchain.toString())
    })

    it('should short circuit leaf updates and hashchain', async () => {
        const tree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            defaultEpochTreeLeaf,
            EPOCH_TREE_ARITY
        )
        const startRoot = tree.root
        const count = Math.ceil(AGGREGATE_KEY_COUNT / 2)
        const newLeaves = Array(count)
            .fill(null)
            .map((_, i) => ({
                posRep: BigInt(i * 100),
                negRep: BigInt(i),
                leafIndex: BigInt((i + 1) * 500),
                graffiti: BigInt(124124891249),
                timestamp: BigInt(198192849),
            }))
        const dummyLeaves = Array(AGGREGATE_KEY_COUNT - count)
            .fill(null)
            .map(() => ({
                posRep: BigInt(0),
                negRep: BigInt(0),
                leafIndex: BigInt(0),
                graffiti: BigInt(0),
                timestamp: BigInt(0),
            }))
        const allLeaves = [newLeaves, dummyLeaves].flat()
        const attesterId = 0x1924419
        const epoch = 12490
        const hashchainIndex = 129
        const circuitInputs = {
            start_root: startRoot,
            epoch_keys: allLeaves.map(({ leafIndex }) => leafIndex),
            epoch_key_balances: allLeaves.map(
                ({ posRep, negRep, graffiti, timestamp }) => [
                    posRep,
                    negRep,
                    graffiti,
                    timestamp,
                ]
            ),
            old_epoch_key_hashes: allLeaves.map(() => defaultEpochTreeLeaf),
            path_elements: allLeaves.map((d, i) => {
                const p = tree.createProof(d.leafIndex)
                if (i < newLeaves.length) {
                    tree.update(
                        d.leafIndex,
                        hash4([d.posRep, d.negRep, d.graffiti, d.timestamp])
                    )
                }
                return p
            }),
            epoch,
            attester_id: attesterId,
            hashchain_index: hashchainIndex,
            epoch_key_count: count,
        }
        const { isValid, publicSignals } = await genProofAndVerify(
            Circuit.aggregateEpochKeys,
            circuitInputs
        )
        const hashchain = newLeaves.reduce((acc, obj) => {
            return hash6([
                acc,
                obj.leafIndex,
                obj.posRep,
                obj.negRep,
                obj.graffiti,
                obj.timestamp,
            ])
        }, hash3([attesterId, epoch, hashchainIndex]))
        expect(isValid).to.be.true
        expect(publicSignals[0].toString()).to.equal(tree.root.toString())
        expect(publicSignals[1].toString()).to.equal(hashchain.toString())
    })

    it('should fail to prove with 0 epoch keys', async () => {
        const tree = new SparseMerkleTree(
            EPOCH_TREE_DEPTH,
            hash4([0, 0, 0, 0]),
            EPOCH_TREE_ARITY
        )
        const startRoot = tree.root
        const newLeaves = Array(AGGREGATE_KEY_COUNT)
            .fill(null)
            .map((_, i) => ({
                posRep: BigInt(i * 100),
                negRep: BigInt(i),
                leafIndex: BigInt(i * 500),
                graffiti: BigInt(14910215185105109),
                timestamp: BigInt(+new Date()),
            }))
        const attesterId = 0x1924419
        const epoch = 12490
        const hashchainIndex = 129
        const circuitInputs = {
            start_root: startRoot,
            epoch_keys: newLeaves.map(({ leafIndex }) => leafIndex),
            epoch_key_balances: newLeaves.map(
                ({ posRep, negRep, graffiti, timestamp }) => [
                    posRep,
                    negRep,
                    graffiti,
                    timestamp,
                ]
            ),
            old_epoch_key_hashes: newLeaves.map(() => defaultEpochTreeLeaf),
            path_elements: newLeaves.map((d, i) => {
                const p = tree.createProof(d.leafIndex)
                if (i < newLeaves.length) {
                    tree.update(
                        d.leafIndex,
                        hash4([d.posRep, d.negRep, d.graffiti, d.timestamp])
                    )
                }
                return p
            }),
            epoch,
            attester_id: attesterId,
            hashchain_index: hashchainIndex,
            epoch_key_count: 0,
        }
        await new Promise<void>((rs, rj) => {
            genProofAndVerify(Circuit.aggregateEpochKeys, circuitInputs)
                .then(() => rj())
                .catch(() => rs())
        })
    })
})
