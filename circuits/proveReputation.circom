include "../node_modules/circomlib/circuits/comparators.circom";
include "./hasherPoseidon.circom";
include "./identityCommitment.circom";
include "./incrementalMerkleTree.circom";
include "./sparseMerkleTree.circom";

template ProveReputation(GST_tree_depth, user_state_tree_depth) {
    // Global state tree leaf: Identity & user state root
    signal private input identity_pk[2];
    signal private input identity_nullifier;
    signal private input identity_trapdoor;
    signal private input user_state_root;
    // Global state tree
    signal private input GST_path_index[GST_tree_depth];
    signal private input GST_path_elements[GST_tree_depth];
    signal input GST_root;
    // Attester to prove attestation from
    signal input attester_id;
    // Attestation by the attester
    signal private input pos_rep;
    signal private input neg_rep;
    signal private input graffiti;
    signal private input UST_path_elements[user_state_tree_depth];
    // Condition on repuations to prove
    signal input min_pos_rep;
    signal input max_neg_rep;
    // Graffiti
    signal input graffiti_pre_image;

    var MAX_REPUTATION_SCORE_BITS = 32;


    /* 1. Check if user exists in the Global State Tree */
    component identity_commitment = IdentityCommitment();
    identity_commitment.identity_pk[0] <== identity_pk[0];
    identity_commitment.identity_pk[1] <== identity_pk[1];
    identity_commitment.identity_nullifier <== identity_nullifier;
    identity_commitment.identity_trapdoor <== identity_trapdoor;

    component leaf = HashLeftRight();
    leaf.left <== identity_commitment.out;
    leaf.right <== user_state_root;

    component GST_leaf_exists = LeafExists(GST_tree_depth);
    GST_leaf_exists.leaf <== leaf.hash;
    for (var i = 0; i < GST_tree_depth; i++) {
        GST_leaf_exists.path_index[i] <== GST_path_index[i];
        GST_leaf_exists.path_elements[i] <== GST_path_elements[i];
    }
    GST_leaf_exists.root <== GST_root;
    /* End of check 1*/


    /* 2. Check if the attestation by the attester is in the user state tree */
    component attestation_hasher = Hasher5();
    attestation_hasher.in[0] <== pos_rep;
    attestation_hasher.in[1] <== neg_rep;
    attestation_hasher.in[2] <== graffiti;
    attestation_hasher.in[3] <== 0;
    attestation_hasher.in[4] <== 0;

    component attestation_membership_check = SMTLeafExists(user_state_tree_depth);
    attestation_membership_check.leaf_index <== attester_id;
    attestation_membership_check.leaf <== attestation_hasher.hash;
    for (var i = 0; i < user_state_tree_depth; i++) {
        attestation_membership_check.path_elements[i] <== UST_path_elements[i];
    }
    attestation_membership_check.root <== user_state_root;
    /* End of check 2 */


    /* 3. Check conditions on reputations */
    component pos_rep_get = GreaterThan(MAX_REPUTATION_SCORE_BITS);
    pos_rep_get.in[0] <== pos_rep;
    pos_rep_get.in[1] <== min_pos_rep;
    pos_rep_get.out === 1;

    component neg_rep_lt = LessThan(MAX_REPUTATION_SCORE_BITS);
    neg_rep_lt.in[0] <== neg_rep;
    neg_rep_lt.in[1] <== max_neg_rep;
    neg_rep_lt.out === 1;
    /* End of check 3 */

    /* 4. Check pre-image of graffiti */
    component graffiti_hasher = HashLeftRight();
    graffiti_hasher.left <== graffiti_pre_image;
    graffiti_hasher.right <== 0;
    graffiti_hasher.hash === graffiti;
    /* End of check 4 */
 }