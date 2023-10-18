import randomf from 'randomf'
import { poseidon2 } from 'poseidon-lite'

/**
 * A decimal string representing the field prime.
 */
export const SNARK_SCALAR_FIELD =
    '21888242871839275222246405745257275088548364400416034343698204186575808495617'
/**
 * A `bigint` representation of the field prime.
 */
export const F = BigInt(SNARK_SCALAR_FIELD)

/**
 * The number of bits in an [epoch key nonce](https://developer.unirep.io/docs/protocol/epoch-key) variable. It is defined as `BigInt(8)`.
 */
export const NONCE_BITS = BigInt(8)
/**
 * The number of bits in an [attester ID](https://developer.unirep.io/docs/protocol/users-and-attesters#attesters-) variable. It is defined as `BigInt(160)`.
 */
export const ATTESTER_ID_BITS = BigInt(160)
/**
 * The number of bits in an [epoch](https://developer.unirep.io/docs/protocol/epoch) variable. It is defined as `BigInt(48)`.
 */
export const EPOCH_BITS = BigInt(48)
/**
 * The number of bits in a chain id variable. It is defined as `BigInt(36)`.
 */
export const CHAIN_ID_BITS = BigInt(36)
/**
 * The number of bits in a reveal nonce variable. It is defined as `BigInt(1)`.
 */
export const REVEAL_NONCE_BITS = BigInt(1)
/**
 * The number of bits in a Rep variable. It is defined as `BigInt(64)`.
 */
export const REP_BITS = BigInt(64)
/**
 * It indicates a one bit variable. It is defined as `BigInt(1)`.
 */
export const ONE_BIT = BigInt(1)
/**
 * A `number` representation of the maximum epoch value. Equivalent to `2**48-1`.
 */
export const MAX_EPOCH = 2 ** Number(EPOCH_BITS) - 1

/**
 * Generate a random `bigint` in the snark finite field.
 * @example
 * ```ts
 * import { genRandomSalt } from '@unirep/utils'
 *
 * // generate random bigint
 * const salt = genRandomSalt()
 * ```
 */
export const genRandomSalt = () => randomf(F)

/**
 * Calculate an [epoch key](https://developer.unirep.io/docs/protocol/epoch-key).
 * @param identitySecret The secret of a user's [Semaphore identity](https://semaphore.pse.dev/).
 * @param attesterId Either an EOA or a smart contract address of an [attester](https://developer.unirep.io/docs/protocol/users-and-attesters#attesters-).
 * @param epoch The epoch information.
 * @param nonce A epoch key nonce chosed by user.
 * @param chainId The current chain id.
 * @returns The epoch key result.
 * @example
 * ```ts
 * import { Identity } from '@semaphore-protocol/identity'
 * import { genEpochKey } from '@unirep/utils'
 *
 * const id = new Identity()
 * const attesterId = '0x1234'
 * const epoch = 0
 * const nonce = 0
 * const chainId = 1
 * const epochKey = genEpochKey(
 *   id.secret,
 *   attesterId,
 *   epoch,
 *   nonce,
 *   chainId
 * )
 * ```
 */
export const genEpochKey = (
    identitySecret: bigint,
    attesterId: bigint | string,
    epoch: bigint | number,
    nonce: bigint | number,
    chainId: bigint | number
): bigint => {
    let accBits = BigInt(0)

    let field = BigInt(attesterId)
    accBits += ATTESTER_ID_BITS

    field += BigInt(2) ** accBits * BigInt(epoch)
    accBits += EPOCH_BITS

    field += BigInt(2) ** accBits * BigInt(nonce)
    accBits += NONCE_BITS

    field += BigInt(2) ** accBits * BigInt(chainId)
    return poseidon2([identitySecret, field])
}

