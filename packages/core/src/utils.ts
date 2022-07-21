import {
    hash5,
    hash3,
    hashLeftRight,
    SparseMerkleTree,
    SnarkBigInt,
    stringifyBigInts,
    unstringifyBigInts,
} from '@unirep/crypto'

import Reputation from './Reputation'
import {
    EPOCH_KEY_NULLIFIER_DOMAIN,
    REPUTATION_NULLIFIER_DOMAIN,
} from '../config/nullifierDomainSeparator'
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
 * Default user state tree leaf is defined by `hash(posRep=0, negRep=0, graffiti=0, signUp=0)`
 */
const defaultUserStateLeaf = hash5([
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
    BigInt(0),
])

/**
 * Definition of default epoch tree leaf
 */
const SMT_ONE_LEAF = hashLeftRight(BigInt(1), BigInt(0))

/**
 * Compute the empty user state tree root where the default leaves are `defaultUserStateLeaf`
 * @param treeDepth The depth of the user state tree
 * @returns The root of the user state tree
 */
const computeEmptyUserStateRoot = (treeDepth: number): BigInt => {
    const t = new SparseMerkleTree(treeDepth, defaultUserStateLeaf)
    return t.root
}

/**
 * Compute the user state tree root with given attester ID and airdrop positive reputation
 * @param treeDepth The depth of the user state tree
 * @param leafIdx The attester ID, which is the index of the user state tree.
 * @param airdropPosRep The airdrop positive reputation that is set by the attester
 * @returns The root of the user state tree
 */
const computeInitUserStateRoot = (
    treeDepth: number,
    leafIdx?: number,
    airdropPosRep: number = 0
): BigInt => {
    const t = new SparseMerkleTree(treeDepth, defaultUserStateLeaf)
    if (typeof leafIdx === 'number' && leafIdx > 0) {
        const airdropReputation = new Reputation(
            BigInt(airdropPosRep),
            BigInt(0),
            BigInt(0),
            BigInt(1)
        )
        const leafValue = airdropReputation.hash()
        t.update(BigInt(leafIdx), leafValue)
    }
    return t.root
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
    identityNullifier: SnarkBigInt,
    epoch: number,
    nonce: number,
    epochTreeDepth: number = EPOCH_TREE_DEPTH
): SnarkBigInt => {
    const values: any[] = [identityNullifier, epoch, nonce]
    let epochKey = hash3(values).valueOf()
    // Adjust epoch key size according to epoch tree depth
    const epochKeyModed = epochKey % BigInt(2 ** epochTreeDepth)
    return epochKeyModed
}

/**
 * Compute the epoch key nullifier of given identity, epoch and nonce. The epoch key
 * nullifiers are used to prevent double user state transition.
 * @param identityNullifier The identity nullifier of the semaphore identity
 * @param epoch The epoch of the epoch key
 * @param nonce The nonce of the epoch key
 * @returns The epoch key nullifier
 */
const genEpochKeyNullifier = (
    identityNullifier: SnarkBigInt,
    epoch: number,
    nonce: number
): SnarkBigInt => {
    return hash5([
        EPOCH_KEY_NULLIFIER_DOMAIN,
        identityNullifier,
        BigInt(epoch),
        BigInt(nonce),
        BigInt(0),
    ])
}

/**
 * Compute the reputation nullifier of given identity, epoch, nonce and attester ID.
 * The reputation nullifiers are used to prevent double spending of reputation.
 * @param identityNullifier The identity nullifier of the semaphore identity
 * @param epoch The epoch of the epoch key
 * @param nonce The nonce of the epoch key
 * @param attesterId The attester ID of the reputation
 * @returns The reputation nullifier
 */
const genReputationNullifier = (
    identityNullifier: SnarkBigInt,
    epoch: number,
    nonce: number,
    attesterId: BigInt
): SnarkBigInt => {
    return hash5([
        REPUTATION_NULLIFIER_DOMAIN,
        identityNullifier,
        BigInt(epoch),
        BigInt(nonce),
        attesterId,
    ])
}

export {
    defaultUserStateLeaf,
    SMT_ONE_LEAF,
    computeEmptyUserStateRoot,
    computeInitUserStateRoot,
    formatProofForSnarkjsVerification,
    genEpochKey,
    genEpochKeyNullifier,
    genReputationNullifier,
}
