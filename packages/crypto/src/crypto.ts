import assert from 'assert'
import crypto from 'crypto'
const { stringifyBigInts, unstringifyBigInts } = require('ffjavascript').utils

import { poseidon } from './poseidon'

// Copy from maci-crypto@0.9.1

type SnarkBigInt = BigInt
type PrivKey = BigInt
type Plaintext = BigInt[]

// The BN254 group order p
const SNARK_FIELD_SIZE = BigInt(
    '21888242871839275222246405745257275088548364400416034343698204186575808495617'
)

// Hash up to 2 elements
const poseidonT3 = (inputs: BigInt[]) => {
    assert(inputs.length === 2)
    return poseidon(inputs)
}

// Hash up to 5 elements
const poseidonT6 = (inputs: BigInt[]) => {
    assert(inputs.length === 5)
    return poseidon(inputs)
}

const hashN = (numElements: number, elements: Plaintext): BigInt => {
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
const hash5 = (elements: Plaintext): BigInt => {
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
const hashOne = (preImage: BigInt): BigInt => hashN(2, [preImage, BigInt(0)])

/**
 * Hash two BigInts with the Poseidon hash function
 * @param left The first element to be hashed
 * @param right The seconde element to be hashed
 */
const hashLeftRight = (left: BigInt, right: BigInt): BigInt =>
    hashN(2, [left, right])

/*
 * Returns a BabyJub-compatible random value. We create it by first generating
 * a random value (initially 256 bits large) modulo the snark field size as
 * described in EIP197. This results in a key size of roughly 253 bits and no
 * more than 254 bits. To prevent modulo bias, we then use this efficient
 * algorithm:
 * http://cvsweb.openbsd.org/cgi-bin/cvsweb/~checkout~/src/lib/libc/crypt/arc4random_uniform.c
 * @return A BabyJub-compatible random value.
 */
const genRandomBabyJubValue = (): BigInt => {
    // Prevent modulo bias
    //const lim = BigInt('0x10000000000000000000000000000000000000000000000000000000000000000')
    //const min = (lim - SNARK_FIELD_SIZE) % SNARK_FIELD_SIZE
    const min = BigInt(
        '6350874878119819312338956282401532410528162663560392320966563075034087161851'
    )

    let rand
    while (true) {
        rand = BigInt('0x' + crypto.randomBytes(32).toString('hex'))

        if (rand >= min) {
            break
        }
    }

    const privKey: PrivKey = rand % SNARK_FIELD_SIZE
    assert(privKey < SNARK_FIELD_SIZE)

    return privKey
}

/**
 * Compute a random BigInt
 * @return A BabyJub-compatible salt.
 */
const genRandomSalt = (): BigInt => {
    return genRandomBabyJubValue()
}

export {
    SNARK_FIELD_SIZE,
    SnarkBigInt,
    genRandomSalt,
    hash5,
    hashOne,
    hashLeftRight,
    stringifyBigInts,
    unstringifyBigInts,
}
