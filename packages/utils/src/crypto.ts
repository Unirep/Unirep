import {
    genRandomSalt as _genRandomSalt,
    stringifyBigInts,
    unstringifyBigInts,
} from 'maci-crypto'
import poseidon from 'poseidon-lite'
export { poseidon }

export const SNARK_SCALAR_FIELD =
    '21888242871839275222246405745257275088548364400416034343698204186575808495617'

export const OMT_R = poseidon([
    BigInt(
        `0x${Buffer.from('unirep_omt_polysum_constant', 'utf8').toString(
            'hex'
        )}`
    ),
])

export const EPK_R = poseidon([
    BigInt(
        `0x${Buffer.from('unirep_epk_polysum_constant', 'utf8').toString(
            'hex'
        )}`
    ),
])

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
export const genRandomSalt = () => _genRandomSalt() as bigint

export { stringifyBigInts, unstringifyBigInts }

export const genEpochKey = (
    identitySecret: bigint,
    attesterId: bigint | string,
    epoch: bigint | number,
    nonce: bigint | number
): bigint => {
    return hash4([identitySecret, BigInt(attesterId), epoch, BigInt(nonce)])
}

export const genUserStateTransitionNullifier = (
    identitySecret: bigint,
    attesterId: bigint | string,
    epoch: number | bigint | number
): bigint => {
    return hash3([BigInt(attesterId), BigInt(epoch), identitySecret])
}

export const genEpochNullifier = (
    ...args: [
        identitySecret: bigint,
        attesterId: bigint | string,
        epoch: number | bigint | number
    ]
) => {
    console.warn('@unirep/utils:genEpochNullifier is deprecated')
    console.warn('Use @unirep/utils:genUserStateTransitionNullifier instead')
    return genUserStateTransitionNullifier(...args)
}

export const modexp = (v: bigint, p: number): bigint => {
    let o = BigInt(1)
    for (let x = 0; x < p; x++) {
        o = (BigInt(o) * BigInt(v)) % BigInt(SNARK_SCALAR_FIELD)
    }
    return o
}

export const genStateTreeLeaf = (
    idSecret: bigint,
    attesterId: bigint | string,
    epoch: bigint | number,
    data: (bigint | string)[]
): bigint => {
    const hashedData = data.map((d) => hash1([d]))
    let polysum = BigInt(0)
    for (let x = 0; x < data.length; x++) {
        const term =
            (BigInt(hashedData[x]) * modexp(EPK_R, x + 1)) %
            BigInt(SNARK_SCALAR_FIELD)
        polysum = (polysum + term) % BigInt(SNARK_SCALAR_FIELD)
    }
    return hash4([idSecret, BigInt(attesterId), BigInt(epoch), polysum])
}

export const genEpochTreeLeaf = (
    epochKey: bigint | string,
    data: (bigint | string)[]
) => {
    const hashedData = data.map((d) => hash1([d]))
    let polysum = (hash1([epochKey]) * EPK_R) % BigInt(SNARK_SCALAR_FIELD)
    for (let x = 0; x < data.length; x++) {
        const term =
            (BigInt(hashedData[x]) * modexp(EPK_R, x + 2)) %
            BigInt(SNARK_SCALAR_FIELD)
        polysum = (polysum + term) % BigInt(SNARK_SCALAR_FIELD)
    }
    return polysum
}
