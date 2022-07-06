import path from 'path'
import { Circuit } from '.'
import * as snarkjs from 'snarkjs'
import { SnarkProof, SnarkPublicSignals } from '@unirep/crypto'

const buildPath = '../zksnarkBuild'

export const defaultProver = {
    genProofAndPublicSignals: async (
        circuitName: string | Circuit,
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
    },

    verifyProof: async (
        circuitName: string | Circuit,
        publicSignals: SnarkPublicSignals,
        proof: SnarkProof
    ): Promise<boolean> => {
        const vkey = require(path.join(buildPath, `${circuitName}.vkey.json`))
        return snarkjs.groth16.verify(vkey, publicSignals, proof)
    },
}

export const getDefaultVKey = (name: Circuit) => {
    return require(path.join(buildPath, `${name}.vkey.json`))
}
