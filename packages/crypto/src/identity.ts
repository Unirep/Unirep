import { ZkIdentity, Strategy } from '@zk-kit/identity'
import { SnarkBigInt } from './crypto'

type EddsaPrivateKey = Buffer
type EddsaPublicKey = SnarkBigInt[]
type SnarkWitness = Array<SnarkBigInt>
type SnarkPublicSignals = SnarkBigInt[]

interface SnarkProof {
    pi_a: SnarkBigInt[]
    pi_b: SnarkBigInt[][]
    pi_c: SnarkBigInt[]
}

export {
    EddsaPrivateKey,
    EddsaPublicKey,
    SnarkWitness,
    SnarkPublicSignals,
    SnarkProof,
    SnarkBigInt,
    ZkIdentity,
    Strategy,
}
