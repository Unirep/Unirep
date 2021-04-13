include "../node_modules/circomlib/circuits/comparators.circom";
include "./hasherPoseidon.circom";
include "./identityCommitment.circom";
include "./incrementalMerkleTree.circom";
include "./modulo.circom";
include "./sparseMerkleTree.circom";

function Not(in) {
    return 1 + in - (2 * in);
}

template ProveReputation(
        GST_tree_depth, 
        user_state_tree_depth, 
        nullifier_tree_depth, 
        EPOCH_KEY_NONCE_PER_EPOCH, 
        MAX_REPUTATION_SCORE_BITS, 
        NUM_ATTESTATIONS,
        MAX_KARMA_BUDGET) {
    signal input epoch;
    signal private input nonce;

    // Global state tree leaf: Identity & user state root
    signal private input identity_pk[2];
    signal private input identity_nullifier;
    signal private input identity_trapdoor;
    signal private input user_tree_root;
    signal private input user_state_hash;
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
    // Sum of positive and negative karma
    signal private input positive_karma;
    signal private input negative_karma;
    // Karma nullifier
    signal input prove_karma_nullifiers;
    signal input prove_karma_amount;
    signal private input karma_nonce[MAX_KARMA_BUDGET];
    signal output karma_nullifiers[MAX_KARMA_BUDGET];
    // Prove the minimum reputation
    signal input prove_min_rep;
    signal input min_rep;

    /* 1. Check nonce validity */
    var bitsPerNonce = 8;

    component nonce_lt = LessThan(bitsPerNonce);
    nonce_lt.in[0] <== nonce;
    nonce_lt.in[1] <== EPOCH_KEY_NONCE_PER_EPOCH;
    nonce_lt.out === 1;
    /* End of check 1 */

    
    /* 2. Check if the reputation given by the attester is in the user state tree */
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

    reputation_membership_check.root <== user_tree_root;
    /* End of check 2 */


    /* 3. Check if user exists in the Global State Tree */
    component identity_commitment = IdentityCommitment();
    identity_commitment.identity_pk[0] <== identity_pk[0];
    identity_commitment.identity_pk[1] <== identity_pk[1];
    identity_commitment.identity_nullifier <== identity_nullifier;
    identity_commitment.identity_trapdoor <== identity_trapdoor;

    // 3.1 Compute user state tree root
    component state = HashLeftRight();
    state.left <== identity_commitment.out;
    state.right <== user_tree_root;

    // 3.2 Compute hashed karma
    component karma = HashLeftRight();
    karma.left <== positive_karma;
    karma.right <== negative_karma;

    // 3.3 Compute hashed leaf
    component leaf = HashLeftRight();
    leaf.left <== state.hash;
    leaf.right <== karma.hash;

    // 3.4 Check computed hash == user state tree leaf
    leaf.hash === user_state_hash;

    // 3.6 Check if user state hash is in GST
    component GST_leaf_exists = LeafExists(GST_tree_depth);
    GST_leaf_exists.leaf <== leaf.hash;
    for (var i = 0; i < GST_tree_depth; i++) {
        GST_leaf_exists.path_index[i] <== GST_path_index[i];
        GST_leaf_exists.path_elements[i][0] <== GST_path_elements[i][0];
    }
    GST_leaf_exists.root <== GST_root;
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
    signal epk_nullifier_hash_moded;
    component modEPKNullifier = ModuloTreeDepth(nullifier_tree_depth);
    modEPKNullifier.dividend <== epoch_key_nullifier_hasher.hash;
    epk_nullifier_hash_moded <== modEPKNullifier.remainder;

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


    /* 5. Check total reputation is greater than 0 */
    // if user wants to spend karma and prove total_reputation, it requires reputation to be positive
    // total_reputation = positive_karma - negative_karma >= 0
    component pos_rep_get = GreaterEqThan(MAX_REPUTATION_SCORE_BITS);
    pos_rep_get.in[0] <== positive_karma;
    pos_rep_get.in[1] <== negative_karma;
    pos_rep_get.out === 1;
    /* End of check 5*/


    /* 6. Check nullifiers are valid */
    component karma_nullifier_hasher[MAX_KARMA_BUDGET];
    component nonce_gt[MAX_KARMA_BUDGET];
    for(var i = 0; i< MAX_KARMA_BUDGET; i++) {
        // 6.1 verify is nonce is valid
        // If user wants to generate karma nullifiers, check if positive_karma - negative_karma > karma_nonce
        // Eg. if we have 10 karma, we have 0-9 valid nonce
        nonce_gt[i] = GreaterThan(MAX_REPUTATION_SCORE_BITS);
        nonce_gt[i].in[0] <== positive_karma - negative_karma;
        nonce_gt[i].in[1] <== karma_nonce[i];
        nonce_gt[i].out * prove_karma_nullifiers + Not(prove_karma_nullifiers) === 1;
        
        // 6.2 Use karma_nonce to compute all karma nullifiers
        karma_nullifier_hasher[i] = Hasher5();
        karma_nullifier_hasher[i].in[0] <== 3; // 3 is the domain separator for karma nullifier
        karma_nullifier_hasher[i].in[1] <== identity_nullifier;
        karma_nullifier_hasher[i].in[2] <== epoch;
        karma_nullifier_hasher[i].in[3] <== karma_nonce[i];
        karma_nullifier_hasher[i].in[4] <== 0;
        karma_nullifiers[i] <== karma_nullifier_hasher[i].hash;
    }
    /* End of check 6 */


    /* 7. Check if user has reputation greater than min_rep */
    component rep_get = GreaterEqThan(MAX_REPUTATION_SCORE_BITS);
    rep_get.in[0] <== positive_karma - negative_karma;
    rep_get.in[1] <== min_rep;
    rep_get.out * prove_min_rep + Not(prove_min_rep) === 1;
    /* End of check 7 */

    // if prove_pos_rep == TRUE then check GT
    // else return TRUE
    // component pos_rep_gt = GreaterThan(MAX_REPUTATION_SCORE_BITS);
    // pos_rep_gt.in[0] <== pos_rep;
    // pos_rep_gt.in[1] <== min_pos_rep;
    // pos_rep_gt.out * prove_pos_rep + Not(prove_pos_rep) === 1;

    
    // component neg_rep_lt = LessThan(MAX_REPUTATION_SCORE_BITS);
    // neg_rep_lt.in[0] <== neg_rep;
    // neg_rep_lt.in[1] <== max_neg_rep;
    // neg_rep_lt.out * prove_neg_rep + Not(prove_neg_rep) === 1;

    // only valid if pos_rep >= neg_rep
    // component rep_diff_get = GreaterEqThan(MAX_REPUTATION_SCORE_BITS);
    // rep_diff_get.in[0] <== pos_rep;
    // rep_diff_get.in[1] <== neg_rep;
    // // check if (pos_rep - neg_rep) > min_rep_diff
    // component rep_diff_gt = GreaterThan(MAX_REPUTATION_SCORE_BITS);
    // rep_diff_gt.in[0] <== pos_rep - neg_rep;
    // rep_diff_gt.in[1] <== min_rep_diff;
    // rep_diff_get.out * prove_rep_diff + Not(prove_rep_diff) === 1;
    // rep_diff_gt.out * prove_rep_diff + Not(prove_rep_diff) === 1;
    
    /* 7. Check pre-image of graffiti */
    // component graffiti_hasher = HashLeftRight();
    // graffiti_hasher.left <== graffiti_pre_image;
    // graffiti_hasher.right <== 0;
    // component graffiti_eq = IsEqual();
    // graffiti_eq.in[0] <== graffiti_hasher.hash;
    // graffiti_eq.in[1] <== graffiti;
    // graffiti_eq.out * prove_graffiti + Not(prove_graffiti) === 1;

    /* End of check 7 */
 }