import * as fs from 'fs'
import assert from 'assert'
import lineByLine from 'n-readlines'
import * as path from 'path'
import { SnarkProof } from 'libsemaphore'
const circom = require('circom')
import * as shell from 'shelljs'

import {
    stringifyBigInts,
    unstringifyBigInts,
} from 'maci-crypto'

const zkutilPath = "~/.cargo/bin/zkutil"
const buildPath = "../build"

/*
 * @param circuitPath The subpath to the circuit file (e.g.
 *     test/userStateTransition_test.circom)
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

const getSignalByNameViaSym = (
    circuitName: any,
    witness: any,
    signal: string,
) => {
    const symPath = path.join(__dirname, buildPath, `${circuitName}.sym`)
    const liner = new lineByLine(symPath)
    let line
    let index
    let found = false

    while (true) {
        line = liner.next()
        debugger
        if (!line) { break }
        const s = line.toString().split(',')
        if (signal === s[3]) {
            index = s[1]
            found = true
            break
        }
    }

    assert(found)

    return witness[index]
}

const genVerifyEpochKeyProofAndPublicSignals = (
    inputs: any,
) => {
    return genProofAndPublicSignals(
        inputs,
        '/test/verifyEpochKey_test.circom',
        'verifyEpochKeyCircuit.r1cs',
        'verifyEpochKey.wasm',
        'verifyEpochKey.params',
        false,
    )
}

const genVerifyUserStateTransitionProofAndPublicSignals = (
    inputs: any,
) => {
    return genProofAndPublicSignals(
        inputs,
        '/test/userStateTransition_test.circom',
        'userStateTransitionCircuit.r1cs',
        'userStateTransition.wasm',
        'userStateTransition.params',
        false,
    )
}

const genVerifyReputationProofAndPublicSignals = (
    inputs: any,
) => {
    return genProofAndPublicSignals(
        inputs,
        '/test/proveReputation_test.circom',
        'proveReputationCircuit.r1cs',
        'proveReputation.wasm',
        'proveReputation.params',
        false,
    )
}

const genVerifyReputationFromAttesterProofAndPublicSignals = (
    inputs: any,
) => {
    return genProofAndPublicSignals(
        inputs,
        '/test/proveReputationFromAttester_test.circom',
        'proveReputationFromAttesterCircuit.r1cs',
        'proveReputationFromAttester.wasm',
        'proveReputationFromAttester.params',
        false,
    )
}

const genProofAndPublicSignals = async (
    inputs: any,
    circuitFilename: string,
    circuitR1csFilename: string,
    circuitWasmFilename: string,
    paramsFilename: string,
    compileCircuit = true,
) => {
    const date = Date.now()
    const paramsPath = path.join(__dirname, buildPath, paramsFilename)
    const circuitR1csPath = path.join(__dirname, buildPath, circuitR1csFilename)
    const circuitWasmPath = path.join(__dirname, buildPath, circuitWasmFilename)
    const inputJsonPath = path.join(__dirname, buildPath + date + '.input.json')
    const witnessPath = path.join(__dirname, buildPath + date + '.witness.wtns')
    const witnessJsonPath = path.join(__dirname, buildPath + date + '.witness.json')
    const proofPath = path.join(__dirname, buildPath + date + '.proof.json')
    const publicJsonPath = path.join(__dirname, buildPath + date + '.publicSignals.json')

    fs.writeFileSync(inputJsonPath, JSON.stringify(stringifyBigInts(inputs)))

    let circuit
     if (compileCircuit) {	
         circuit = await compileAndLoadCircuit(circuitFilename)	
     }

    const snarkjsCmd = 'node ' + path.join(__dirname, '../node_modules/snarkjs/build/cli.cjs')
    const witnessCmd = `${snarkjsCmd} wc ${circuitWasmPath} ${inputJsonPath} ${witnessPath}`

    shell.exec(witnessCmd)

    const witnessJsonCmd = `${snarkjsCmd} wej ${witnessPath} ${witnessJsonPath}`
    shell.exec(witnessJsonCmd)

    const proveCmd = `${zkutilPath} prove -c ${circuitR1csPath} -p ${paramsPath} -w ${witnessJsonPath} -r ${proofPath} -o ${publicJsonPath}`

    shell.exec(proveCmd)

    const witness = unstringifyBigInts(JSON.parse(fs.readFileSync(witnessJsonPath).toString()))
    const publicSignals = unstringifyBigInts(JSON.parse(fs.readFileSync(publicJsonPath).toString()))
    const proof = JSON.parse(fs.readFileSync(proofPath).toString())

    shell.rm('-f', witnessPath)
    shell.rm('-f', witnessJsonPath)
    shell.rm('-f', proofPath)
    shell.rm('-f', publicJsonPath)
    shell.rm('-f', inputJsonPath)

    return { circuit, proof, publicSignals, witness }
}

const verifyProof = async (
    paramsFilename: string,
    proofFilename: string,
    publicSignalsFilename: string,
): Promise<boolean> => {
    const paramsPath = path.join(__dirname, buildPath, paramsFilename)
    const proofPath = path.join(__dirname, buildPath, proofFilename)
    const publicSignalsPath = path.join(__dirname, buildPath, publicSignalsFilename)

    const verifyCmd = `${zkutilPath} verify -p ${paramsPath} -r ${proofPath} -i ${publicSignalsPath}`
    const output = shell.exec(verifyCmd).stdout.trim()

    shell.rm('-f', proofPath)
    shell.rm('-f', publicSignalsPath)

    return output === 'Proof is correct'
}

const verifyEPKProof = (
    proof: any,
    publicSignals: any,
) => {
    const date = Date.now().toString()
    const proofFilename = `${date}.verifyEpochKey.proof.json`
    const publicSignalsFilename = `${date}.verifyEpochKey.publicSignals.json`

    fs.writeFileSync(
        path.join(__dirname, buildPath, proofFilename),
        JSON.stringify(
            stringifyBigInts(proof)
        )
    )

    fs.writeFileSync(
        path.join(__dirname, buildPath, publicSignalsFilename),
        JSON.stringify(
            stringifyBigInts(publicSignals)
        )
    )

    return verifyProof('verifyEpochKey.params', proofFilename, publicSignalsFilename)
}

const verifyUserStateTransitionProof = (
    proof: any,
    publicSignals: any,
) => {
    const date = Date.now().toString()
    const proofFilename = `${date}.userStateTransition.proof.json`
    const publicSignalsFilename = `${date}.userStateTransition.publicSignals.json`

    fs.writeFileSync(
        path.join(__dirname, buildPath, proofFilename),
        JSON.stringify(
            stringifyBigInts(proof)
        )
    )

    fs.writeFileSync(
        path.join(__dirname, buildPath, publicSignalsFilename),
        JSON.stringify(
            stringifyBigInts(publicSignals)
        )
    )

    return verifyProof('userStateTransition.params', proofFilename, publicSignalsFilename)
}

const verifyProveReputationProof = (
    proof: any,
    publicSignals: any,
) => {
    const date = Date.now().toString()
    const proofFilename = `${date}.proveReputation.proof.json`
    const publicSignalsFilename = `${date}.proveReputation.publicSignals.json`

    fs.writeFileSync(
        path.join(__dirname, buildPath, proofFilename),
        JSON.stringify(
            stringifyBigInts(proof)
        )
    )

    fs.writeFileSync(
        path.join(__dirname, buildPath, publicSignalsFilename),
        JSON.stringify(
            stringifyBigInts(publicSignals)
        )
    )

    return verifyProof('proveReputation.params', proofFilename, publicSignalsFilename)
}

const verifyProveReputationFromAttesterProof = (
    proof: any,
    publicSignals: any,
) => {
    const date = Date.now().toString()
    const proofFilename = `${date}.proveReputationFromAttester.proof.json`
    const publicSignalsFilename = `${date}.proveReputationFromAttester.publicSignals.json`

    fs.writeFileSync(
        path.join(__dirname, buildPath, proofFilename),
        JSON.stringify(
            stringifyBigInts(proof)
        )
    )

    fs.writeFileSync(
        path.join(__dirname, buildPath, publicSignalsFilename),
        JSON.stringify(
            stringifyBigInts(publicSignals)
        )
    )

    return verifyProof('proveReputationFromAttester.params', proofFilename, publicSignalsFilename)
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
    getSignalByNameViaSym,
    genVerifyEpochKeyProofAndPublicSignals,
    genVerifyReputationProofAndPublicSignals,
    genVerifyReputationFromAttesterProofAndPublicSignals,
    genVerifyUserStateTransitionProofAndPublicSignals,
    verifyEPKProof,
    verifyProveReputationProof,
    verifyProveReputationFromAttesterProof,
    verifyUserStateTransitionProof,
    genProofAndPublicSignals,
    verifyProof,
}