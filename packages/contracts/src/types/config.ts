import { BigNumber } from 'ethers'

type CircuitConfig = {
    globalStateTreeDepth: number
    userStateTreeDepth: number
    epochTreeDepth: number
    numAttestationsPerProof: number
    maxReputationBudget: number
    numEpochKeyNoncePerEpoch: number
}

export type ContractConfig = {
    attestingFee: BigNumber
    epochLength: number
    maxUsers: number
    maxAttesters: number
} & CircuitConfig
