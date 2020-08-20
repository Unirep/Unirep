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
    let circuit

    const NUM_ELEMENT = 10
    let elements: SnarkBigInt[] = []
    let cur = 0, result, selectors: number[] = []

    let resultNotMatchRegExp: RegExp

    before(async () => {
        circuit = await compileAndLoadCircuit('test/verifyHashChain_test.circom')

        for (let i = 0; i < NUM_ELEMENT; i++) {
            const element = genRandomSalt()
            const sel = Math.floor(Math.random() * 2)
            selectors.push(sel)
            elements.push(element)
            if ( sel == 1) {
                cur = hashLeftRight(element, cur)
            }
        }
        result = hashLeftRight(1, cur)
    })

    it('correctly verify hash chain', async () => {
        const circuitInputs = {
            in_rest: elements,
            selectors: selectors,
            result: result
        }

        const witness = circuit.calculateWitness(circuitInputs)
        expect(circuit.checkWitness(witness)).to.be.true
    })

    it('verify incorrect elements should fail', async () => {
        elements.reverse()
        const circuitInputs = {
            in_rest: elements,
            selectors: selectors,
            result: result
        }

        resultNotMatchRegExp = RegExp('.+ -> ' + result + ' != .+$')
        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw(resultNotMatchRegExp)
        elements.reverse()
    })

    it('verify with incorrect selectors should fail', async () => {
        const wrongSelectors = selectors.slice()
        // Flip one of the selector
        const indexWrongSelector = Math.floor(Math.random() * NUM_ELEMENT)
        wrongSelectors[indexWrongSelector] = wrongSelectors[indexWrongSelector] ? 0 : 1
        const circuitInputs = {
            in_rest: elements,
            selectors: wrongSelectors,
            result: result
        }

        resultNotMatchRegExp = RegExp('.+ -> ' + result + ' != .+$')
        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw(resultNotMatchRegExp)
    })

    it('verify incorrect number of elements should fail', async () => {
        const signalNotAssignedRegExp = RegExp('^Input Signal not assigned:.+')
        const circuitInputs = {
            in_rest: elements.slice(1),
            selectors: selectors,
            result: result
        }

        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw(signalNotAssignedRegExp)
    })

    it('verify incorrect result should fail', async () => {
        const incorrectResult = genRandomSalt()
        const circuitInputs = {
            in_rest: elements,
            selectors: selectors,
            result: incorrectResult
        }

        const invalidResultRegExp = RegExp('.+ -> ' + incorrectResult + ' != .+$')
        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw(invalidResultRegExp)
    })
})