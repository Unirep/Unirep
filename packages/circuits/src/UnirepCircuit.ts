import path from 'path'
const snarkjs = require('snarkjs')
const circom = require('circom')
import { SnarkProof, SnarkPublicSignals } from '@unirep/crypto'

import { CircuitName } from './types/circuit'

export default class UnirepCircuit {

    /**
     * Get VKey of given circuit
     * @param zkFilesPath The path of built zk files
     * @param circuitName The name of circuit
     * @returns Vkey of the circuit
     */
    public static getVKey = (
        zkFilesPath: string,
        circuitName: CircuitName
    ) => {
        const VKeyPath = path.join(
            zkFilesPath,
            `${circuitName}.vkey.json`
        )
        const vkey = require(VKeyPath)
        return vkey
    }

    /**
     * Get the value of given variable in witness
     * @param circuit The snarkjs circuit
     * @param witness The witness of the circuit
     * @param signal The name of the variable
     * @returns The value of the variable in witness
     */
    public static getSignalByName = (
        circuit: any,
        witness: any,
        signal: string
    ): any => {
        return witness[circuit.symbols[signal].varIdx]
    }

    /**
     * Compile a .circom file with circom compiler
     * @param circuitPath The path to the .circom file
     * @returns The compiled circuit
     */
    public static compileAndLoadCircuit = async (circuitPath: string) => {
        const circuit = await circom.tester(circuitPath)
        await circuit.loadSymbols()

        return circuit
    }

    /**
     * Execute a snarkjs circuit with given inputs
     * @param circuit The snarkjs circuit
     * @param inputs Input of the circuit
     * @returns Witness of the circuit
     */
    public static executeCircuit = async (
        circuit: any,
        inputs: any
    ): Promise<any> => {
        const witness = await circuit.calculateWitness(inputs, true)
        await circuit.checkConstraints(witness)
        await circuit.loadSymbols()

        return witness
    }

    /**
     * Generate a full proof of the circuit
     * @param zkFilesPath The path to the built zk files
     * @param circuitName The name of the circuit
     * @param inputs The input of the proof
     * @returns The proof and the public signals of the snark proof
     */
    public static genProof = async (
        zkFilesPath: string,
        circuitName: CircuitName,
        inputs: any
    ) => {
        const circuitWasmPath = path.join(
            zkFilesPath,
            `${circuitName}.wasm`
        )
        const zkeyPath = path.join(
            zkFilesPath,
            `${circuitName}.zkey`
        )
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            inputs,
            circuitWasmPath,
            zkeyPath
        )

        return { proof, publicSignals }
    }

    /**
     * Verify the snark proof
     * @param zkFilesPath The path to the built zk files
     * @param circuitName The name of the circuit
     * @param proof The proof of the snark proof
     * @param publicSignals The public signals of the snark proof
     * @returns 
     */
    public static verifyProof = async (
        zkFilesPath: string,
        circuitName: CircuitName,
        proof: SnarkProof,
        publicSignals: SnarkPublicSignals
    ): Promise<boolean> => {
        const vkey = this.getVKey(zkFilesPath, circuitName)
        return snarkjs.groth16.verify(vkey, publicSignals, proof)
    }

    /**
     * Format the proof for verifier contract
     * @param proof The output of the snarkjs proof
     * @returns The array of the stringified proof
     */
    public static formatProofForVerifierContract = (
        proof: SnarkProof
    ): string[] => {
        return [
            proof.pi_a[0],
            proof.pi_a[1],
            proof.pi_b[0][1],
            proof.pi_b[0][0],
            proof.pi_b[1][1],
            proof.pi_b[1][0],
            proof.pi_c[0],
            proof.pi_c[1],
        ].map((x) => x.toString())
    }

    /**
     * Format the proof for snarkjs verification
     * @param proof The stringified array of the the proof
     * @returns The SnarkProof type of the proof
     */
    public static formatProofForSnarkjsVerification = (
        proof: string[]
    ): SnarkProof => {
        return {
            pi_a: [BigInt(proof[0]), BigInt(proof[1]), BigInt('1')],
            pi_b: [
                [BigInt(proof[3]), BigInt(proof[2])],
                [BigInt(proof[5]), BigInt(proof[4])],
                [BigInt('1'), BigInt('0')],
            ],
            pi_c: [BigInt(proof[6]), BigInt(proof[7]), BigInt('1')],
        }
    }
}