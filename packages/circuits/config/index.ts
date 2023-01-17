import { SparseMerkleTree, hash4, hash1 } from '@unirep/utils'
import BN from 'bn.js'

export const NUM_EPOCH_KEY_NONCE_PER_EPOCH = 3

export const STATE_TREE_DEPTH = 12

export const EPOCH_TREE_DEPTH = 5
export const EPOCH_TREE_ARITY = 6

export const R = hash1([
    `0x${Buffer.from('unirep_polyhash_constant', 'utf8').toString('hex')}`,
])

export const defaultEpochTreeLeaf = hash4([0, 0, 0, 0])
const smt = new SparseMerkleTree(EPOCH_TREE_DEPTH, defaultEpochTreeLeaf)
export const EMPTY_EPOCH_TREE_ROOT = smt.root.toString()

export const SNARK_SCALAR_FIELD = BigInt(21888242871839275222246405745257275088548364400416034343698204186575808495617)

/*~~ Calculate the R_CHECKSUM

This is used to verify that the prover supplied all
R[n] = [R**0, R**1, R**2 ... R**n]
*/
const _R = new BN(R.toString(), 10)
const _N = new BN(SNARK_SCALAR_FIELD.toString(), 10)

let _Rx = new BN(_R)

export const Rx = [] as bigint[]
const terms = [] as any[]
terms.push(hash1([1]))
Rx.push(BigInt(1))
for (let x = 1; x < EPOCH_TREE_ARITY**EPOCH_TREE_DEPTH; x++) {
  const coefficient = hash1([BigInt(_Rx.toString(10))])
  const term = new BN(coefficient.toString(), 10).mul(_Rx).mod(_N).toString(10)
  terms.push(term)
  Rx.push(BigInt(_Rx.toString(10)))
  _Rx = _Rx.mul(_R).mod(_N)
}

const Rsum = new BN(1)

for (const term of terms) {
  Rsum.iadd(new BN(term, 10))
}

export const R_CHECKSUM = Rsum.mod(_N).toString(10)

