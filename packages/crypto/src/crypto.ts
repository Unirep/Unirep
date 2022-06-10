import assert from 'assert'
import crypto from 'crypto'
const { stringifyBigInts, unstringifyBigInts } = require('ffjavascript').utils

import { poseidon } from './poseidon'

// Copy from maci-crypto@0.9.1

type SnarkBigInt = bigint
type Plaintext = bigint[]

// The BN254 group order p
const SNARK_FIELD_SIZE = BigInt(
    '21888242871839275222246405745257275088548364400416034343698204186575808495617'
)

// Hash up to 2 elements
const poseidonT3 = (inputs: bigint[]) => {
    assert(inputs.length === 2)
    return poseidon(inputs)
}

// Hash up to 5 elements
const poseidonT6 = (inputs: bigint[]) => {
    assert(inputs.length === 5)
    return poseidon(inputs)
}

const hashN = (numElements: number, elements: Plaintext): bigint => {
    const elementLength = elements.length
    if (elements.length > numElements) {
        throw new TypeError(
            `the length of the elements array should be at most ${numElements}; got ${elements.length}`
        )
    }
    const elementsPadded = elements.slice()
    if (elementLength < numElements) {
        for (let i = elementLength; i < numElements; i++) {
            elementsPadded.push(BigInt(0))
        }
    }

    const funcs = {
        2: poseidonT3,
        5: poseidonT6,
    }

    return funcs[numElements](elements)
}

/**
 * Hash 5 BigInts with the Poseidon hash function
 * @param preImage The preImage of the hash
 */
const hash5 = (elements: Plaintext): bigint => {
    const elementLength = elements.length
    if (elements.length > 5) {
        throw new Error(
            `elements length should not greater than 5, got ${elements.length}`
        )
    }
    const elementsPadded = elements.slice()
    if (elementLength < 5) {
        for (let i = elementLength; i < 5; i++) {
            elementsPadded.push(BigInt(0))
        }
    }
    return poseidonT6(elementsPadded)
}

/**
 * Hash a single BigInt with the Poseidon hash function
 * @param hash The poseidon hash function
 * @param preImage The preImage of the hash
 */
const hashOne = (preImage: bigint): bigint => hashN(2, [preImage, BigInt(0)])

/**
 * Hash two BigInts with the Poseidon hash function
 * @param left The first element to be hashed
 * @param right The seconde element to be hashed
 */
const hashLeftRight = (left: bigint, right: bigint): bigint =>
    hashN(2, [left, right])

/**
 * Compute a random BigInt within SNARK_FIELD_SIZE
 * @return A random BigInt salt.
 */
const genRandomNumber = (): bigint => {
    const rand = BigInt('0x' + crypto.randomBytes(32).toString('hex'))
    const modRand: bigint = rand % SNARK_FIELD_SIZE
    assert(modRand < SNARK_FIELD_SIZE)
    return modRand
}

export {
    SNARK_FIELD_SIZE,
    SnarkBigInt,
    genRandomNumber,
    hash5,
    hashOne,
    hashLeftRight,
    stringifyBigInts,
    unstringifyBigInts,
}
