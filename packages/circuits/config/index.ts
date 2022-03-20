enum Circuit {
    verifyEpochKey = 'verifyEpochKey',
    proveReputation = 'proveReputation',
    proveUserSignUp = 'proveUserSignUp',
    startTransition = 'startTransition',
    processAttestations = 'processAttestations',
    userStateTransition = 'userStateTransition',
}

const numEpochKeyNoncePerEpoch = 3

const numAttestationsPerProof = 5

const circuitGlobalStateTreeDepth = 4

const circuitUserStateTreeDepth = 4

const circuitEpochTreeDepth = 32

const maxReputationBudget = 10

const verifyEpochKeyCircuitPath = '../zksnarkBuild/verifyEpochKey_main.circom'

const proveReputationCircuitPath = '../zksnarkBuild/proveReputation_main.circom'

const proveUserSignUpCircuitPath = '../zksnarkBuild/proveUserSignUp_main.circom'

const startTransitionCircuitPath = '../zksnarkBuild/startTransition_main.circom'

const processAttestationsCircuitPath =
    '../zksnarkBuild/processAttestations_main.circom'

const userStateTransitionCircuitPath =
    '../zksnarkBuild/userStateTransition_main.circom'

export {
    Circuit,
    circuitGlobalStateTreeDepth,
    circuitUserStateTreeDepth,
    circuitEpochTreeDepth,
    numEpochKeyNoncePerEpoch,
    numAttestationsPerProof,
    maxReputationBudget,
    verifyEpochKeyCircuitPath,
    proveReputationCircuitPath,
    proveUserSignUpCircuitPath,
    startTransitionCircuitPath,
    processAttestationsCircuitPath,
    userStateTransitionCircuitPath,
}
