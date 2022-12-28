import {
    EPOCH_TREE_DEPTH,
    EPOCH_TREE_ARITY,
    STATE_TREE_DEPTH,
    NUM_EPOCH_KEY_NONCE_PER_EPOCH,
    AGGREGATE_KEY_COUNT,
} from '../dist/config/index.js'

export const ptauName = 'powersOfTau28_hez_final_17.ptau'

export const circuitContents = {
    userStateTransition: `pragma circom 2.0.0; include "../circuits/userStateTransition.circom"; \n\ncomponent main { public [ from_epoch, to_epoch, attester_id, epoch_tree_root ] } = UserStateTransition(${STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${EPOCH_TREE_ARITY}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, 252);`,
    verifyEpochKey: `pragma circom 2.0.0; include "../circuits/verifyEpochKey.circom"; \n\ncomponent main { public [ data ] } = VerifyEpochKey(${STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${EPOCH_TREE_ARITY}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH});`,
    proveReputation: `pragma circom 2.0.0; include "../circuits/proveReputation.circom"; \n\ncomponent main { public [ graffiti_pre_image ] } = ProveReputation(${STATE_TREE_DEPTH}, ${EPOCH_TREE_DEPTH}, ${EPOCH_TREE_ARITY}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, 252);`,
    epochKeyLite: `pragma circom 2.0.0; include "../circuits/epochKeyLite.circom"; \n\ncomponent main { public [ data ] } = EpochKeyLite(${EPOCH_TREE_DEPTH}, ${EPOCH_TREE_ARITY}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH});`,
    signup: `pragma circom 2.0.0; include "../circuits/signup.circom"; \n\ncomponent main { public [ attester_id, epoch ] } = Signup();`,
    aggregateEpochKeys: `pragma circom 2.0.0; include "../circuits/aggregateEpochKeys.circom"; \n\ncomponent main { public [ start_root ] } = AggregateEpochKeys(${EPOCH_TREE_DEPTH}, ${EPOCH_TREE_ARITY}, ${AGGREGATE_KEY_COUNT});`,
}
