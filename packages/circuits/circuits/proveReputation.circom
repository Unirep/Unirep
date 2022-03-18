/*
    Prove: 
        1. if user has a leaf in an existed global state tree
        2. user state tree has the claimed reputation (pos_rep, neg_rep, graffiti)
        3. output an epoch key
*/

include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/mux1.circom";
include "./hasherPoseidon.circom";
include "./sparseMerkleTree.circom";
include "./verifyEpochKey.circom";

template ProveReputation(GST_tree_depth, user_state_tree_depth, epoch_tree_depth, EPOCH_KEY_NONCE_PER_EPOCH, MAX_REPUTATION_BUDGET, MAX_REPUTATION_SCORE_BITS) {
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
    // Reputation nullifier
    signal input rep_nullifiers_amount;
    signal private input selectors[MAX_REPUTATION_BUDGET];
    signal private input rep_nonce[MAX_REPUTATION_BUDGET];
    signal output rep_nullifiers[MAX_REPUTATION_BUDGET];
    // Prove the minimum reputation
    signal input min_rep;
    // Graffiti
    signal input prove_graffiti;
    signal input graffiti_pre_image;

    /* 0. Validate inputs */
    var sum_selectors = 0;
    for (var i = 0; i < MAX_REPUTATION_BUDGET; i++) {
        selectors[i] * (selectors[i] - 1) === 0;
        sum_selectors = sum_selectors + selectors[i];
    }
    rep_nullifiers_amount === sum_selectors;
    /* End of check 0 */

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
    component reputation_hasher = Hasher5();
    reputation_hasher.in[0] <== pos_rep;
    reputation_hasher.in[1] <== neg_rep;
    reputation_hasher.in[2] <== graffiti;
    reputation_hasher.in[3] <== sign_up;
    reputation_hasher.in[4] <== 0;

    component reputation_membership_check = SMTLeafExists(user_state_tree_depth);
    reputation_membership_check.leaf_index <== attester_id;
    reputation_membership_check.leaf <== reputation_hasher.hash;
    for (var i = 0; i < user_state_tree_depth; i++) {
        reputation_membership_check.path_elements[i][0] <== UST_path_elements[i][0];
    }
    reputation_membership_check.root <== user_tree_root;
    /* End of check 2 */

    /* 3. Check nullifiers are valid */
    // default nullifier value is 0
    var default_nullifier_zero = 0;

    // 3.1 if proving reputation nullifiers > 0, check if rep_nonce is valid
    component if_prove_rep_nullifiers = GreaterThan(MAX_REPUTATION_BUDGET);
    if_prove_rep_nullifiers.in[0] <== rep_nullifiers_amount;
    if_prove_rep_nullifiers.in[1] <== 0;

    component if_check_nullifiers[MAX_REPUTATION_BUDGET];
    component if_output_nullifiers[MAX_REPUTATION_BUDGET];
    component rep_nullifier_hasher[MAX_REPUTATION_BUDGET];
    component nonce_gt[MAX_REPUTATION_BUDGET];
    for(var i = 0; i< MAX_REPUTATION_BUDGET; i++) {
        // 3.2 verify is nonce is valid
        // If user wants to generate rep nullifiers, check if pos_rep - neg_rep > rep_nonce
        // Eg. if we have 10 rep score, we have 0-9 valid nonce
        nonce_gt[i] = GreaterThan(MAX_REPUTATION_SCORE_BITS);
        nonce_gt[i].in[0] <== pos_rep - neg_rep;
        nonce_gt[i].in[1] <== rep_nonce[i];
        if_check_nullifiers[i] = Mux1();
        if_check_nullifiers[i].c[0] <== 1;
        if_check_nullifiers[i].c[1] <== nonce_gt[i].out;
        if_check_nullifiers[i].s <== if_prove_rep_nullifiers.out;
        if_check_nullifiers[i].out === 1;

        // 3.3 Use rep_nonce to compute all reputation nullifiers
        if_output_nullifiers[i] = Mux1();
        rep_nullifier_hasher[i] = Hasher5();
        rep_nullifier_hasher[i].in[0] <== 2; // 2 is the domain separator for reputation nullifier
        rep_nullifier_hasher[i].in[1] <== identity_nullifier;
        rep_nullifier_hasher[i].in[2] <== epoch;
        rep_nullifier_hasher[i].in[3] <== rep_nonce[i];
        rep_nullifier_hasher[i].in[4] <== attester_id; // The reputation nullifier is spent at the attester's app
        if_output_nullifiers[i].c[0] <== default_nullifier_zero;
        if_output_nullifiers[i].c[1] <== rep_nullifier_hasher[i].hash;
        if_output_nullifiers[i].s <== selectors[i] * if_prove_rep_nullifiers.out;
        rep_nullifiers[i] <== if_output_nullifiers[i].out;
    }
    /* End of check 3 */

    /* 4. Check if user has reputation greater than min_rep */
    // 4.1 if proving min_rep > 0, check if pos_rep - neg_rep >= min_rep
    component if_prove_min_rep = GreaterThan(MAX_REPUTATION_BUDGET);
    if_prove_min_rep.in[0] <== min_rep;
    if_prove_min_rep.in[1] <== 0;

    // 4.2 check if pos_rep - neg_rep >= 0 && pos_rep - neg_rep >= min_rep
    component if_check_min_rep = Mux1();
    component rep_get = GreaterEqThan(MAX_REPUTATION_SCORE_BITS);
    rep_get.in[0] <== pos_rep - neg_rep;
    rep_get.in[1] <== min_rep;
    if_check_min_rep.c[0] <== 1;
    if_check_min_rep.c[1] <== rep_get.out;
    if_check_min_rep.s <== if_prove_min_rep.out;
    if_check_min_rep.out === 1;
    /* End of check 4 */

    /* 5. Check pre-image of graffiti */
    component if_check_graffiti = Mux1();
    component graffiti_hasher = HashLeftRight();
    graffiti_hasher.left <== graffiti_pre_image;
    graffiti_hasher.right <== 0;
    component graffiti_eq = IsEqual();
    graffiti_eq.in[0] <== graffiti_hasher.hash;
    graffiti_eq.in[1] <== graffiti;
    if_check_graffiti.c[0] <== 1;
    if_check_graffiti.c[1] <== graffiti_eq.out;
    if_check_graffiti.s <== prove_graffiti;
    if_check_graffiti.out === 1;
    /* End of check 5 */
}