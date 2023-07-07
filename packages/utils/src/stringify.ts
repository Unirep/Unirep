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
