import { stringifyBigInts } from '@unirep/crypto'
import fs from 'fs'
import path from 'path'
import circom from 'circom'
import * as snarkjs from 'snarkjs'
import * as fastFile from 'fastfile'
import url from 'url'
import https from 'https'
import readline from 'readline'
import {
    NUM_ATTESTATIONS_PER_PROOF,
    MAX_REPUTATION_BUDGET,
    USER_STATE_TREE_DEPTH,
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
} from '../dist/config/index.js'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

const outDir = path.join(__dirname, '../zksnarkBuild')
await fs.promises.mkdir(outDir, { recursive: true })

// download the ptau file if we need to
const ptau = path.join(outDir, 'powersOfTau28_hez_final_17.ptau')
const ptauExists = await fs.promises.stat(ptau).catch(() => false)
if (!ptauExists) {
    // download to a temporary file and then move it into place
    const tmp = path.join(outDir, 'ptau.download.tmp')
    await fs.promises.unlink(tmp).catch(() => {})
    await new Promise((rs, rj) => {
        const logPercent = (p) => {
            readline.clearLine(process.stdout, 0)
            readline.cursorTo(process.stdout, 0)
            process.stdout.write(`Downloading ptau file, please wait... ${p}%`)
        }
        const file = fs.createWriteStream(tmp, { flags: 'w' })
        logPercent(0)
        https.get(
            'https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_17.ptau',
            (res) => {
                const { statusCode } = res
                const contentLength = res.headers['content-length']
                if (statusCode !== 200) {
                    return rj(
                        `Received non-200 status code from ptau url: ${statusCode}`
                    )
                }
                let totalReceived = 0
                const logTimer = setInterval(() => {
                    logPercent(
                        Math.floor((100 * totalReceived) / contentLength)
                    )
                }, 1000)
                res.on('data', (chunk) => {
                    file.write(chunk)
                    totalReceived += chunk.length
                })
                res.on('error', (err) => {
                    clearInterval(logTimer)
                    rj(err)
                })
                res.on('end', () => {
                    file.end()
                    clearInterval(logTimer)
                    logPercent(100)
                    console.log()
                    rs()
                })
            }
        )
    })
    await fs.promises.rename(tmp, ptau)
}

const circuitContents = {
    verifyEpochKey: `include "../circuits/verifyEpochKey.circom" \n\ncomponent main = VerifyEpochKey(${GLOBAL_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH})`,
    proveReputation: `include "../circuits/proveReputation.circom" \n\ncomponent main = ProveReputation(${GLOBAL_STATE_TREE_DEPTH}, ${USER_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, ${MAX_REPUTATION_BUDGET}, 252)`,
    proveUserSignUp: `include "../circuits/proveUserSignUp.circom" \n\ncomponent main = ProveUserSignUp(${GLOBAL_STATE_TREE_DEPTH}, ${USER_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH})`,
    startTransition: `include "../circuits/startTransition.circom" \n\ncomponent main = StartTransition(${GLOBAL_STATE_TREE_DEPTH})`,
    processAttestations: `include "../circuits/processAttestations.circom" \n\ncomponent main = ProcessAttestations(${USER_STATE_TREE_DEPTH}, ${NUM_ATTESTATIONS_PER_PROOF}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH})`,
    userStateTransition: `include "../circuits/userStateTransition.circom" \n\ncomponent main = UserStateTransition(${GLOBAL_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${USER_STATE_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH})`,
}

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

process.exit()
