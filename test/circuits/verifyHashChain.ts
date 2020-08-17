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
    let cur = 0, result

    let resultNotMatchRegExp: RegExp

    before(async () => {
        circuit = await compileAndLoadCircuit('test/verifyHashChain_test.circom')

        for (let i = 0; i < NUM_ELEMENT; i++) {
            const element = genRandomSalt()
            elements.push(element)
            cur = hashLeftRight(element, cur)
        }
        result = cur
    })

    it('correctly verify hash chain', async () => {
        const circuitInputs = {
            in_first: 0,
            in_rest: elements,
            result: result
        }

        const witness = circuit.calculateWitness(circuitInputs)
        expect(circuit.checkWitness(witness)).to.be.true
    })

    it('verify incorrect first element should fail', async () => {
        const incorrectFirstIn = genRandomSalt()
        const circuitInputs = {
            in_first: incorrectFirstIn,
            in_rest: elements,
            result: result
        }

        resultNotMatchRegExp = RegExp('.+ -> ' + result + ' !=.+$')
        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw(resultNotMatchRegExp)
    })

    it('verify incorrect elements should fail', async () => {
        elements.reverse()
        const circuitInputs = {
            in_first: 0,
            in_rest: elements,
            result: result
        }

        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw(resultNotMatchRegExp)
        elements.reverse()
    })

    it('verify incorrect number of elements should fail', async () => {
        const signalNotAssignedRegExp = RegExp('^Input Signal not assigned:.+')
        const circuitInputs = {
            in_first: elements[0],
            in_rest: elements.slice(1),
            result: result
        }

        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw(signalNotAssignedRegExp)
    })

    it('verify incorrect result should fail', async () => {
        const incorrectResult = genRandomSalt()
        const circuitInputs = {
            in_first: 0,
            in_rest: elements,
            result: incorrectResult
        }

        const invalidResultRegExp = RegExp('.+ -> .+ != ' + result + '$')
        expect(() => {
            circuit.calculateWitness(circuitInputs)
        }).to.throw(invalidResultRegExp)
    })
})