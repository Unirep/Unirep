/* eslint-disable @typescript-eslint/no-var-requires */
import { stringifyBigInts } from '@unirep/crypto'
import * as fs from 'fs'
import * as path from 'path'
const compiler = require('circom').compiler
const snarkjs = require('snarkjs')
const fastFile = require('fastfile')

import { exportBuildPath, overrideCircuit, ptau } from './config'
import { CircuitName } from '../src'

const fileExists = (filepath: string): boolean => {
    return fs.existsSync(filepath)
}

const main = async (): Promise<number> => {
    const override = overrideCircuit
    for (const circuit of Object.keys(CircuitName)) {
        const buildPath = exportBuildPath
        const circomFile = path.join(buildPath, `${circuit}_main.circom`)
        const R1CSFile = path.join(buildPath, `${circuit}.r1cs`)
        const symFile = path.join(buildPath, `${circuit}.sym`)
        const wasmFile = path.join(buildPath, `${circuit}.wasm`)
        const zkey = path.join(buildPath, `${circuit}.zkey`)
        const vkey = path.join(buildPath, `${circuit}.vkey.json`)

        // Check if the input circom file exists
        const inputFileExists = fileExists(circomFile)

        // Exit if it does not
        if (!inputFileExists) {
            console.error('File does not exist:', circomFile)
            return 1
        }

        // Check if the circuitOut file exists and if we should not override files
        const circuitOutFileExists = fileExists(R1CSFile)

        if (!override && circuitOutFileExists) {
            console.log(R1CSFile, 'exists. Skipping compilation.')
        } else {
            console.log(`Compiling ${circomFile}...`)
            // Compile the .circom file
            const options = {
                wasmFile: await fastFile.createOverride(wasmFile),
                r1csFileName: R1CSFile,
                symWriteStream: fs.createWriteStream(symFile),
            }
            await compiler(circomFile, options)
            console.log('Generated', R1CSFile, 'and', wasmFile)
        }

        const zkeyOutFileExists = fileExists(zkey)
        if (!override && zkeyOutFileExists) {
            console.log(zkey, 'exists. Skipping compilation.')
        } else {
            console.log('Exporting verification key...')
            await snarkjs.zKey.newZKey(R1CSFile, ptau, zkey)
            const vkeyJson = await snarkjs.zKey.exportVerificationKey(zkey)
            const S = JSON.stringify(stringifyBigInts(vkeyJson), null, 1)
            await fs.promises.writeFile(vkey, S)
            console.log(`Generated ${zkey} and ${vkey}`)
        }
    }

    return 0
}

void (async () => {
    let exitCode
    try {
        exitCode = await main()
    } catch (err) {
        console.error(err)
        exitCode = 1
    }
    process.exit(exitCode)
})()
