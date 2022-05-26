enum Circuit {
    verifyEpochKey = 'verifyEpochKey',
    proveReputation = 'proveReputation',
    proveUserSignUp = 'proveUserSignUp',
    startTransition = 'startTransition',
    processAttestations = 'processAttestations',
    userStateTransition = 'userStateTransition',
}

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
    verifyEpochKeyCircuitPath,
    proveReputationCircuitPath,
    proveUserSignUpCircuitPath,
    startTransitionCircuitPath,
    processAttestationsCircuitPath,
    userStateTransitionCircuitPath,
}

export const NUM_EPOCH_KEY_NONCE_PER_EPOCH = 3

export const NUM_ATTESTATIONS_PER_PROOF = 5

export const EPOCH_LENGTH = 30 // 30 seconds

export const GLOBAL_STATE_TREE_DEPTH = 9

export const USER_STATE_TREE_DEPTH = 9

export const EPOCH_TREE_DEPTH = 32

export const MAX_REPUTATION_BUDGET = 10

export const MAX_USERS = 2 ** GLOBAL_STATE_TREE_DEPTH - 1

export const MAX_ATTESTERS = 2 ** USER_STATE_TREE_DEPTH - 1
