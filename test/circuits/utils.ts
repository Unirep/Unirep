import * as fs from 'fs'
import * as path from 'path'
import { SnarkProof } from 'libsemaphore'
const circom = require('circom')
const snarkjs = require('snarkjs')
import * as shell from 'shelljs'

import {
    stringifyBigInts,
    unstringifyBigInts,
} from 'maci-crypto'


/*
 * @param circuitPath The subpath to the circuit file (e.g.
 *     test/batchProcessMessage_test.circom)
 */
const compileAndLoadCircuit = async (
    circuitPath: string
) => {
    const circuit = await circom.tester(path.join(
        __dirname,
        `../../circuits/${circuitPath}`,
    ))

    await circuit.loadSymbols()

    return circuit
}

const executeCircuit = async (
    circuit: any,
    inputs: any,
) => {

    const witness = await circuit.calculateWitness(inputs, true)
    await circuit.checkConstraints(witness)
    await circuit.loadSymbols()

    return witness
}

const getSignalByName = (
    circuit: any,
    witness: any,
    signal: string,
) => {

    return witness[circuit.symbols[signal].varIdx]
}

const genVerifyEpochKeyProofAndPublicSignals = (
    inputs: any,
    circuit?: any
) => {
    return genProofAndPublicSignals(
        inputs,
        '/test/verifyEpochKey_test.circom',
        'verifyEpochKey.wasm',
        'verifyEpochKey.zkey',
        circuit,
    )
}

const genQvtProofAndPublicSignals = (
    inputs: any,
    circuit?: any,
) => {
    return genProofAndPublicSignals(
        inputs,
        'prod/quadVoteTally.circom',
        'qvt.wasm',
        'qvt.zkey',
        circuit,
    )
}

const genProofAndPublicSignals = async (
    inputs: any,
    circuitFilename: string,
    circuitWasmFilename: string,
    zkeyFilename: string,
    circuit?: any,
) => {
    const date = Date.now()
    const zkeyPath = path.join(__dirname, '../../build/', zkeyFilename)
    const circuitWasmPath = path.join(__dirname, '../../build/', circuitWasmFilename)
    const inputJsonPath = path.join(__dirname, '../../build/' + date + '.input.json')
    const witnessPath = path.join(__dirname, '../../build/' + date + '.witness.wtns')
    const witnessJsonPath = path.join(__dirname, '../../build/' + date + '.witness.json')
    const proofPath = path.join(__dirname, '../../build/' + date + '.proof.json')
    const publicJsonPath = path.join(__dirname, '../../build/' + date + '.publicSignals.json')

    fs.writeFileSync(inputJsonPath, JSON.stringify(stringifyBigInts(inputs)))

    if (!circuit) {
        circuit = await compileAndLoadCircuit(circuitFilename)
    }

    const snarkjsCmd = 'node ' + path.join(__dirname, '../../node_modules/snarkjs/build/cli.cjs')
    const witnessCmd = `${snarkjsCmd} wc ${circuitWasmPath} ${inputJsonPath} ${witnessPath}`

    shell.exec(witnessCmd)

    const witnessJsonCmd = `${snarkjsCmd} wej ${witnessPath} ${witnessJsonPath}`
    shell.exec(witnessJsonCmd)

    const proveCmd = `${snarkjsCmd} g16p ${zkeyPath} ${witnessPath} ${proofPath} ${publicJsonPath}`

    shell.exec(proveCmd)

    const witness = unstringifyBigInts(JSON.parse(fs.readFileSync(witnessJsonPath).toString()))
    const publicSignals = unstringifyBigInts(JSON.parse(fs.readFileSync(publicJsonPath).toString()))
    const proof = JSON.parse(fs.readFileSync(proofPath).toString())

    await circuit.checkConstraints(witness)

    shell.rm('-f', witnessPath)
    shell.rm('-f', witnessJsonPath)
    shell.rm('-f', proofPath)
    shell.rm('-f', publicJsonPath)
    shell.rm('-f', inputJsonPath)

    return { proof, publicSignals, witness, circuit }
}

const verifyProof = async (
    vkFilename: string,
    proof: any,
    publicSignals: any,
): Promise<boolean> => {
    const vkFilepath = path.join(__dirname, '../../build/', vkFilename)
    const vk = JSON.parse(fs.readFileSync(vkFilepath).toString())

    return await snarkjs.groth16.verify(vk, publicSignals, proof)
}

const verifyEPKProof = (
    proof: any,
    publicSignals: any,
) => {

    return verifyProof('verifyEpochKeyVk.json', proof, publicSignals)
}

const verifyQvtProof = (
    proof: any,
    publicSignals: any,
) => {

    return verifyProof('qvtVk.json', proof, publicSignals)
}

const formatProofForVerifierContract = (
    _proof: SnarkProof,
) => {

    return ([
        _proof.pi_a[0],
        _proof.pi_a[1],
        _proof.pi_b[0][1],
        _proof.pi_b[0][0],
        _proof.pi_b[1][1],
        _proof.pi_b[1][0],
        _proof.pi_c[0],
        _proof.pi_c[1],
    ]).map((x) => x.toString())
}

export {
    compileAndLoadCircuit,
    executeCircuit,
    formatProofForVerifierContract,
    getSignalByName,
    genVerifyEpochKeyProofAndPublicSignals,
    genQvtProofAndPublicSignals,
    verifyEPKProof,
    verifyQvtProof,
    genProofAndPublicSignals,
    verifyProof,
}