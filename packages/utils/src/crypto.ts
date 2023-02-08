import {
    SNARK_FIELD_SIZE,
    genRandomSalt as _genRandomSalt,
    stringifyBigInts,
    unstringifyBigInts,
} from 'maci-crypto'
import poseidon from 'poseidon-lite'
export { poseidon }

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

export { SNARK_FIELD_SIZE, stringifyBigInts, unstringifyBigInts }

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

export const genStateTreeLeaf = (
    idSecret: bigint,
    attesterId: bigint | string,
    epoch: bigint | number,
    posRep: bigint | number,
    negRep: bigint | number,
    graffiti: bigint | number,
    timestamp: bigint | number
): bigint => {
    return hash7([
        idSecret,
        BigInt(attesterId),
        BigInt(epoch),
        BigInt(posRep),
        BigInt(negRep),
        BigInt(graffiti),
        BigInt(timestamp),
    ])
}
