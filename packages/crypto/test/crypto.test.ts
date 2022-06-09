import { expect } from 'chai'
import { poseidon } from 'circomlibjs'
import {
    genRandomSalt,
    hash5,
    hashOne,
    hashLeftRight,
    stringifyBigInts,
    unstringifyBigInts,
    HashFunction,
} from '../src'

describe('crypto utils', function () {
    it('genRandomSalt', () => {
        const salt = genRandomSalt()
        expect(typeof salt).equal('bigint')
    })

    it('HashFunction', () => {
        const values = [BigInt(1)]
        const returnValue = genRandomSalt()
        const hashF: HashFunction = (values): BigInt => {
            return returnValue
        }
        const hash = hash5(hashF, values)
        expect(hash).equal(returnValue)
    })

    it('hash5', () => {
        const values: BigInt[] = []
        const elementNum = Math.ceil(Math.random() * 5)
        for (let num = 0; num < elementNum; num++) {
            values.push(genRandomSalt())
        }
        const hash = hash5(poseidon, values)
        expect(typeof hash).equal('bigint')
    })

    it('hashOne', () => {
        const value = genRandomSalt()
        const hash = hashOne(poseidon, value)
        expect(typeof hash).equal('bigint')
    })

    it('hashLeftRight', () => {
        const leftValue = genRandomSalt()
        const rightValue = genRandomSalt()
        const hash = hashLeftRight(poseidon, leftValue, rightValue)
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
