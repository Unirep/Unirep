import randomf from 'randomf'
import { poseidon2 } from 'poseidon-lite'

export const SNARK_SCALAR_FIELD =
    '21888242871839275222246405745257275088548364400416034343698204186575808495617'
export const F = BigInt(SNARK_SCALAR_FIELD)

export const MAX_EPOCH = 2 ** 48 - 1
export const NONCE_BITS = BigInt(8)
export const ATTESTER_ID_BITS = BigInt(160)
export const EPOCH_BITS = BigInt(48)
export const CHAIN_ID_BITS = BigInt(36)
export const REVEAL_NONCE_BITS = BigInt(1)
export const REP_BITS = BigInt(64)
export const ONE_BIT = BigInt(1)

export const genRandomSalt = () => randomf(F)

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
