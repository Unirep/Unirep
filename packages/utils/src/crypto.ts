import randomf from 'randomf'
import { poseidon2, poseidon4 } from 'poseidon-lite'

export const SNARK_SCALAR_FIELD =
    '21888242871839275222246405745257275088548364400416034343698204186575808495617'
export const F = BigInt(SNARK_SCALAR_FIELD)

export const MAX_EPOCH = 2 ** 48 - 1

export const genRandomSalt = () => randomf(F)

export const modexp = (v: bigint, p: number): bigint => {
    let o = BigInt(1)
    for (let x = 0; x < p; x++) {
        o = (BigInt(o) * BigInt(v)) % BigInt(SNARK_SCALAR_FIELD)
    }
    return o
}

export const R_X = (R: bigint, n: number) => {
    const Rx = [] as bigint[]
    let _R = BigInt(1)
    for (let x = 0; x < n; x++) {
        _R = (_R * R) % BigInt(SNARK_SCALAR_FIELD)
        Rx.push(_R)
    }
    return Rx
}

export const genEpochKey = (
    identitySecret: bigint,
    attesterId: bigint | string,
    epoch: bigint | number,
    nonce: bigint | number
): bigint => {
    return poseidon4([
        identitySecret,
        BigInt(attesterId),
        BigInt(epoch),
        BigInt(nonce),
    ])
}

export const genStateTreeLeaf = (
    idSecret: bigint,
    attesterId: bigint | string,
    epoch: bigint | number,
    data: (bigint | string | number)[]
): bigint => {
    let hashchain = BigInt(0)
    for (const d of data) {
        hashchain = poseidon2([hashchain, BigInt(d)])
    }
    return poseidon4([idSecret, BigInt(attesterId), BigInt(epoch), hashchain])
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
