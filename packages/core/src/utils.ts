import {
    hash2,
    hash3,
    hash4,
    hash5,
    hashLeftRight,
    SparseMerkleTree,
    stringifyBigInts,
    unstringifyBigInts,
} from '@unirep/crypto'

import Reputation from './Reputation'
import {
    formatProofForSnarkjsVerification,
    EPOCH_TREE_DEPTH,
} from '@unirep/circuits'

/**
 * Encode a `BigInt` array to string
 * @param arr The array of `BigInt` elements
 * @returns A string of the array
 */
export const encodeBigIntArray = (arr: BigInt[]): string => {
    return JSON.stringify(stringifyBigInts(arr))
}

/**
 * Decode an encoded string to a `BigInt` array
 * @param input The string of the encoded data
 * @returns The `bigint` array
 */
export const decodeBigIntArray = (input: string): bigint[] => {
    return unstringifyBigInts(JSON.parse(input))
}

/**
 * Compute the epoch key of given identity, epoch and nonce
 * @param identityNullifier The identity nullifier of the semaphore identity
 * @param epoch The epoch of the epoch key
 * @param nonce The nonce of the epoch key
 * @param epochTreeDepth The depth of the epoch tree
 * @returns The moded epoch key
 */
const genEpochKey = (
    identityNullifier: bigint,
    attesterId: bigint | string,
    epoch: number,
    nonce: number,
    epochTreeDepth: number = EPOCH_TREE_DEPTH
): bigint => {
    const epochKey = hash4([
        identityNullifier as any,
        BigInt(attesterId),
        epoch,
        BigInt(nonce),
    ]).valueOf()
    // Adjust epoch key size according to epoch tree depth
    const epochKeyModed = epochKey % BigInt(2 ** epochTreeDepth)
    return epochKeyModed
}

const genEpochNullifier = (
    identityNullifier: bigint | string,
    attesterId: bigint | string,
    epoch: number | bigint | string
): bigint => {
    return hash3([BigInt(attesterId), BigInt(epoch), identityNullifier as any])
}

const genGSTLeaf = (
    idNullifier: bigint,
    attesterId: bigint | string,
    epoch: bigint | number,
    posRep: bigint | number,
    negRep: bigint | number
): BigInt => {
    return hash5([
        idNullifier,
        BigInt(attesterId),
        BigInt(epoch),
        BigInt(posRep),
        BigInt(negRep),
    ])
}

export { genEpochKey, genEpochNullifier, genGSTLeaf }
