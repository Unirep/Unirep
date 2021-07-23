include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/mux1.circom";
include "./hasherPoseidon.circom";
include "./identityCommitment.circom";
include "./incrementalMerkleTree.circom";
include "./modulo.circom";
include "./sparseMerkleTree.circom";
include "./userExists.circom";
include "./verifiyEpochKey.circom";

template ProveReputationNullifier(
        GST_tree_depth, 
        nullifier_tree_depth,
        epoch_tree_depth,
        EPOCH_KEY_NONCE_PER_EPOCH, 
        MAX_REPUTATION_SCORE_BITS, 
        MAX_KARMA_BUDGET) {
    signal input epoch;
    signal private input nonce;

    // Global state tree leaf: Identity & user state root
    signal private input identity_pk[2];
    signal private input identity_nullifier;
    signal private input identity_trapdoor;
    signal private input user_tree_root;
    signal private input user_state_hash;
    // Generate epoch key from epoch_key_nonce
    signal private input epoch_key_nonce;
    signal input epoch_key;
    // Global state tree
    signal private input GST_path_index[GST_tree_depth];
    signal private input GST_path_elements[GST_tree_depth][1];
    signal input GST_root;
    // Nullifier tree
    signal input nullifier_tree_root
    signal private input nullifier_path_elements[nullifier_tree_depth][1];
    // Sum of positive and negative karma
    signal private input positive_karma;
    signal private input negative_karma;
    // Karma nullifier
    signal private input selectors[MAX_KARMA_BUDGET];
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


    /* 2. Check if user exists in GST and check correctness of epoch key */
    component verify_epoch_key = verifyEpochKey(GST_tree_depth, epoch_tree_depth, EPOCH_KEY_NONCE_PER_EPOCH);
    for (var i = 0; i< GST_tree_depth; i++) {
        verify_epoch_key.GST_path_index[i] <== GST_path_index[i];
        verify_epoch_key.GST_path_elements[i][0] <== GST_path_elements[i][0];
    }
    verify_epoch_key.GST_root <== GST_root;
    verify_epoch_key.identity_pk[0] <== identity_pk[0];
    verify_epoch_key.identity_pk[1] <== identity_pk[1];
    verify_epoch_key.identity_nullifier <== identity_nullifier;
    verify_epoch_key.identity_trapdoor <== identity_trapdoor;
    verify_epoch_key.user_tree_root <== user_tree_root;
    verify_epoch_key.user_state_hash <== user_state_hash;
    verify_epoch_key.positive_karma <== positive_karma;
    verify_epoch_key.negative_karma <== negative_karma;
    verify_epoch_key.nonce <== epoch_key_nonce;
    verify_epoch_key.epoch <== epoch;
    verify_epoch_key.epoch_key <== epoch_key;
    /* End of check 2 */


    /* 3. Check it's latest epoch the user transition to */
    // We check that nullifier of the epoch key is not seen before.
    // 3.1.1 Compute nullifier of the epoch key
    component epoch_key_nullifier_hasher = Hasher5();
    epoch_key_nullifier_hasher.in[0] <== 2;  // 2 is the domain separator for epoch key nullifier
    epoch_key_nullifier_hasher.in[1] <== identity_nullifier;
    epoch_key_nullifier_hasher.in[2] <== epoch;
    epoch_key_nullifier_hasher.in[3] <== nonce;
    epoch_key_nullifier_hasher.in[4] <== 0;
    // 3.1.2 Mod nullifier hash
    // circom's best practices state that we should avoid using <-- unless
    // we know what we are doing. But this is the only way to perform the
    // modulo operation.
    signal epk_nullifier_hash_moded;
    component modEPKNullifier = ModuloTreeDepth(nullifier_tree_depth);
    modEPKNullifier.dividend <== epoch_key_nullifier_hasher.hash;
    epk_nullifier_hash_moded <== modEPKNullifier.remainder;

    // 3.2 Verify non-membership of the nullifier in nullifier tree
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
    /* End of check 3 */


    /* 4. Check total reputation is greater than 0 */
    // if user wants to spend karma and prove total_reputation, it requires reputation to be positive
    // total_reputation = positive_karma - negative_karma >= 0
    component pos_rep_get = GreaterEqThan(MAX_REPUTATION_SCORE_BITS);
    pos_rep_get.in[0] <== positive_karma;
    pos_rep_get.in[1] <== negative_karma;
    pos_rep_get.out === 1;
    /* End of check 4*/


    /* 5. Check nullifiers are valid */
    signal default_nullifier_zero;
    component default_nullifier_zero_hasher = Hasher5();
    default_nullifier_zero_hasher.in[0] <== 0;
    default_nullifier_zero_hasher.in[1] <== 0;
    default_nullifier_zero_hasher.in[2] <== 0;
    default_nullifier_zero_hasher.in[3] <== 0;
    default_nullifier_zero_hasher.in[4] <== 0;
    default_nullifier_zero <== default_nullifier_zero_hasher.hash;

    component if_check_nullifiers[MAX_KARMA_BUDGET];
    component if_output_nullifiers[MAX_KARMA_BUDGET];
    component karma_nullifier_hasher[MAX_KARMA_BUDGET];
    component nonce_gt[MAX_KARMA_BUDGET];
    for(var i = 0; i< MAX_KARMA_BUDGET; i++) {
        // 5.1 verify is nonce is valid
        // If user wants to generate karma nullifiers, check if positive_karma - negative_karma > karma_nonce
        // Eg. if we have 10 karma, we have 0-9 valid nonce
        nonce_gt[i] = GreaterThan(MAX_REPUTATION_SCORE_BITS);
        nonce_gt[i].in[0] <== positive_karma - negative_karma;
        nonce_gt[i].in[1] <== karma_nonce[i];
        if_check_nullifiers[i] = Mux1();
        if_check_nullifiers[i].c[0] <== 1;
        if_check_nullifiers[i].c[1] <== nonce_gt[i].out;
        if_check_nullifiers[i].s <== prove_karma_nullifiers;
        if_check_nullifiers[i].out === 1;

        // 5.2 Use karma_nonce to compute all karma nullifiers
        if_output_nullifiers[i] = Mux1();
        karma_nullifier_hasher[i] = Hasher5();
        karma_nullifier_hasher[i].in[0] <== 1; // 1 is the domain separator for karma nullifier
        karma_nullifier_hasher[i].in[1] <== identity_nullifier;
        karma_nullifier_hasher[i].in[2] <== epoch;
        karma_nullifier_hasher[i].in[3] <== karma_nonce[i];
        karma_nullifier_hasher[i].in[4] <== 0;
        if_output_nullifiers[i].c[0] <== default_nullifier_zero;
        if_output_nullifiers[i].c[1] <== karma_nullifier_hasher[i].hash;
        if_output_nullifiers[i].s <== selectors[i];
        karma_nullifiers[i] <== if_output_nullifiers[i].out;
    }
    /* End of check 5 */


    /* 6. Check if user has reputation greater than min_rep */
    component if_check_min_rep = Mux1();
    component rep_get = GreaterEqThan(MAX_REPUTATION_SCORE_BITS);
    rep_get.in[0] <== positive_karma - negative_karma;
    rep_get.in[1] <== min_rep;
    if_check_min_rep.c[0] <== 1;
    if_check_min_rep.c[1] <== rep_get.out;
    if_check_min_rep.s <== prove_min_rep;
    if_check_min_rep.out === 1;
    /* End of check 6 */
 }