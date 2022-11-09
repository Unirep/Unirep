import { expect } from 'chai'
import {
    genRandomSalt,
    hash5,
    hashOne,
    hashLeftRight,
    stringifyBigInts,
    unstringifyBigInts,
} from '../src'

describe('crypto utils', function () {
    it('genRandomSalt', () => {
        const salt = genRandomSalt()
        expect(typeof salt).equal('bigint')
    })

    it('hash5', () => {
        const elements = Array(5)
            .fill(null)
            .map(() => genRandomSalt().valueOf())
        const hash = hash5(elements)
        expect(typeof hash).equal('bigint')
    })

    it('hashOne', () => {
        const value = genRandomSalt()
        const hash = hashOne(value)
        expect(typeof hash).equal('bigint')
    })

    it('hashLeftRight', () => {
        const leftValue = genRandomSalt()
        const rightValue = genRandomSalt()
        const hash = hashLeftRight(leftValue, rightValue)
        expect(typeof hash).equal('bigint')
    })

    it('stringifyBigInts/unstringifyBigInts', () => {
        const values = {
            input1: genRandomSalt(),
            input2: genRandomSalt(),
            input3: genRandomSalt(),
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
