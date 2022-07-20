/*
    Prove:
        1. if user has a leaf in an existed global state tree
        2. user state tree has a `sign_up` flag given by the attester
        3. output an epoch key with nonce = 0 (ensure one epoch key per user per epoch)
*/

include "../../../node_modules/circomlib/circuits/mux1.circom";
include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "./sparseMerkleTree.circom";
include "./verifyEpochKey.circom";

template ProveUserSignUp(GST_tree_depth, user_state_tree_depth, epoch_tree_depth, EPOCH_KEY_NONCE_PER_EPOCH) {
    signal input epoch;
    signal output epoch_key;

    // Global state tree leaf: Identity & user state root
    signal private input identity_nullifier;
    signal private input identity_trapdoor;
    signal private input user_tree_root;
    // Global state tree
    signal private input GST_path_index[GST_tree_depth];
    signal private input GST_path_elements[GST_tree_depth][1];
    signal output GST_root;
    // Attester to prove reputation from
    signal input attester_id;
    // Attestation by the attester
    signal private input pos_rep;
    signal private input neg_rep;
    signal private input graffiti;
    signal input sign_up; // indicate if the user has signed up in the attester's app or not
    signal private input UST_path_elements[user_state_tree_depth][1];

    /* 1. Check if user exists in the Global State Tree and verify epoch key */
    // set epoch_key_nonce = 0 to force user only use one epoch key to receive airdrop
    var epoch_key_nonce = 0;
    component verify_epoch_key = VerifyEpochKey(GST_tree_depth, epoch_tree_depth, EPOCH_KEY_NONCE_PER_EPOCH);
    for (var i = 0; i< GST_tree_depth; i++) {
        verify_epoch_key.GST_path_index[i] <== GST_path_index[i];
        verify_epoch_key.GST_path_elements[i] <== GST_path_elements[i][0];
    }
    verify_epoch_key.identity_nullifier <== identity_nullifier;
    verify_epoch_key.identity_trapdoor <== identity_trapdoor;
    verify_epoch_key.user_tree_root <== user_tree_root;
    verify_epoch_key.nonce <== epoch_key_nonce;
    verify_epoch_key.epoch <== epoch;
    epoch_key <== verify_epoch_key.epoch_key;
    GST_root <== verify_epoch_key.GST_root;
    /* End of check 1 */

    /* 2. Check if the reputation given by the attester is in the user state tree */
    component reputation_hasher = Poseidon(5);
    reputation_hasher.inputs[0] <== pos_rep;
    reputation_hasher.inputs[1] <== neg_rep;
    reputation_hasher.inputs[2] <== graffiti;
    reputation_hasher.inputs[3] <== sign_up;
    reputation_hasher.inputs[4] <== 0;

    component reputation_membership_check = SMTLeafExists(user_state_tree_depth);
    reputation_membership_check.leaf_index <== attester_id;
    reputation_membership_check.leaf <== reputation_hasher.out;
    for (var i = 0; i < user_state_tree_depth; i++) {
        reputation_membership_check.path_elements[i][0] <== UST_path_elements[i][0];
    }
    reputation_membership_check.root <== user_tree_root;
    /* End of check 2 */
}
