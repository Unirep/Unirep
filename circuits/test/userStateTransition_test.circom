include "../userStateTransition.circom"

component main = UserStateTransition(
    16,   // GST_tree_depth
    64,   // epoch_tree_depth
    16,   // user_state_tree_depth
    5   // EPOCH_KEY_NONCE_PER_EPOCH
);