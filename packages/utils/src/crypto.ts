import randomf from 'randomf'
import { poseidon2 } from 'poseidon-lite'

/**
 * https://developer.unirep.io/docs/utils-api/helpers#snark_scalar_field
 */
export const SNARK_SCALAR_FIELD =
    '21888242871839275222246405745257275088548364400416034343698204186575808495617'

/**
 * https://developer.unirep.io/docs/utils-api/helpers#f
 */
export const F = BigInt(SNARK_SCALAR_FIELD)

// TODO: add doc
/**
 * The number of bits in an [epoch key nonce](https://developer.unirep.io/docs/protocol/epoch-key) variable. It is defined as `BigInt(8)`.
 */
export const NONCE_BITS = BigInt(8)

// TODO: add doc
/**
 * The number of bits in an [attester ID](https://developer.unirep.io/docs/next/protocol/users-and-attesters#attesters-) variable. It is defined as `BigInt(160)`.
 */
export const ATTESTER_ID_BITS = BigInt(160)

// TODO: add doc
/**
 * The number of bits in an [epoch](https://developer.unirep.io/docs/next/protocol/epoch) variable. It is defined as `BigInt(48)`.
 */
export const EPOCH_BITS = BigInt(48)

// TODO: add doc
/**
 * The number of bits in a chain id variable. It is defined as `BigInt(36)`.
 */
export const CHAIN_ID_BITS = BigInt(36)

// TODO: add doc
/**
 * The number of bits in a reveal nonce variable. It is defined as `BigInt(1)`.
 */
export const REVEAL_NONCE_BITS = BigInt(1)

// TODO: add doc
/**
 * The number of bits in a Rep variable. It is defined as `BigInt(64)`.
 */
export const REP_BITS = BigInt(64)

// TODO: add doc
/**
 * It indicates a one bit variable. It is defined as `BigInt(1)`.
 */
export const ONE_BIT = BigInt(1)

/**
 * https://developer.unirep.io/docs/utils-api/helpers#max_epoch
 */
export const MAX_EPOCH = 2 ** Number(EPOCH_BITS) - 1

// TODO: add doc
/**
 * Generate a random bigint number in the snark finite field.
 */
export const genRandomSalt = () => randomf(F)

/**
 * https://developer.unirep.io/docs/utils-api/helpers#genepochkey
 * @param identitySecret The secret of a user's [Semaphore identity](https://semaphore.pse.dev/).
 * @param attesterId Either an EOA or a smart contract address of an [attester](https://developer.unirep.io/docs/next/protocol/users-and-attesters#attesters-).
 * @param epoch Current epoch information.
 * @param nonce A given nonce of the epoch key.
 * @param chainId The current chain id.
 * @returns The epoch key result.
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
 * https://developer.unirep.io/docs/utils-api/helpers#genidentityhash
 * @param identitySecret The secret of a user's [Semaphore identity](https://semaphore.pse.dev/).
 * @param attesterId Either an EOA or a smart contract address of an [attester](https://developer.unirep.io/docs/next/protocol/users-and-attesters#attesters-).
 * @param epoch Current epoch information.
 * @param chainId The current chain id.
 * @returns The identity hash result.
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
 * https://developer.unirep.io/docs/utils-api/helpers#genstatetreeleaf
 * @param identitySecret The secret of a user's [Semaphore identity](https://semaphore.pse.dev/).
 * @param attesterId Either an EOA or a smart contract address of an [attester](https://developer.unirep.io/docs/next/protocol/users-and-attesters#attesters-).
 * @param epoch Current epoch information.
 * @param data The [data](https://developer.unirep.io/docs/protocol/data) the user has in the current epoch.
 * @param chainId The current chain id.
 * @returns The state tree leaf.
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
 * https://developer.unirep.io/docs/utils-api/helpers#genepochtreeleaf
 * @param epochKey The [epoch key]([data](https://developer.unirep.io/docs/protocol/epoch-key) in the epoch tree.
 * @param data The [data](https://developer.unirep.io/docs/protocol/data) of the epoch key in the epoch tree.
 * @returns The epoch tree leaf.
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
