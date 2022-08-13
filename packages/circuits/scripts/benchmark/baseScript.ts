/**
 * Ideas:
 * - create main circom for test/benchmark
 */

import { mkdtempSync, writeFileSync } from 'fs'
import * as fastFile from 'fastfile'
import path, { resolve } from 'path'
import * as circom from 'circom'
import * as snarkjs from 'snarkjs'
import * as crypto from '@unirep/crypto'

async function executeTimeOf(
    name: string,
    circomComponent: string,
    inputs: any
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

    return Promise.resolve(BigInt(0))
}

const tmpContent = `
template Equal() {
    signal input a;
    signal output b;
    a === b;
}
component main = Equal();
`

executeTimeOf('tmp', tmpContent, undefined)
    .then((ans) => console.log(ans))
    .catch((e) => console.log(e))
