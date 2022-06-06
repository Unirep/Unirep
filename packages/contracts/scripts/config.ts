import path from 'path'
import { CircuitName } from '@unirep/circuits'

export const zkFilesPath = path.join(__dirname, '../../circuits/zksnarkBuild')
export const verifiersPath = path.join(__dirname, '../contracts/verifiers')
export const artifactsPath = path.join(__dirname, '../build/artifacts')
export const circuitConfig = require(path.join(zkFilesPath, 'config.json'))

// address of deployed verifiers
type EnumDictionary<T extends string, U> = {
    [K in T]: U
}
export const addressMap: EnumDictionary<CircuitName, string | undefined> = {
    [CircuitName.verifyEpochKey]: undefined,
    [CircuitName.proveReputation]: undefined,
    [CircuitName.proveUserSignUp]: undefined,
    [CircuitName.startTransition]: undefined,
    [CircuitName.processAttestations]:
        undefined,
    [CircuitName.userStateTransition]:
        undefined,
}
