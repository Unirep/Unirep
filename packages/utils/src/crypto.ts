import randomf from 'randomf'
import poseidon from 'poseidon-lite'
export { poseidon }

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

export const [, hash1, hash2, hash3, hash4, hash5, hash6, hash7, hash8] = Array(
    9
)
    .fill(null)
    .map((_, i) => (inputs) => {
        if (!Array.isArray(inputs))
            throw new Error(
                `@unirep/utils invalid hash${i} input, expected array`
            )
        if (inputs.length !== i)
            throw new Error(`@unirep/utils invalid hash${i} input length`)
        return poseidon(inputs)
    })

export const hashLeftRight = (input1: any, input2: any) =>
    hash2([input1, input2])
export const hashOne = (input: any) => hash1([input])

export const genEpochKey = (
    identitySecret: bigint,
    attesterId: bigint | string,
    epoch: bigint | number,
    nonce: bigint | number
): bigint => {
    return hash4([identitySecret, BigInt(attesterId), epoch, BigInt(nonce)])
}

export const genStateTreeLeaf = (
    idSecret: bigint,
    attesterId: bigint | string,
    epoch: bigint | number,
    data: (bigint | string | number)[]
): bigint => {
    let hashchain = BigInt(0)
    for (const d of data) {
        hashchain = hash2([hashchain, d])
    }
    return hash4([idSecret, BigInt(attesterId), BigInt(epoch), hashchain])
}

export const genEpochTreeLeaf = (
    epochKey: bigint | string,
    data: (bigint | string | number)[]
) => {
    let hashchain = epochKey
    for (const d of data) {
        hashchain = hash2([hashchain, d])
    }
    return hashchain
}
