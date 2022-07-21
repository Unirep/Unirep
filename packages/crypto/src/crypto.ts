import {
    SNARK_FIELD_SIZE,
    SnarkBigInt,
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

export {
    SNARK_FIELD_SIZE,
    SnarkBigInt,
    genRandomSalt,
    stringifyBigInts,
    unstringifyBigInts,
}
