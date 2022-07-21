import {
    SNARK_FIELD_SIZE,
    SnarkBigInt,
    genRandomSalt,
    hash5,
    hashOne,
    hashLeftRight,
    stringifyBigInts,
    unstringifyBigInts,
} from 'maci-crypto'
import circom from 'circomlib'

export const hash3 = (inputs) => {
    if (inputs.length !== 3)
        throw new Error('@unirep/crypto invalid hash3 input length')
    return circom.poseidon(inputs)
}

export {
    SNARK_FIELD_SIZE,
    SnarkBigInt,
    genRandomSalt,
    hash5,
    hashOne,
    hashLeftRight,
    stringifyBigInts,
    unstringifyBigInts,
}
