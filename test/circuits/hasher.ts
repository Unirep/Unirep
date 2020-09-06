import chai from "chai"

const { expect } = chai

import {
    compileAndLoadCircuit,
} from './utils'

import {
    stringifyBigInts,
    genRandomSalt,
    hashLeftRight,
} from 'maci-crypto'

describe('Poseidon hash circuits', () => {

    it('correctly hashes two random values', async () => {
        const circuit = await compileAndLoadCircuit('test/hashleftright_test.circom')

        const left = genRandomSalt()
        const right = genRandomSalt()

        const circuitInputs = stringifyBigInts({ left, right })

        const witness = circuit.calculateWitness(circuitInputs, true)
        expect(circuit.checkWitness(witness)).to.be.true

        const outputIdx = circuit.getSignalIdx('main.hash')
        const output = witness[outputIdx]

        const outputJS = hashLeftRight(left, right)

        expect(output.toString()).equal(outputJS.toString())
    })
})