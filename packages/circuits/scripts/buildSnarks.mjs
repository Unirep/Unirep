import { stringifyBigInts } from '@unirep/utils'
import fs from 'fs'
import path from 'path'
import * as snarkjs from 'snarkjs'
import url from 'url'
import child_process from 'child_process'
import { circuitContents, ptauName } from './circuits.mjs'
import os from 'os'
import { copyAtomic } from './copyAtomic.mjs'

await import('./downloadPtau.mjs')

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

const outDir = path.join(__dirname, '../zksnarkBuild')
const buildDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'zksnarkBuild-')
)
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

    const inputFileOut = path.join(outDir, `${name}_main.circom`)
    const circuitOut = path.join(outDir, `${name}_main.r1cs`)
    const circuitBuild = path.join(buildDir, `${name}_main.r1cs`)
    const wasmOut = path.join(buildDir, `${name}_main_js/${name}_main.wasm`)
    const wasmOutFinal = path.join(outDir, `${name}.wasm`)
    const zkeyBuild = path.join(buildDir, `${name}.zkey`)
    const vkOutBuild = path.join(buildDir, `${name}.vkey.json`)
    const ptau = path.join(outDir, ptauName)
    const zkey = path.join(outDir, `${name}.zkey`)
    const vkOut = path.join(outDir, `${name}.vkey.json`)

    const circuitOutFileExists = await fs.promises
        .stat(circuitOut)
        .catch(() => false)
    const zkeyOutFileExists = await fs.promises.stat(zkey).catch(() => false)
    const vkeyOutFileExists = await fs.promises.stat(vkOut).catch(() => false)
    const wasmOutFileExists = await fs.promises
        .stat(wasmOutFinal)
        .catch(() => false)

    await fs.promises.writeFile(inputFileOut, circuitContents[name])

    // Check if the circuitOut file exists
    if (circuitOutFileExists && wasmOutFileExists) {
        console.log(
            circuitOut.split('/').pop(),
            'exists. Skipping compilation.'
        )
    } else {
        console.log(`Compiling ${inputFileOut.split('/').pop()}...`)
        // Compile the .circom file
        await new Promise((rs, rj) =>
            child_process.exec(
                `circom --r1cs --wasm -o ${buildDir} ${inputFileOut}`,
                (err, stdout, stderr) => {
                    if (err) rj(err)
                    else rs()
                }
            )
        )
        console.log(
            'Generated',
            circuitOut.split('/').pop(),
            'and',
            wasmOut.split('/').pop()
        )
        await copyAtomic(circuitBuild, circuitOut)
    }

    if (zkeyOutFileExists && vkeyOutFileExists) {
        console.log(zkey.split('/').pop(), 'exists. Skipping compilation.')
    } else {
        console.log('Exporting verification key...')
        await snarkjs.zKey.newZKey(circuitOut, ptau, zkeyBuild)
        const vkeyJson = await snarkjs.zKey.exportVerificationKey(zkeyBuild)
        const S = JSON.stringify(stringifyBigInts(vkeyJson), null, 1)
        await fs.promises.writeFile(vkOutBuild, S)
        console.log(
            `Generated ${zkey.split('/').pop()} and ${vkOut.split('/').pop()}`
        )
        const info = await snarkjs.r1cs.info(circuitOut)
        console.log(`Circuit constraints: ${info.nConstraints}`)
    }
    if (!wasmOutFileExists) await copyAtomic(wasmOut, wasmOutFinal)
    if (!vkeyOutFileExists) await copyAtomic(vkOutBuild, vkOut)
    if (!zkeyOutFileExists) await copyAtomic(zkeyBuild, zkey)
}

process.exit(0)
