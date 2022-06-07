import path from 'path'
import { CircuitConfig } from '../src'

export default {
    globalStateTreeDepth: 4,
    userStateTreeDepth: 4,
    epochTreeDepth: 32,
    numEpochKeyNoncePerEpoch: 3,
    maxReputationBudget: 10,
    numAttestationsPerProof: 5,
} as CircuitConfig

export const exportBuildPath = path.join(__dirname, '../zksnarkBuild')
export const inputCircuitPath = path.join(__dirname, '../circuits')
export const ptau = path.join(exportBuildPath, 'powersOfTau28_hez_final_17.ptau')
export const ptauUrl = 'https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_17.ptau'
export const overrideCircuit = false
