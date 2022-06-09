import { expect } from 'chai'
import { poseidon } from "circomlibjs"
import {
    genRandomSalt,
    hash5,
    hashOne,
    hashLeftRight,
    stringifyBigInts,
    unstringifyBigInts,
} from '../src'

describe('crypto utils', function () {
    it('genRandomSalt', async () => {
        const salt = genRandomSalt()
        expect(typeof salt).equal('bigint')
    })

    it('hash5', async () => {
        const values: BigInt[] = []
        const elementNum = Math.ceil(Math.random() * 5)
        for (let num = 0; num < elementNum; num++) {
            values.push(genRandomSalt())
        }
        const hash = hash5(poseidon, values)
        expect(typeof hash).equal('bigint')
    })

    it('hashOne', async () => {
        const value = genRandomSalt()
        const hash = hashOne(poseidon, value)
        expect(typeof hash).equal('bigint')
    })

    it('hashLeftRight', async () => {
        const leftValue = genRandomSalt()
        const rightValue = genRandomSalt()
        const hash = hashLeftRight(poseidon, leftValue, rightValue)
        expect(typeof hash).equal('bigint')
    })

    it('stringifyBigInts/unstringifyBigInts', async () => {
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
