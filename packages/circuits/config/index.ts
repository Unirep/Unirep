import { SparseMerkleTree, hash4 } from '@unirep/utils'

export const NUM_EPOCH_KEY_NONCE_PER_EPOCH = 3

export const STATE_TREE_DEPTH = 9

export const EPOCH_TREE_DEPTH = 9
export const EPOCH_TREE_ARITY = 14

export const CHANGE_TREE_DEPTH = 3
export const CHANGE_TREE_ARITY = 5

export const AGGREGATE_KEY_COUNT = 7

export const defaultEpochTreeLeaf = hash4([0, 0, 0, 0])
const smt = new SparseMerkleTree(EPOCH_TREE_DEPTH, defaultEpochTreeLeaf)
export const EMPTY_EPOCH_TREE_ROOT = smt.root.toString()
