import { expect } from 'chai'
import assert from 'assert'
import { stringifyBigInts, unstringifyBigInts } from '../src'

// convert a bigint to Uint8Array little endian
function toLE(int) {
    let val = int
    const arr = [] as any
    for (;;) {
        const rem = val % BigInt(256)
        val = val / BigInt(256)
        arr.push(rem)
        if (val === BigInt(0)) break
    }
    return new Uint8Array(arr.map((n) => Number(n)))
}

describe('Bigint Serialization', function () {
    it('should serialize and deserialize an object', async () => {
        const obj = {
            a: BigInt(124120012581024192490),
            b: [
                BigInt(124128491248124812948),
                BigInt(2148182912849182418942891),
            ],
            c: {
                a: [
                    BigInt(124128491248124812948222),
                    BigInt(21481829128491824189428922221),
                ],
                b: {
                    a: BigInt(1249102401249),
                },
            },
        }
        assert.deepEqual(obj, unstringifyBigInts(stringifyBigInts(obj)))
    })

    it('should serialize and deserialize variable types', async () => {
        const obj = {
            a: BigInt(124120012581024192490),
            b: [
                BigInt(124128491248124812948),
                BigInt(2148182912849182418942891),
            ],
            c: {
                a: [
                    BigInt(124128491248124812948222),
                    BigInt(21481829128491824189428922221),
                ],
                b: {
                    a: BigInt(1249102401249),
                },
            },
        }
        const obj2 = {
            a: '0x' + BigInt(124120012581024192490).toString(16),
            b: [
                BigInt(124128491248124812948).toString(),
                BigInt(2148182912849182418942891),
            ],
            c: {
                a: [
                    toLE(BigInt(124128491248124812948222)),
                    BigInt(21481829128491824189428922221),
                ],
                b: {
                    a: BigInt(1249102401249),
                },
            },
        }
        assert.deepEqual(obj, unstringifyBigInts(stringifyBigInts(obj2)))
    })
})
