import { SparseMerkleTree, hash4, hash1 } from '@unirep/utils'

export const NUM_EPOCH_KEY_NONCE_PER_EPOCH = 3

export const STATE_TREE_DEPTH = 7

export const EPOCH_TREE_DEPTH = 3
export const EPOCH_TREE_ARITY = 6

export const AGGREGATE_KEY_COUNT = 7

export const R = hash1([
    `0x${Buffer.from('unirep_polyhash_constant', 'utf8').toString('hex')}`,
])

export const defaultEpochTreeLeaf = hash4([0, 0, 0, 0])
const smt = new SparseMerkleTree(EPOCH_TREE_DEPTH, defaultEpochTreeLeaf)
export const EMPTY_EPOCH_TREE_ROOT = smt.root.toString()
