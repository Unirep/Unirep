import { SparseMerkleTree, hash4, hash1 } from '@unirep/utils'
import BN from 'bn.js'

export const NUM_EPOCH_KEY_NONCE_PER_EPOCH = 3

export const STATE_TREE_DEPTH = 12

export const EPOCH_TREE_DEPTH = 3
export const EPOCH_TREE_ARITY = 3

export const R = hash1([
    `0x${Buffer.from('unirep_polyhash_constant', 'utf8').toString('hex')}`,
])

export const R_V = hash1([
    `0x${Buffer.from('unirep_polyhash_constant_verifier', 'utf8').toString(
        'hex'
    )}`,
])

const SNARK_SCALAR_FIELD = new BN(
    '21888242871839275222246405745257275088548364400416034343698204186575808495617',
    10
)
export const Rx = Array(EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH)
    .fill(null)
    .map((_, i) => {
        const _R = new BN(R.toString(), 10)
        const Rx = _R.pow(new BN(i)).mod(SNARK_SCALAR_FIELD).toString(10)
        return Rx
    })

export const defaultEpochTreeLeaf = hash4([0, 0, 0, 0])
const smt = new SparseMerkleTree(EPOCH_TREE_DEPTH, defaultEpochTreeLeaf)
export const EMPTY_EPOCH_TREE_ROOT = smt.root.toString()
