import { expect } from 'chai'
import {
    genRandomNumber,
    hash5,
    hashOne,
    hashLeftRight,
    stringifyBigInts,
    unstringifyBigInts,
} from '../src'

describe('crypto utils', function () {
    it('genRandomNumber', () => {
        const salt = genRandomNumber()
        expect(typeof salt).equal('bigint')
    })

    it('hash5', () => {
        const values: bigint[] = []
        const elementNum = Math.ceil(Math.random() * 5)
        for (let num = 0; num < elementNum; num++) {
            values.push(genRandomNumber())
        }
        const hash = hash5(values)
        expect(typeof hash).equal('bigint')
    })

    it('hashOne', () => {
        const value = genRandomNumber()
        const hash = hashOne(value)
        expect(typeof hash).equal('bigint')
    })

    it('hashLeftRight', () => {
        const leftValue = genRandomNumber()
        const rightValue = genRandomNumber()
        const hash = hashLeftRight(leftValue, rightValue)
        expect(typeof hash).equal('bigint')
    })

    it('stringifyBigInts/unstringifyBigInts', () => {
        const values = {
            input1: genRandomNumber(),
            input2: genRandomNumber(),
            input3: genRandomNumber(),
        }
        // BigInt in JSON object cannot be stringify by JSON.stringify function
        expect(() => JSON.stringify(values)).to.throw(TypeError)

        // stringify BigInt elements with stringifyBigInts function
        const stringifiedValues = stringifyBigInts(values)
        // it can be recoverd by unstringifyBigInts function
        const unstringifiedValues = unstringifyBigInts(stringifiedValues)
        expect(unstringifiedValues).deep.equal(values)
    })
})
