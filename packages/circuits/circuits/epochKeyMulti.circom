pragma circom 2.0.0;

include "./epochKeyLite.circom";
include "./verifyEpochKey.circom";

template EpochKeyMulti(STATE_TREE_DEPTH, EPOCH_TREE_DEPTH, EPOCH_TREE_ARITY, EPOCH_KEY_NONCE_PER_EPOCH) {
    signal input state_tree_indexes[STATE_TREE_DEPTH];
    signal input state_tree_elements[STATE_TREE_DEPTH];
    // Global state tree leaf: Identity & user state root
    signal input identity_nullifier;

    signal output state_tree_root;

    signal input pos_rep;
    signal input neg_rep;
    signal input graffiti;
    signal input timestamp;

    signal input control[2];

    // Some arbitrary data to endorse
    signal input data;

    signal output control_output[2];
    signal output epoch_key[2];

    component epoch_key_full = VerifyEpochKey(STATE_TREE_DEPTH, EPOCH_TREE_DEPTH, EPOCH_TREE_ARITY, EPOCH_KEY_NONCE_PER_EPOCH);
    for (var x = 0; x < STATE_TREE_DEPTH; x++) {
      epoch_key_full.state_tree_indexes[x] <== state_tree_indexes[x];
      epoch_key_full.state_tree_elements[x] <== state_tree_elements[x];
    }
    epoch_key_full.identity_nullifier <== identity_nullifier;
    epoch_key_full.pos_rep <== pos_rep;
    epoch_key_full.neg_rep <== neg_rep;
    epoch_key_full.graffiti <== graffiti;
    epoch_key_full.timestamp <== timestamp;
    epoch_key_full.control <== control[0];
    epoch_key_full.data <== 0;

    epoch_key[0] <== epoch_key_full.epoch_key;
    control_output[0] <== epoch_key_full.control_output;
    state_tree_root <== epoch_key_full.state_tree_root;

    component epoch_key_lite = EpochKeyLite(EPOCH_TREE_DEPTH, EPOCH_TREE_ARITY, EPOCH_KEY_NONCE_PER_EPOCH);
    epoch_key_lite.identity_nullifier <== identity_nullifier;
    epoch_key_lite.control <== control[1];
    epoch_key_lite.data <== 0;

    epoch_key[1] <== epoch_key_lite.epoch_key;
    control_output[1] <== epoch_key_lite.control_output;
}
