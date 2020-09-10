include "../node_modules/circomlib/circuits/comparators.circom";
include "./hasherPoseidon.circom";
include "./identityCommitment.circom";
include "./incrementalMerkleTree.circom";

template VerifyEpochKey(GST_tree_depth, epoch_tree_depth) {
    signal private input identity_pk[2];
    signal private input identity_nullifier;
    signal private input identity_trapdoor;

    signal private input user_state_root;

    signal private input path_elements[GST_tree_depth][1];
    signal private input path_index[GST_tree_depth];
    signal input root;

    signal private input nonce;
    signal input max_nonce;
    signal input epoch;
    signal input epoch_key;

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
        GST_leaf_exists.path_index[i] <== path_index[i];
        GST_leaf_exists.path_elements[i][0] <== path_elements[i][0];
    }
    GST_leaf_exists.root <== root;
    /* End of check 1*/


    /* 2. Check nonce validity */
    var maxNonceInBits = 8;

    component nonce_lt = LessEqThan(maxNonceInBits);
    nonce_lt.in[0] <== nonce;
    nonce_lt.in[1] <== max_nonce;
    nonce_lt.out === 1;
    /* End of check 2*/


    /* 3. Check epoch key is computed correctly */
    // 3.1.1 Compute epoch key
    component epochKeyHasher = Hasher5();
    epochKeyHasher.in[0] <== identity_nullifier;
    epochKeyHasher.in[1] <== epoch;
    epochKeyHasher.in[2] <== nonce;
    epochKeyHasher.in[3] <== 0;
    epochKeyHasher.in[4] <== 0;

    signal quotient;
    // 3.1.2 Mod epoch key
    // circom's best practices state that we should avoid using <-- unless
    // we know what we are doing. But this is the only way to perform the
    // modulo operation.
    quotient <-- epochKeyHasher.hash \ (2 ** epoch_tree_depth);

    // 3.1.3 Range check on epoch key
    component epk_lt = LessEqThan(epoch_tree_depth);
    epk_lt.in[0] <== epoch_key;
    epk_lt.in[1] <== 2 ** epoch_tree_depth - 1;
    epk_lt.out === 1;

    // 3.1.4 Range check on quotient
    component quot_lt = LessEqThan(254 - epoch_tree_depth);
    quot_lt.in[0] <== quotient;
    quot_lt.in[1] <== 2 ** (254 - epoch_tree_depth) - 1;
    quot_lt.out === 1;

    // 3.1.5 Check equality
    epochKeyHasher.hash === quotient * (2 ** epoch_tree_depth) + epoch_key;
    /* End of check 3*/
}