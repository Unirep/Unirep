import { SparseMerkleTree, hash4, hash1 } from '@unirep/utils'
import BN from 'bn.js'

export const NUM_EPOCH_KEY_NONCE_PER_EPOCH = 3

export const STATE_TREE_DEPTH = 12

export const EPOCH_TREE_DEPTH = 3
export const EPOCH_TREE_ARITY = 6

export const R = hash1([
    `0x${Buffer.from('unirep_polyhash_constant', 'utf8').toString('hex')}`,
])

export const defaultEpochTreeLeaf = hash4([0, 0, 0, 0])
const smt = new SparseMerkleTree(EPOCH_TREE_DEPTH, defaultEpochTreeLeaf)
export const EMPTY_EPOCH_TREE_ROOT = smt.root.toString()

export const SNARK_SCALAR_FIELD =
    '21888242871839275222246405745257275088548364400416034343698204186575808495617'

//~~ Calculate the R values and export
const _R = new BN(R.toString(), 10)
const _N = new BN(SNARK_SCALAR_FIELD, 10)

let _Rx = new BN(_R)

export const Rx = [] as bigint[]
Rx.push(BigInt(1))
for (let x = 1; x < EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH; x++) {
    Rx.push(BigInt(_Rx.toString(10)))
    _Rx = _Rx.mul(_R).mod(_N)
}
