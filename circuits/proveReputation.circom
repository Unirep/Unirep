include "../node_modules/circomlib/circuits/comparators.circom";
include "./hasherPoseidon.circom";
include "./identityCommitment.circom";
include "./incrementalMerkleTree.circom";
include "./sparseMerkleTree.circom";

template ProveReputation(GST_tree_depth, user_state_tree_depth, nullifier_tree_depth, EPOCH_KEY_NONCE_PER_EPOCH) {
    signal input epoch;
    signal private input nonce;

    // Global state tree leaf: Identity & user state root
    signal private input identity_pk[2];
    signal private input identity_nullifier;
    signal private input identity_trapdoor;
    signal private input user_state_root;
    // Global state tree
    signal private input GST_path_index[GST_tree_depth];
    signal private input GST_path_elements[GST_tree_depth][1];
    signal input GST_root;
    // Nullifier tree
    signal input nullifier_tree_root
    signal private input nullifier_path_elements[nullifier_tree_depth][1];
    // Attester to prove reputation from
    signal input attester_id;
    // Attestation by the attester
    signal private input pos_rep;
    signal private input neg_rep;
    signal private input graffiti;
    signal private input UST_path_elements[user_state_tree_depth][1];
    // Condition on repuations to prove
    signal input min_pos_rep;
    signal input max_neg_rep;
    // Graffiti
    signal input graffiti_pre_image;

    var MAX_REPUTATION_SCORE_BITS = 252;


    /* 1. Check nonce validity */
    var bitsPerNonce = 8;

    component nonce_lt = LessThan(bitsPerNonce);
    nonce_lt.in[0] <== nonce;
    nonce_lt.in[1] <== EPOCH_KEY_NONCE_PER_EPOCH;
    nonce_lt.out === 1;
    /* End of check 1 */

    /* 2. Check if user exists in the Global State Tree */
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
        GST_leaf_exists.path_elements[i][0] <== GST_path_elements[i][0];
    }
    GST_leaf_exists.root <== GST_root;
    /* End of check 2 */


    /* 3. Check if the reputation given by the attester is in the user state tree */
    component reputation_hasher = Hasher5();
    reputation_hasher.in[0] <== pos_rep;
    reputation_hasher.in[1] <== neg_rep;
    reputation_hasher.in[2] <== graffiti;
    reputation_hasher.in[3] <== 0;
    reputation_hasher.in[4] <== 0;

    component reputation_membership_check = SMTLeafExists(user_state_tree_depth);
    reputation_membership_check.leaf_index <== attester_id;
    reputation_membership_check.leaf <== reputation_hasher.hash;
    for (var i = 0; i < user_state_tree_depth; i++) {
        reputation_membership_check.path_elements[i][0] <== UST_path_elements[i][0];
    }
    reputation_membership_check.root <== user_state_root;
    /* End of check 3 */


    /* 4. Check it's latest epoch the user transition to */
    // We check that nullifier of the epoch key is not seen before.
    // 4.1.1 Compute nullifier of the epoch key
    component epoch_key_nullifier_hasher = Hasher5();
    epoch_key_nullifier_hasher.in[0] <== 2;  // 2 is the domain separator for epoch key nullifier
    epoch_key_nullifier_hasher.in[1] <== identity_nullifier;
    epoch_key_nullifier_hasher.in[2] <== epoch;
    epoch_key_nullifier_hasher.in[3] <== nonce;
    epoch_key_nullifier_hasher.in[4] <== 0;
    // 4.1.2 Mod nullifier hash
    // circom's best practices state that we should avoid using <-- unless
    // we know what we are doing. But this is the only way to perform the
    // modulo operation.
    signal epk_nul_quotient;
    component epk_nul_quot_lt;
    signal epk_nullifier_hash_moded;
    component epk_nul_lt;
    epk_nul_quotient <-- epoch_key_nullifier_hasher.hash \ (2 ** nullifier_tree_depth);
    epk_nullifier_hash_moded <-- epoch_key_nullifier_hasher.hash % (2 ** nullifier_tree_depth);
    // 4.1.3 Range check on moded nullifier
    epk_nul_lt = LessEqThan(nullifier_tree_depth);
    epk_nul_lt.in[0] <== epk_nullifier_hash_moded;
    epk_nul_lt.in[1] <== 2 ** nullifier_tree_depth - 1;
    epk_nul_lt.out === 1;
    // 4.1.4 Range check on epk_nul_quotient
    epk_nul_quot_lt = LessEqThan(254 - nullifier_tree_depth);
    epk_nul_quot_lt.in[0] <== epk_nul_quotient;
    epk_nul_quot_lt.in[1] <== 2 ** (254 - nullifier_tree_depth) - 1;
    epk_nul_quot_lt.out === 1;
    // 4.1.5 Check equality
    epoch_key_nullifier_hasher.hash === epk_nul_quotient * (2 ** nullifier_tree_depth) + epk_nullifier_hash_moded;

    // 4.2 Verify non-membership of the nullifier in nullifier tree
    // Unseen nullifier leaf should have value hashLeftRight(0, 0)
    signal zero_leaf;
    component zero_leaf_hasher = HashLeftRight();
    zero_leaf_hasher.left <== 0;
    zero_leaf_hasher.right <== 0;
    zero_leaf <== zero_leaf_hasher.hash;

    component epk_exists = SMTLeafExists(nullifier_tree_depth);
    epk_exists.leaf_index <== epk_nullifier_hash_moded;
    epk_exists.leaf <== zero_leaf;
    epk_exists.root <== nullifier_tree_root;
    for (var i = 0; i < nullifier_tree_depth; i++) {
        epk_exists.path_elements[i][0] <== nullifier_path_elements[i][0];
    }
    /* End of check 4 */


    /* 5. Check conditions on reputations */
    component pos_rep_gt = GreaterThan(MAX_REPUTATION_SCORE_BITS);
    pos_rep_gt.in[0] <== pos_rep;
    pos_rep_gt.in[1] <== min_pos_rep;
    pos_rep_gt.out === 1;

    component neg_rep_lt = LessThan(MAX_REPUTATION_SCORE_BITS);
    neg_rep_lt.in[0] <== neg_rep;
    neg_rep_lt.in[1] <== max_neg_rep;
    neg_rep_lt.out === 1;
    /* End of check 5 */

    /* 6. Check pre-image of graffiti */
    component graffiti_hasher = HashLeftRight();
    graffiti_hasher.left <== graffiti_pre_image;
    graffiti_hasher.right <== 0;
    graffiti_hasher.hash === graffiti;
    /* End of check 6 */
 }