include "../node_modules/circomlib/circuits/comparators.circom";
include "./hasherPoseidon.circom";
include "./incrementalMerkleTree.circom";

template verifyEpochKey(epoch_tree_depth, EPOCH_KEY_NONCE_PER_EPOCH) {
    signal private input identity_nullifier;
    signal private input nonce;
    signal input epoch;
    signal input epoch_key;

    /* 1. Check nonce validity */
    var bitsPerNonce = 8;

    component nonce_lt = LessThan(bitsPerNonce);
    nonce_lt.in[0] <== nonce;
    nonce_lt.in[1] <== EPOCH_KEY_NONCE_PER_EPOCH;
    nonce_lt.out === 1;
    /* End of check 1*/


    /* 2. Check epoch key is computed correctly */
    // 2.1.1 Compute epoch key
    component epochKeyHasher = Hasher5();
    epochKeyHasher.in[0] <== identity_nullifier;
    epochKeyHasher.in[1] <== epoch;
    epochKeyHasher.in[2] <== nonce;
    epochKeyHasher.in[3] <== 0;
    epochKeyHasher.in[4] <== 0;

    signal quotient;
    // 2.1.2 Mod epoch key
    // circom's best practices state that we should avoid using <-- unless
    // we know what we are doing. But this is the only way to perform the
    // modulo operation.
    quotient <-- epochKeyHasher.hash \ (2 ** epoch_tree_depth);

    // 2.1.3 Range check on epoch key
    component epk_lt = LessEqThan(epoch_tree_depth);
    epk_lt.in[0] <== epoch_key;
    epk_lt.in[1] <== 2 ** epoch_tree_depth - 1;
    epk_lt.out === 1;

    // 2.1.4 Range check on quotient
    component quot_lt = LessEqThan(254 - epoch_tree_depth);
    quot_lt.in[0] <== quotient;
    quot_lt.in[1] <== 2 ** (254 - epoch_tree_depth) - 1;
    quot_lt.out === 1;

    // 2.1.5 Check equality
    epochKeyHasher.hash === quotient * (2 ** epoch_tree_depth) + epoch_key;
    /* End of check 2*/
}