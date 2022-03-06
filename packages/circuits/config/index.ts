enum Circuit {
    verifyEpochKey = 'verifyEpochKey',
    proveReputation = 'proveReputation',
    proveUserSignUp = 'proveUserSignUp',
    startTransition = 'startTransition',
    processAttestations = 'processAttestations',
    userStateTransition = 'userStateTransition',
}

const numEpochKeyNoncePerEpoch = 3;

const numAttestationsPerProof = 5;

const circuitGlobalStateTreeDepth = 4;

const circuitUserStateTreeDepth = 4;

const circuitEpochTreeDepth = 32;

const maxReputationBudget = 10;

const verifyEpochKeyCircuitPath = '../build/verifyEpochKey_main.circom'

const proveReputationCircuitPath = '../build/proveReputation_main.circom'

const proveUserSignUpCircuitPath = '../build/proveUserSignUp_main.circom'

const startTransitionCircuitPath = '../build/startTransition_main.circom'

const processAttestationsCircuitPath = '../build/processAttestations_main.circom'

const userStateTransitionCircuitPath = '../build/userStateTransition_main.circom'

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