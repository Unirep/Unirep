import { Path } from "typescript"

export type CircuitConfig = {
    exportBuildPath: Path
    globalStateTreeDepth: number
    userStateTreeDepth: number
    epochTreeDepth: number
    numAttestationsPerProof: number
    maxReputationBudget: number
    numEpochKeyNoncePerEpoch: number
}