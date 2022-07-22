import {
    NUM_ATTESTATIONS_PER_PROOF,
    MAX_REPUTATION_BUDGET,
    USER_STATE_TREE_DEPTH,
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
} from '../dist/config/index.js'

export const circuitContents = {
    verifyEpochKey: `include "../circuits/verifyEpochKey.circom" \n\ncomponent main = VerifyEpochKey(${GLOBAL_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH})`,
    proveReputation: `include "../circuits/proveReputation.circom" \n\ncomponent main = ProveReputation(${GLOBAL_STATE_TREE_DEPTH}, ${USER_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, ${MAX_REPUTATION_BUDGET}, 252)`,
    proveUserSignUp: `include "../circuits/proveUserSignUp.circom" \n\ncomponent main = ProveUserSignUp(${GLOBAL_STATE_TREE_DEPTH}, ${USER_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH})`,
    startTransition: `include "../circuits/startTransition.circom" \n\ncomponent main = StartTransition(${GLOBAL_STATE_TREE_DEPTH})`,
    processAttestations: `include "../circuits/processAttestations.circom" \n\ncomponent main = ProcessAttestations(${USER_STATE_TREE_DEPTH}, ${NUM_ATTESTATIONS_PER_PROOF}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH})`,
    userStateTransition: `include "../circuits/userStateTransition.circom" \n\ncomponent main = UserStateTransition(${GLOBAL_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${USER_STATE_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH})`,
}
