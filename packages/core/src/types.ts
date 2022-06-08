export enum CircuitName {
    verifyEpochKey = 'verifyEpochKey',
    proveReputation = 'proveReputation',
    proveUserSignUp = 'proveUserSignUp',
    startTransition = 'startTransition',
    processAttestations = 'processAttestations',
    userStateTransition = 'userStateTransition',
}

export type CircuitConfig = {
    globalStateTreeDepth: number
    userStateTreeDepth: number
    epochTreeDepth: number
    numAttestationsPerProof: number
    maxReputationBudget: number
    numEpochKeyNoncePerEpoch: number
}
