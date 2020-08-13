import chai from "chai"

const { expect } = chai

import {
    compileAndLoadCircuit,
} from './utils'

import {
    genRandomSalt,
    hashLeftRight,
    SnarkBigInt,
} from 'maci-crypto'

describe('Hash chain circuit', () => {

    it('correctly verify hash chain', async () => {
        const circuit = await compileAndLoadCircuit('test/verifyHashChain_test.circom')

        const NUM_ELEMENT = 10
        const elements: SnarkBigInt[] = []
        let cur = 0, result
        for (let i = 0; i < NUM_ELEMENT; i++) {
            const element = genRandomSalt()
            elements.push(element)
            cur = hashLeftRight(element, cur)
        }
        result = cur

        const circuitInputs = {
            in_first: 0,
            in_rest: elements,
            result: result
        }

        const witness = circuit.calculateWitness(circuitInputs)
        expect(circuit.checkWitness(witness)).to.be.true
    })

    it('verify incorrect hash chain should fail', async () => {
        const circuit = await compileAndLoadCircuit('test/verifyHashChain_test.circom')

        const NUM_ELEMENT = 10
        const elements: SnarkBigInt[] = []
        let cur = 0, result, circuitInputs
        for (let i = 0; i < NUM_ELEMENT; i++) {
            const element = genRandomSalt()
            elements.push(element)
            cur = hashLeftRight(element, cur)
        }
        result = cur

        // Verify against incorrect first element
        const incorrectFirstIn = genRandomSalt()
        circuitInputs = {
            in_first: incorrectFirstIn,
            in_rest: elements,
            result: result
        }

        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw()

        // Verify against incorrect elements
        elements.reverse()
        circuitInputs = {
            in_first: 0,
            in_rest: elements,
            result: result
        }

        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw()
        elements.reverse()

        // Verify against incorrect number of elements
        circuitInputs = {
            in_first: elements[0],
            in_rest: elements.slice(1),
            result: result
        }

        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw()

        // Verify against incorrect result
        const incorrectResult = genRandomSalt()
        circuitInputs = {
            in_first: 0,
            in_rest: elements,
            result: incorrectResult
        }

        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw()
    })
})