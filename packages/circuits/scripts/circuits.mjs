import {
    NUM_ATTESTATIONS_PER_PROOF,
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
} from '../dist/config/index.js'

export const circuitContents = {
    epochTransition: `include "../circuits/epochTransition.circom" \n\ncomponent main = EpochTransition(${GLOBAL_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, 252)`,
    verifyEpochKey: `include "../circuits/verifyEpochKey.circom" \n\ncomponent main = VerifyEpochKey(${GLOBAL_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH})`,
    proveReputation: `include "../circuits/proveReputation.circom" \n\ncomponent main = ProveReputation(${GLOBAL_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, 252)`,
    // proveUserSignUp: `include "../circuits/proveUserSignUp.circom" \n\ncomponent main = ProveUserSignUp(${GLOBAL_STATE_TREE_DEPTH}, ${USER_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH})`,
}
