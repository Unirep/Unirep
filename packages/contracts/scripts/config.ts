import path from 'path'
import { CircuitName } from '../../circuits/src'
import { ethers } from 'ethers'

export const zkFilesPath = path.join(__dirname, '../../circuits/circuits/test')
export const verifiersPath = path.join(__dirname, '../contracts/verifiers')
export const artifactsPath = path.join(__dirname, '../build/artifacts')
export const circuitConfig = require(path.join(zkFilesPath, 'config.json'))
export const contractConfig = {
    attestingFee: ethers.utils.parseEther('0.1'),
    epochLength: 30,
    maxUsers: 10,
    maxAttesters: 10,
    ...circuitConfig,
}

// address of deployed verifiers
type EnumDictionary<T extends string, U> = {
    [K in T]: U
}
export const addressMap: EnumDictionary<CircuitName, string | undefined> = {
    [CircuitName.verifyEpochKey]: undefined,
    [CircuitName.proveReputation]: undefined,
    [CircuitName.proveUserSignUp]: undefined,
    [CircuitName.startTransition]: undefined,
    [CircuitName.processAttestations]: undefined,
    [CircuitName.userStateTransition]: undefined,
}
