import randomf from 'randomf'
import { poseidon2 } from 'poseidon-lite'

export const SNARK_SCALAR_FIELD =
    '21888242871839275222246405745257275088548364400416034343698204186575808495617'
export const F = BigInt(SNARK_SCALAR_FIELD)

export const MAX_EPOCH = 2 ** 48 - 1
export const NONCE_BITS = 8
export const ATTESTER_ID_BITS = 160
export const EPOCH_BITS = 48
export const CHAIN_ID_BITS = 36
export const REVEAL_NONCE_BITS = 1

export const genRandomSalt = () => randomf(F)

export const genEpochKey = (
    identitySecret: bigint,
    attesterId: bigint | string,
    epoch: bigint | number,
    nonce: bigint | number,
    chainId: bigint | number
): bigint => {
    const field =
        BigInt(attesterId) +
        BigInt(2) ** BigInt(ATTESTER_ID_BITS) * BigInt(epoch) +
        BigInt(2) ** BigInt(ATTESTER_ID_BITS + EPOCH_BITS) * BigInt(nonce) +
        BigInt(2) ** BigInt(ATTESTER_ID_BITS + EPOCH_BITS + NONCE_BITS) *
            BigInt(chainId)
    return poseidon2([identitySecret, field])
}

export const genIdentityHash = (
    idSecret: bigint,
    attesterId: bigint | string,
    epoch: bigint | number,
    chainId: bigint | number
): bigint => {
    const field =
        BigInt(attesterId) +
        BigInt(2) ** BigInt(ATTESTER_ID_BITS) * BigInt(epoch) +
        BigInt(2) ** BigInt(ATTESTER_ID_BITS + EPOCH_BITS) * BigInt(chainId)
    return poseidon2([idSecret, field])
}

export const genStateTreeLeaf = (
    idSecret: bigint,
    attesterId: bigint | string,
    epoch: bigint | number,
    data: (bigint | string | number)[],
    chainId: bigint | number
): bigint => {
    // leaf = H(H(idSecret, attesterId, epoch, chainId), H(data))
    let hashchain = BigInt(data[0])
    for (const d of data.slice(1)) {
        hashchain = poseidon2([hashchain, d])
    }
    const leafIdentityHash = genIdentityHash(
        idSecret,
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
