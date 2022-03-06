import * as path from 'path'
import { genRandomSalt, hashLeftRight, SnarkBigInt, } from "@unirep/crypto"
import { executeCircuit, } from "../circuits/utils"
import { compileAndLoadCircuit, throwError } from './utils'

const sealedHashChainCircuitPath = path.join(__dirname, '../circuits/test/verifyHashChain_test.circom')

describe('Hash chain circuit', function () {
    this.timeout(30000)
    let circuit

    const NUM_ELEMENT = 10
    let elements: SnarkBigInt[] = []
    let cur: BigInt = BigInt(0), result, selectors: number[] = []

    before(async () => {
        circuit = await compileAndLoadCircuit(sealedHashChainCircuitPath)

        for (let i = 0; i < NUM_ELEMENT; i++) {
            const element = genRandomSalt()
            const sel = Math.floor(Math.random() * 2)
            selectors.push(sel)
            elements.push(element)
            if ( sel == 1) {
                cur = hashLeftRight(element, cur)
            }
        }
        result = hashLeftRight(BigInt(1), cur)
    })

    it('correctly verify hash chain', async () => {
        const circuitInputs = {
            hashes: elements,
            selectors: selectors,
            result: result
        }

        await executeCircuit(circuit, circuitInputs)
    })

    it('verify incorrect elements should fail', async () => {
        elements.reverse()
        const circuitInputs = {
            hashes: elements,
            selectors: selectors,
            result: result
        }

        await throwError(circuit, circuitInputs, "Wrong hashes should throw error")
        elements.reverse()
    })

    it('verify with incorrect selectors should fail', async () => {
        const wrongSelectors = selectors.slice()
        // Flip one of the selector
        const indexWrongSelector = Math.floor(Math.random() * NUM_ELEMENT)
        wrongSelectors[indexWrongSelector] = wrongSelectors[indexWrongSelector] ? 0 : 1
        const circuitInputs = {
            hashes: elements,
            selectors: wrongSelectors,
            result: result
        }

        await throwError(circuit, circuitInputs, "Wrong selectors should throw error")
    })

    it('verify incorrect number of elements should fail', async () => {
        const circuitInputs = {
            hashes: elements.slice(1),
            selectors: selectors,
            result: result
        }

        await throwError(circuit, circuitInputs, "Wrong number of hashes should throw error")
    })

    it('verify incorrect result should fail', async () => {
        const incorrectResult = genRandomSalt()
        const circuitInputs = {
            hashes: elements,
            selectors: selectors,
            result: incorrectResult
        }

        await throwError(circuit, circuitInputs, "Wrong hash chain result should throw error")
    })
})