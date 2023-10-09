// Little endian Uint8Array to BigInt
function fromLE(arr: any): BigInt {
    let val = BigInt(0)
    let base = BigInt(1)
    for (const byte of arr) {
        val = val + base * BigInt(byte)
        base = base * BigInt(256)
    }
    return val
}

/**
 * @see https://developer.unirep.io/docs/utils-api/helpers#stringifybigints
 * @param o an object with `bigint`, an array of `bigint`s, or a `bigint`.
 * @returns stringified object, an array of string, or a string.
 */
export function stringifyBigInts(o: any): any {
    if (typeof o == 'bigint' || o.eq !== undefined) {
        return o.toString(10)
    } else if (o instanceof Uint8Array) {
        return fromLE(o)
    } else if (Array.isArray(o)) {
        return o.map(stringifyBigInts)
    } else if (typeof o == 'object') {
        const res = {}
        const keys = Object.keys(o)
        keys.forEach((k) => {
            res[k] = stringifyBigInts(o[k])
        })
        return res
    } else {
        return o
    }
}

/**
 * @see https://developer.unirep.io/docs/utils-api/helpers#unstringifybigints
 * @param o stringified object, an array of string, or a string.
 * @returns an object with `bigint`, an array of `bigint`s, or a `bigint`.
 */
export function unstringifyBigInts(o: any): any {
    if (typeof o == 'string' && /^[0-9]+$/.test(o)) {
        return BigInt(o)
    } else if (typeof o == 'string' && /^0x[0-9a-fA-F]+$/.test(o)) {
        return BigInt(o)
    } else if (Array.isArray(o)) {
        return o.map(unstringifyBigInts)
    } else if (typeof o == 'object') {
        if (o === null) return null
        const res = {}
        const keys = Object.keys(o)
        keys.forEach((k) => {
            res[k] = unstringifyBigInts(o[k])
        })
        return res
    } else {
        return o
    }
}
