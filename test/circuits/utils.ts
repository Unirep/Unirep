import * as fs from 'fs'
import * as path from 'path'
import { Circuit } from 'snarkjs'
const compiler = require('circom')

/*
 * @param circuitPath The subpath to the circuit file (e.g.
 *     test/batchProcessMessage_test.circom)
 */
const compileAndLoadCircuit = async (
    circuitPath: string
) => {
    const circuitDef = await compiler(path.join(
        __dirname,
        `../../circuits/${circuitPath}`,
    ))
    return new Circuit(circuitDef)
}

export {
    compileAndLoadCircuit,
}