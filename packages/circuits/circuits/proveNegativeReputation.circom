/*
    Prove:
        1. if user has a leaf in an existed global state tree
        2. user state tree has the claimed reputation (pos_rep, neg_rep, graffiti)
        3. output an epoch key
*/

include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/mux1.circom";
include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "./sparseMerkleTree.circom";
include "./verifyEpochKey.circom";

template ProveNegativeReputation(GST_tree_depth, user_state_tree_depth, epoch_tree_depth, EPOCH_KEY_NONCE_PER_EPOCH, MAX_REPUTATION_SCORE_BITS) {
    signal input epoch;
    signal private input epoch_key_nonce;
    signal input epoch_key;

    // Global state tree leaf: Identity & user state root
    signal private input identity_nullifier;
    signal private input identity_trapdoor;
    signal private input user_tree_root;
    // Global state tree
    signal private input GST_path_index[GST_tree_depth];
    signal private input GST_path_elements[GST_tree_depth][1];
    signal input GST_root;
    // Attester to prove reputation from
    signal input attester_id;
    // Attestation by the attester
    signal private input pos_rep;
    signal private input neg_rep;
    signal private input graffiti;
    signal private input sign_up;
    signal private input UST_path_elements[user_state_tree_depth][1];
    // Prove the maximum reputation
    signal input max_rep;
    // Graffiti
    signal input prove_graffiti;
    signal input graffiti_pre_image;

    /* 1. Check if user exists in the Global State Tree and verify epoch key */
    component verify_epoch_key = VerifyEpochKey(GST_tree_depth, epoch_tree_depth, EPOCH_KEY_NONCE_PER_EPOCH);
    for (var i = 0; i< GST_tree_depth; i++) {
        verify_epoch_key.GST_path_index[i] <== GST_path_index[i];
        verify_epoch_key.GST_path_elements[i][0] <== GST_path_elements[i][0];
    }
    verify_epoch_key.GST_root <== GST_root;
    verify_epoch_key.identity_nullifier <== identity_nullifier;
    verify_epoch_key.identity_trapdoor <== identity_trapdoor;
    verify_epoch_key.user_tree_root <== user_tree_root;
    verify_epoch_key.nonce <== epoch_key_nonce;
    verify_epoch_key.epoch <== epoch;
    verify_epoch_key.epoch_key <== epoch_key;
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

    /* 4. Check if user has reputation less than max_rep */
    // 4.1 if proving max_rep < 0, check if pos_rep - neg_rep <= max_rep
    component if_prove_max_rep = LessThan(MAX_REPUTATION_SCORE_BITS);
    if_prove_max_rep.in[0] <== max_rep;
    if_prove_max_rep.in[1] <== 0;

    // 4.2 check if pos_rep - neg_rep <= 0 && pos_rep - neg_rep <= max_rep
    component if_check_max_rep = Mux1();
    component rep_get = LessEqThan(MAX_REPUTATION_SCORE_BITS);
    rep_get.in[0] <== pos_rep - neg_rep;
    rep_get.in[1] <== max_rep;
    if_check_max_rep.c[0] <== 1;
    if_check_max_rep.c[1] <== rep_get.out;
    if_check_max_rep.s <== if_prove_max_rep.out;
    if_check_max_rep.out === 1;
    /* End of check 4 */

    /* 5. Check pre-image of graffiti */
    component if_check_graffiti = Mux1();
    component graffiti_hasher = Poseidon(2);
    graffiti_hasher.inputs[0] <== graffiti_pre_image;
    graffiti_hasher.inputs[1] <== 0;
    component graffiti_eq = IsEqual();
    graffiti_eq.in[0] <== graffiti_hasher.out;
    graffiti_eq.in[1] <== graffiti;
    if_check_graffiti.c[0] <== 1;
    if_check_graffiti.c[1] <== graffiti_eq.out;
    if_check_graffiti.s <== prove_graffiti;
    if_check_graffiti.out === 1;
    /* End of check 5 */
}
