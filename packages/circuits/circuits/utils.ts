/* eslint-disable @typescript-eslint/no-var-requires */
import { SnarkProof, SnarkPublicSignals } from '@unirep/crypto'
import * as path from 'path'

import { Circuit } from '../config/index'
import processAttestationsVkey from '../zksnarkBuild/processAttestations.vkey.json'
import proveReputationVkey from '../zksnarkBuild/proveReputation.vkey.json'
import proveUserSignUpVkey from '../zksnarkBuild/proveUserSignUp.vkey.json'
import startTransitionVkey from '../zksnarkBuild/startTransition.vkey.json'
import userStateTransitionVkey from '../zksnarkBuild/userStateTransition.vkey.json'
import verifyEpochKeyVkey from '../zksnarkBuild/verifyEpochKey.vkey.json'
const snarkjs = require('snarkjs')

const buildPath = '../zksnarkBuild'

const executeCircuit = async (circuit: any, inputs: any): Promise<any> => {
    const witness = await circuit.calculateWitness(inputs, true)
    await circuit.checkConstraints(witness)
    await circuit.loadSymbols()

    return witness
}

const getVKey = async (circuitName: Circuit): Promise<any> => {
    if (circuitName === Circuit.verifyEpochKey) {
        return verifyEpochKeyVkey
    } else if (circuitName === Circuit.proveReputation) {
        return proveReputationVkey
    } else if (circuitName === Circuit.proveUserSignUp) {
        return proveUserSignUpVkey
    } else if (circuitName === Circuit.startTransition) {
        return startTransitionVkey
    } else if (circuitName === Circuit.processAttestations) {
        return processAttestationsVkey
    } else if (circuitName === Circuit.userStateTransition) {
        return userStateTransitionVkey
    } else {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        console.log(
            `"${circuitName}" not found. Valid circuit name: verifyEpochKey, proveReputation, proveUserSignUp, startTransition, processAttestations, userStateTransition`
        )
    }
}

const getSignalByName = (
    circuit: any,
    witness: any,
    signal: string
): Promise<any> => {
    return witness[circuit.symbols[signal].varIdx]
}

const genProofAndPublicSignals = async (
    circuitName: Circuit,
    inputs: any
): Promise<any> => {
    const circuitWasmPath = path.join(
        __dirname,
        buildPath,
        `${circuitName}.wasm`
    )
    const zkeyPath = path.join(__dirname, buildPath, `${circuitName}.zkey`)
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        inputs,
        circuitWasmPath,
        zkeyPath
    )

    return { proof, publicSignals }
}

const verifyProof = async (
    circuitName: Circuit,
    proof: SnarkProof,
    publicSignals: SnarkPublicSignals
): Promise<boolean> => {
    const vkey = await getVKey(circuitName)
    return snarkjs.groth16.verify(vkey, publicSignals, proof)
}

const formatProofForVerifierContract = (_proof: SnarkProof): string[] => {
    return [
        _proof.pi_a[0],
        _proof.pi_a[1],
        _proof.pi_b[0][1],
        _proof.pi_b[0][0],
        _proof.pi_b[1][1],
        _proof.pi_b[1][0],
        _proof.pi_c[0],
        _proof.pi_c[1],
    ].map((x) => x.toString())
}

const formatProofForSnarkjsVerification = (_proof: string[]): SnarkProof => {
    return {
        pi_a: [BigInt(_proof[0]), BigInt(_proof[1]), BigInt('1')],
        pi_b: [
            [BigInt(_proof[3]), BigInt(_proof[2])],
            [BigInt(_proof[5]), BigInt(_proof[4])],
            [BigInt('1'), BigInt('0')],
        ],
        pi_c: [BigInt(_proof[6]), BigInt(_proof[7]), BigInt('1')],
    }
}

export {
    Circuit,
    executeCircuit,
    formatProofForVerifierContract,
    formatProofForSnarkjsVerification,
    getVKey,
    getSignalByName,
    genProofAndPublicSignals,
    verifyProof,
}
