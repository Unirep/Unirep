/**
 * Ideas:
 * - create main circom for test/benchmark
 */

import { mkdtempSync, writeFileSync } from 'fs'
import * as fastFile from 'fastfile'
import path from 'path'
import * as circom from 'circom'
import * as snarkjs from 'snarkjs'

async function executeTimeOf(
    name: string,
    circomComponent: string,
    genInputFn: any
): Promise<bigint> {
    // create tmp folder to store circom compile files.
    const tmpPath = mkdtempSync('/tmp/unirep')

    const circomPath = path.join(
        __dirname,
        '../../zksnarkBuild/benchmark.circom'
    )
    const r1cs = path.join(tmpPath, `${name}.r1cs`)
    const zkey = path.join(tmpPath, `${name}.zkey`)
    const wasmOut = path.join(tmpPath, `${name}.wasm`)

    console.log(r1cs)
    writeFileSync(circomPath, circomComponent)

    const options = {
        wasmFile: await fastFile.createOverride(wasmOut),
        r1csFileName: r1cs,
    }

    // compile circom file
    await circom.compiler(circomPath, options)

    const ptau = path.join(
        __dirname,
        '../../zksnarkBuild/powersOfTau28_hez_final_17.ptau'
    )

    await snarkjs.zKey.newZKey(r1cs, ptau, zkey)
    const vkeyJson = await snarkjs.zKey.exportVerificationKey(zkey)

    const NUMBER_CASE = 10
    let totalTime = 0
    for (let no = -1; no <= NUMBER_CASE; ++no) {
        const inputs = genInputFn()
        const start = performance.now()
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            inputs,
            wasmOut,
            zkey
        )

        if (no > -1) {
            totalTime += +performance.now() - start
        }
        const isValid = await snarkjs.groth16.verify(
            vkeyJson,
            publicSignals,
            proof
        )
        if (!isValid) throw new Error('invalid')
    }
    return Promise.resolve(BigInt(Math.floor(totalTime / NUMBER_CASE)))
}
