import path from 'path'
import { CircuitConfig } from '../src'

// the path to `*_test.circom`, but they are not built snarks
export const testCircuits = path.join(__dirname, '../circuits/test')
// the path to `.wasm`, `.vkey.json`, `.zkey` files that the circuits are built
export const exportBuildPath = path.join(__dirname, '../zksnarkBuild')
// make the circuit size smaller
export const testConfig = {
    globalStateTreeDepth: 4,
    userStateTreeDepth: 4,
    epochTreeDepth: 4,
    numEpochKeyNoncePerEpoch: 3,
    maxReputationBudget: 5,
    numAttestationsPerProof: 5,
} as CircuitConfig

export const config = require(path.join(exportBuildPath, 'config.json'))
