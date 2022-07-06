export const verifyEpochKeyCircuitPath =
    '../zksnarkBuild/verifyEpochKey_main.circom'

export const proveReputationCircuitPath =
    '../zksnarkBuild/proveReputation_main.circom'

export const proveUserSignUpCircuitPath =
    '../zksnarkBuild/proveUserSignUp_main.circom'

export const startTransitionCircuitPath =
    '../zksnarkBuild/startTransition_main.circom'

export const processAttestationsCircuitPath =
    '../zksnarkBuild/processAttestations_main.circom'

export const userStateTransitionCircuitPath =
    '../zksnarkBuild/userStateTransition_main.circom'

export const NUM_EPOCH_KEY_NONCE_PER_EPOCH = 3

export const NUM_ATTESTATIONS_PER_PROOF = 5

export const EPOCH_LENGTH = 30 // 30 seconds

export const GLOBAL_STATE_TREE_DEPTH = 9

export const USER_STATE_TREE_DEPTH = 9

export const EPOCH_TREE_DEPTH = 32

export const MAX_REPUTATION_BUDGET = 10

export const MAX_USERS = 2 ** GLOBAL_STATE_TREE_DEPTH - 1

export const MAX_ATTESTERS = 2 ** USER_STATE_TREE_DEPTH - 1
