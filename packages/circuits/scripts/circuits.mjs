import {
    NUM_ATTESTATIONS_PER_PROOF,
    EPOCH_TREE_DEPTH,
    GLOBAL_STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    AGGREGATE_KEY_COUNT,
} from '../dist/config/index.js'

export const circuitContents = {
    userStateTransition: `pragma circom 2.0.0; include "../circuits/userStateTransition.circom"; \n\ncomponent main { public [ from_epoch, to_epoch, attester_id, epoch_tree_root ] } = UserStateTransition(${GLOBAL_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, 252);`,
    verifyEpochKey: `pragma circom 2.0.0; include "../circuits/verifyEpochKey.circom"; \n\ncomponent main { public [ epoch, attester_id ] } = VerifyEpochKey(${GLOBAL_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH});`,
    proveReputation: `pragma circom 2.0.0; include "../circuits/proveReputation.circom"; \n\ncomponent main { public [ epoch, attester_id, min_rep, epoch_tree_root ] } = ProveReputation(${GLOBAL_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, 252);`,
    signup: `pragma circom 2.0.0; include "../circuits/signup.circom"; \n\ncomponent main { public [ attester_id, epoch ] } = Signup();`,
    aggregateEpochKeys: `pragma circom 2.0.0; include "../circuits/aggregateEpochKeys.circom"; \n\ncomponent main { public [ start_root ] } = AggregateEpochKeys(${EPOCH_TREE_DEPTH}, ${AGGREGATE_KEY_COUNT});`,
    // proveUserSignUp: `include "../circuits/proveUserSignUp.circom" \n\ncomponent main = ProveUserSignUp(${GLOBAL_STATE_TREE_DEPTH}, ${USER_STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH})`,
}
