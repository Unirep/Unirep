include "../userStateTransition.circom"

component main = UserStateTransition(
    4,   // GST_tree_depth
    32,   // epoch_tree_depth
    4,   // user_state_tree_depth
    // 20,  // airdropped_karma
    6,   // ATTESTATIONS_PER_EPOCH_KEY
    2,   // EPOCH_KEY_NONCE_PER_EPOCH
    12   // TOTAL_NUM_ATTESTATIONS
);