/**
 * Calculate an identity hash for a user. It is used for user signup.
 * The state tree leaf should follow the format: `stateTreeLeaf = H(identityHash, H(data))`
 * where `identityHash = H(identitySecret, attesterId + (epoch << 160) + (chainId << 208))`.
 * @param identitySecret The secret of a user's [Semaphore identity](https://semaphore.pse.dev/).
 * @param attesterId Either an EOA or a smart contract address of an [attester](https://developer.unirep.io/docs/protocol/users-and-attesters#attesters-).
 * @param epoch The epoch information.
 * @param chainId The current chain id.
 * @returns The identity hash.
 * @example
 * ```ts
 * import { Identity } from '@semaphore-protocol/identity'
 * import { genIdentityHash } from '@unirep/utils'
 *
 * const id = new Identity()
 * const attesterId = '0x1234'
 * const epoch = 0
 * const chainId = 1
 * const idHash = genIdentityHash(
 *   id.secret,
 *   attesterId,
 *   epoch,
 *   chainId
 * )
 * ```
 */
export const genIdentityHash = (
    identitySecret: bigint,
    attesterId: bigint | string,
    epoch: bigint | number,
    chainId: bigint | number
): bigint => {
    let accBits = BigInt(0)
    let field = BigInt(attesterId)
    accBits += ATTESTER_ID_BITS

    field += BigInt(2) ** accBits * BigInt(epoch)
    accBits += EPOCH_BITS

    field += BigInt(2) ** accBits * BigInt(chainId)
    return poseidon2([identitySecret, field])
}

/**
 * Calculate a [state tree](https://developer.unirep.io/docs/protocol/trees#state-tree) leaf for a user.
 * @param identitySecret The secret of a user's [Semaphore identity](https://semaphore.pse.dev/).
 * @param attesterId  Either an EOA or a smart contract address of an [attester](https://developer.unirep.io/docs/protocol/users-and-attesters#attesters-).
 * @param epoch The epoch information.
 * @param data The array of user [data](https://developer.unirep.io/docs/protocol/data) in the current epoch.
 * @param chainId The current chain id.
 * @returns The state tree leaf.
 * @example
 * ```ts
 * import { Identity } from '@semaphore-protocol/identity'
 * import { genStateTreeLeaf } from '@unirep/utils'
 *
 * const id = new Identity()
 * const attesterId = '0x1234'
 * const epoch = 0
 * const FIELD_COUNT = 6
 * const data = Array(FIELD_COUNT).fill(0)
 * const chainId = 1
 * const leaf = genStateTreeLeaf(
 *   id.secret,
 *   attesterId,
 *   epoch,
 *   data,
 *   chainId
 * )
 * ```
 */
export const genStateTreeLeaf = (
    identitySecret: bigint,
    attesterId: bigint | string,
    epoch: bigint | number,
    data: (bigint | string | number)[],
    chainId: bigint | number
): bigint => {
    // leaf = H(H(identitySecret, attesterId, epoch, chainId), H(data))
    let hashchain = BigInt(data[0])
    for (const d of data.slice(1)) {
        hashchain = poseidon2([hashchain, d])
    }
    const leafIdentityHash = genIdentityHash(
        identitySecret,
        attesterId,
        epoch,
        chainId
    )
    return poseidon2([leafIdentityHash, hashchain])
}

/**
 * Calculate an epoch tree leaf in an [epoch tree](https://developer.unirep.io/docs/protocol/trees#epoch-tree)
 * @param epochKey The [epoch key](https://developer.unirep.io/docs/protocol/epoch-key) information.
 * @param data The array of [data](https://developer.unirep.io/docs/protocol/data) of the epoch key in the epoch tree.
 * @returns The epoch tree leaf.
 * @example
 * ```ts
 * import { genEpochTreeLeaf } from '@unirep/utils'
 *
 * const epochKey = '0x3456'
 * const FIELD_COUNT = 6
 * const data = Array(FIELD_COUNT).fill(0)
 * const leaf = genEpochTreeLeaf(
 *   epochKey,
 *   data
 * )
 * ```
 */
export const genEpochTreeLeaf = (
    epochKey: bigint | string,
    data: (bigint | string | number)[]
) => {
    let hashchain = BigInt(epochKey)
    for (const d of data) {
        hashchain = poseidon2([hashchain, BigInt(d)])
    }
    return hashchain
}
