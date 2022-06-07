import * as path from 'path'
import { expect } from 'chai'
import {
    stringifyBigInts,
    genRandomSalt,
    hashLeftRight,
    hash5,
} from '@unirep/crypto'

import { UnirepCircuit } from './utils'
import { exportBuildPath } from './config'

const hasher5CircuitPath = path.join(exportBuildPath,'hasher5_test.circom')
const hashleftrightCircuitPath = path.join(exportBuildPath, 'hashleftright_test.circom')

describe('Poseidon hash circuits', function () {
    this.timeout(100000)
    let circuit

    describe('Hasher5', () => {
        it('correctly hashes 5 random values', async () => {
            circuit = await UnirepCircuit.compileAndLoadCircuit(
                hasher5CircuitPath
            )
            const preImages: any = []
            for (let i = 0; i < 5; i++) {
                preImages.push(genRandomSalt())
            }

            const circuitInputs = stringifyBigInts({
                in: preImages,
            })

            const witness = await UnirepCircuit.executeCircuit(
                circuit,
                circuitInputs
            )
            const output = UnirepCircuit.getSignalByName(
                circuit,
                witness,
                'main.hash'
            )

            const outputJS = hash5(preImages)

            expect(output.toString()).equal(outputJS.toString())
        })
    })

    describe('HashLeftRight', () => {
        it('correctly hashes two random values', async () => {
            const circuit = await UnirepCircuit.compileAndLoadCircuit(
                hashleftrightCircuitPath
            )

            const left = genRandomSalt()
            const right = genRandomSalt()

            const circuitInputs = stringifyBigInts({ left, right })

            const witness = await UnirepCircuit.executeCircuit(
                circuit,
                circuitInputs
            )
            const output = UnirepCircuit.getSignalByName(
                circuit,
                witness,
                'main.hash'
            )

            const outputJS = hashLeftRight(left, right)

            expect(output.toString()).equal(outputJS.toString())
        })
    })
})
