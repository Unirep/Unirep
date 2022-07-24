import { stringifyBigInts } from '@unirep/crypto'
import fs from 'fs'
import path from 'path'
import circom from 'circom'
import * as snarkjs from 'snarkjs'
import * as fastFile from 'fastfile'
import url from 'url'
import https from 'https'
import readline from 'readline'
import child_process from 'child_process'
import { circuitContents } from './circuits.mjs'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

await import('./downloadPtau.mjs')

const outDir = path.join(__dirname, '../zksnarkBuild')
await fs.promises.mkdir(outDir, { recursive: true })

// pass a space separated list of circuit names to this executable
const [, , ...circuits] = process.argv
if (circuits.length === 0) {
    // if no arguments build all
    circuits.push(...Object.keys(circuitContents))
}

for (const name of circuits) {
    if (!circuitContents[name])
        throw new Error(`Unknown circuit name: "${name}"`)

    await fs.promises.writeFile(
        path.join(outDir, `${name}_main.circom`),
        circuitContents[name]
    )

    const inputFile = path.join(outDir, `${name}_main.circom`)
    const circuitOut = path.join(outDir, `${name}.r1cs`)
    const symOut = path.join(outDir, `${name}.sym`)
    const wasmOut = path.join(outDir, `${name}.wasm`)
    const ptau = path.join(outDir, `powersOfTau28_hez_final_17.ptau`)
    const zkey = path.join(outDir, `${name}.zkey`)
    const vkOut = path.join(outDir, `${name}.vkey.json`)

    // Check if the circuitOut file exists
    const circuitOutFileExists = await fs.promises
        .stat(circuitOut)
        .catch(() => false)
    if (circuitOutFileExists) {
        console.log(
            circuitOut.split('/').pop(),
            'exists. Skipping compilation.'
        )
    } else {
        console.log(`Compiling ${inputFile.split('/').pop()}...`)
        // Compile the .circom file
        const options = {
            wasmFile: await fastFile.createOverride(wasmOut),
            r1csFileName: circuitOut,
            symWriteStream: fs.createWriteStream(symOut),
        }
        await circom.compiler(inputFile, options)
        console.log(
            'Generated',
            circuitOut.split('/').pop(),
            'and',
            wasmOut.split('/').pop()
        )
    }

    const zkeyOutFileExists = await fs.promises.stat(zkey).catch(() => false)
    if (zkeyOutFileExists) {
        console.log(zkey.split('/').pop(), 'exists. Skipping compilation.')
    } else {
        console.log('Exporting verification key...')
        await snarkjs.zKey.newZKey(circuitOut, ptau, zkey)
        const vkeyJson = await snarkjs.zKey.exportVerificationKey(zkey)
        const S = JSON.stringify(stringifyBigInts(vkeyJson), null, 1)
        await fs.promises.writeFile(vkOut, S)
        console.log(
            `Generated ${zkey.split('/').pop()} and ${vkOut.split('/').pop()}`
        )
    }
}

process.exit(0)
