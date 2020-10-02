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

const zkutilPath = "~/.cargo/bin/zkutil"

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

const genVerifyEpochKeyProofAndPublicSignals = (
    inputs: any,
    circuit?: any
) => {
    return genProofAndPublicSignals(
        inputs,
        '/test/verifyEpochKey_test.circom',
        'verifyEpochKeyCircuit.r1cs',
        'verifyEpochKey.wasm',
        'verifyEpochKey.params',
        circuit,
    )
}

const genVerifyUserStateTransitionProofAndPublicSignals = (
    inputs: any,
    circuit?: any
) => {
    return genProofAndPublicSignals(
        inputs,
        '/test/userStateTransition_test.circom',
        'userStateTransitionCircuit.r1cs',
        'userStateTransition.wasm',
        'userStateTransition.params',
        circuit,
    )
}

const genVerifyReputationProofAndPublicSignals = (
    inputs: any,
    circuit?: any
) => {
    return genProofAndPublicSignals(
        inputs,
        '/test/proveReputation_test.circom',
        'proveReputationCircuit.r1cs',
        'proveReputation.wasm',
        'proveReputation.params',
        circuit,
    )
}

const genProofAndPublicSignals = async (
    inputs: any,
    circuitFilename: string,
    circuitR1csFilename: string,
    circuitWasmFilename: string,
    paramsFilename: string,
    circuit?: any,
) => {
    const date = Date.now()
    const paramsPath = path.join(__dirname, '../../build/', paramsFilename)
    const circuitR1csPath = path.join(__dirname, '../../build/', circuitR1csFilename)
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

    const proveCmd = `${zkutilPath} prove -c ${circuitR1csPath} -p ${paramsPath} -w ${witnessJsonPath} -r ${proofPath} -o ${publicJsonPath}`

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
    paramsFilename: string,
    proofFilename: string,
    publicSignalsFilename: string,
): Promise<boolean> => {
    const paramsPath = path.join(__dirname, '../../build/', paramsFilename)
    const proofPath = path.join(__dirname, '../../build/', proofFilename)
    const publicSignalsPath = path.join(__dirname, '../../build/', publicSignalsFilename)

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
        path.join(__dirname, '../../build/', proofFilename),
        JSON.stringify(
            stringifyBigInts(proof)
        )
    )

    fs.writeFileSync(
        path.join(__dirname, '../../build/', publicSignalsFilename),
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
        path.join(__dirname, '../../build/', proofFilename),
        JSON.stringify(
            stringifyBigInts(proof)
        )
    )

    fs.writeFileSync(
        path.join(__dirname, '../../build/', publicSignalsFilename),
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
        path.join(__dirname, '../../build/', proofFilename),
        JSON.stringify(
            stringifyBigInts(proof)
        )
    )

    fs.writeFileSync(
        path.join(__dirname, '../../build/', publicSignalsFilename),
        JSON.stringify(
            stringifyBigInts(publicSignals)
        )
    )

    return verifyProof('proveReputation.params', proofFilename, publicSignalsFilename)
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
    genVerifyReputationProofAndPublicSignals,
    genVerifyUserStateTransitionProofAndPublicSignals,
    verifyEPKProof,
    verifyProveReputationProof,
    verifyUserStateTransitionProof,
    genProofAndPublicSignals,
    verifyProof,
}