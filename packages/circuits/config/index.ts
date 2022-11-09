import { SparseMerkleTree, hash4 } from '@unirep/crypto'

export const NUM_EPOCH_KEY_NONCE_PER_EPOCH = 3

export const NUM_ATTESTATIONS_PER_PROOF = 5

export const STATE_TREE_DEPTH = 9

export const EPOCH_TREE_DEPTH = 32

export const AGGREGATE_KEY_COUNT = 7

export const defaultEpochTreeLeaf = hash4([0, 0, 0, 0])
const smt = new SparseMerkleTree(EPOCH_TREE_DEPTH, defaultEpochTreeLeaf)
export const EMPTY_EPOCH_TREE_ROOT = smt.root.toString()
