import path from "path";
import { CircuitConfig } from "../src";

export default {
    exportBuildPath: path.join(__dirname, '../zksnarkBuild'),
    globalStateTreeDepth: 4,
    userStateTreeDepth: 4,
    epochTreeDepth: 32,
    numEpochKeyNoncePerEpoch: 3,
    maxReputationBudget: 10,
    numAttestationsPerProof: 5,
} as CircuitConfig

export const inputCircuitPath = path.join(__dirname, '../circuits')
export const ptau = path.join(__dirname, '../zksnarkBuild/powersOfTau28_hez_final_17.ptau')
export const overrideCircuit = false