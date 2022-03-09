import * as path from 'path'
const snarkjs = require('snarkjs')
import { SnarkProof, SnarkPublicSignals } from '@unirep/crypto'
import { Circuit } from '../config/index'
import verifyEpochKeyVkey from '../build/verifyEpochKey.vkey.json'
import proveReputationVkey from '../build/proveReputation.vkey.json'
import proveUserSignUpVkey from '../build/proveUserSignUp.vkey.json'
import startTransitionVkey from '../build/startTransition.vkey.json'
import processAttestationsVkey from '../build/processAttestations.vkey.json'
import userStateTransitionVkey from '../build/userStateTransition.vkey.json'

const buildPath = "../build"

const executeCircuit = async (
    circuit: any,
    inputs: any,
) => {

    const witness = await circuit.calculateWitness(inputs, true)
    await circuit.checkConstraints(witness)
    await circuit.loadSymbols()

    return witness
}

const getVKey = async (
    circuitName: Circuit
) => {
    if (circuitName == Circuit.verifyEpochKey){
        return verifyEpochKeyVkey
    } else if (circuitName == Circuit.proveReputation){
        return proveReputationVkey
    } else if (circuitName == Circuit.proveUserSignUp){
        return proveUserSignUpVkey
    } else if (circuitName == Circuit.startTransition){
        return startTransitionVkey
    } else if (circuitName == Circuit.processAttestations){
        return processAttestationsVkey
    } else if (circuitName == Circuit.userStateTransition){
        return userStateTransitionVkey
    } else {
        console.log(`"${circuitName}" not found. Valid circuit name: verifyEpochKey, proveReputation, proveUserSignUp, startTransition, processAttestations, userStateTransition`)
        return
    }
}

const getSignalByName = (
    circuit: any,
    witness: any,
    signal: string,
) => {

    return witness[circuit.symbols[signal].varIdx]
}

const genProofAndPublicSignals = async (
    circuitName: Circuit,
    inputs: any,
) => {
    const circuitWasmPath = path.join(__dirname, buildPath, `${circuitName}.wasm`)
    const zkeyPath = path.join(__dirname, buildPath,`${circuitName}.zkey`)
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputs, circuitWasmPath, zkeyPath);

    return { proof, publicSignals }
}

const verifyProof = async (
    circuitName: Circuit,
    proof: SnarkProof,
    publicSignals: SnarkPublicSignals,
): Promise<boolean> => {
    const vkey = await getVKey(circuitName)
    const res = await snarkjs.groth16.verify(vkey, publicSignals, proof);
    return res
}

const formatProofForVerifierContract = (
    _proof: SnarkProof,
): string[] => {

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

const formatProofForSnarkjsVerification = (
    _proof: string[]
): SnarkProof => {
    return {
        pi_a: [
            BigInt(_proof[0]),
            BigInt(_proof[1]),
            BigInt('1')
        ],
        pi_b: [
          [
            BigInt(_proof[3]),
            BigInt(_proof[2])
          ],
          [
            BigInt(_proof[5]),
            BigInt(_proof[4])
          ],
          [ BigInt('1'), 
            BigInt('0') ]
        ],
        pi_c: [
            BigInt(_proof[6]),
            BigInt(_proof[7]),
            BigInt('1')
        ],
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