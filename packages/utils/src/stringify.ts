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
 * Stringify all `bigint`s in an object, a string, or an array.
 * @param o An object with `bigint`, an array of `bigint`s, or a `bigint`.
 * @returns Stringified object, an array of string, or a string.
 * @example
 * ```ts
 * import { stringifyBigInts } from '@unirep/utils'
 *
 * stringifyBigInts(BigInt(3))
 * // '3'
 *
 * stringifyBigInts([BigInt(3)])
 * // ['3']
 *
 * stringifyBigInts({
 *  item: BigInt(3)
 * })
 * // { item: '3' }
 * ```
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
 * Unstringify all `string`s in an object, a string, or an array to `bigint`s
 * @param o Stringified object, an array of string, or a string.
 * @returns An object with `bigint`, an array of `bigint`s, or a `bigint`.
 * @example
 * ```ts
 * import { unstringifyBigInts } from '@unirep/utils'
 *
 * const values = {
 *  input1: '1',
 *  input2: '2',
 *  input3: '3',
 * }
 *
 * unstringifyBigInts(values)
 * // { input1: 1n, input2: 2n, input3: 3n }
 * ```
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
