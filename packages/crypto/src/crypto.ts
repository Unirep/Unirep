import {
    SNARK_FIELD_SIZE,
    genRandomSalt,
    stringifyBigInts,
    unstringifyBigInts,
} from 'maci-crypto'
import circom from 'circomlib'

export const [, hash1, hash2, hash3, hash4, hash5] = Array(6)
    .fill(null)
    .map((_, i) => (inputs) => {
        if (!Array.isArray(inputs))
            throw new Error(
                `@unirep/crypto invalid hash${i} input, expected array`
            )
        if (inputs.length !== i)
            throw new Error(`@unirep/crypto invalid hash${i} input length`)
        return circom.poseidon(inputs)
    })

export const hashLeftRight = (input1: any, input2: any) =>
    hash2([input1, input2])
export const hashOne = (input: any) => hash1([input])

export { SNARK_FIELD_SIZE, genRandomSalt, stringifyBigInts, unstringifyBigInts }

export const genEpochKey = (
    identityNullifier: bigint,
    attesterId: bigint | string,
    epoch: bigint | number,
    nonce: bigint | number,
    maxEpochKey: bigint | number
): bigint => {
    const epochKey = hash4([
        identityNullifier as any,
        BigInt(attesterId),
        epoch,
        BigInt(nonce),
    ]).valueOf()
    // Adjust epoch key size according to epoch tree depth
    const epochKeyModed = epochKey % BigInt(maxEpochKey)
    return epochKeyModed
}

export const genEpochNullifier = (
    identityNullifier: bigint,
    attesterId: bigint | string,
    epoch: number | bigint
): bigint => {
    return hash3([BigInt(attesterId), BigInt(epoch), identityNullifier as any])
}

export const genStateTreeLeaf = (
    idNullifier: bigint,
    attesterId: bigint | string,
    epoch: bigint | number,
    posRep: bigint | number,
    negRep: bigint | number
): BigInt => {
    return hash5([
        idNullifier,
        BigInt(attesterId),
        BigInt(epoch),
        BigInt(posRep),
        BigInt(negRep),
    ])
}
