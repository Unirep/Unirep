import path from "path"
import { CircuitConfig } from "../src"

export const exportBuildPath = path.join(__dirname, '../circuits/test')
// make the circuit size smaller
export const testConfig = {
    globalStateTreeDepth: 2,
    userStateTreeDepth: 2,
    epochTreeDepth: 4,
    numEpochKeyNoncePerEpoch: 3,
    maxReputationBudget: 5,
    numAttestationsPerProof: 5,
} as CircuitConfig