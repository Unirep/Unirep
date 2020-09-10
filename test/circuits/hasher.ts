import chai from "chai"

const { expect } = chai

import {
    compileAndLoadCircuit,
    executeCircuit,
    getSignalByName,
} from './utils'

import {
    stringifyBigInts,
    genRandomSalt,
    hashLeftRight,
    hash5,
} from 'maci-crypto'

describe('Poseidon hash circuits', () => {
    let circuit

    describe('Hasher5', () => {
        it('correctly hashes 5 random values', async () => {
            circuit = await compileAndLoadCircuit('test/hasher5_test.circom')
            const preImages: any = []
            for (let i = 0; i < 5; i++) {
                preImages.push(genRandomSalt())
            }

            const circuitInputs = stringifyBigInts({
                in: preImages,
            })

            const witness = await executeCircuit(circuit, circuitInputs)
            const output = getSignalByName(circuit, witness, 'main.hash')

            const outputJS = hash5(preImages)

            expect(output.toString()).equal(outputJS.toString())
        })
    })

    describe('HashLeftRight', () => {

        it('correctly hashes two random values', async () => {
            const circuit = await compileAndLoadCircuit('test/hashleftright_test.circom')

            const left = genRandomSalt()
            const right = genRandomSalt()

            const circuitInputs = stringifyBigInts({ left, right })

            const witness = await executeCircuit(circuit, circuitInputs)
            const output = getSignalByName(circuit, witness, 'main.hash')

            const outputJS = hashLeftRight(left, right)

            expect(output.toString()).equal(outputJS.toString())
        })
    })
})