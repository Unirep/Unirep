include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "./hasherPoseidon.circom";
include "./identityCommitment.circom";
include "./globalStateTree.circom";

template VerifyEpochKey(GST_tree_depth) {
    signal private input identity_pk[2];
    signal private input identity_nullifier;
    signal private input identity_trapdoor;

    signal private input user_state_root;

    signal private input path_elements[GST_tree_depth];
    signal private input path_index[GST_tree_depth];
    signal input root;

    signal private input nonce;
    signal input epoch_key;

    /* Check if user exists in the Global State Tree */
    component GST_leaf_exists = GSTLeafExists(GST_tree_depth);
    GST_leaf_exists.identity_pk[0] <== identity_pk[0];
    GST_leaf_exists.identity_pk[1] <== identity_pk[1];
    GST_leaf_exists.identity_nullifier <== identity_nullifier;
    GST_leaf_exists.identity_trapdoor <== identity_trapdoor;
    GST_leaf_exists.user_state_root <== user_state_root;
    for (var i = 0; i < GST_tree_depth; i++) {
        GST_leaf_exists.path_index[i] <== path_index[i];
        GST_leaf_exists.path_elements[i] <== path_elements[i];
    }
    GST_leaf_exists.root <== root;
    /* End of check*/


    /* Check nonce validity */
    var maxNonceInBits = 2;
    var maxEpochKeyNonce = 2;

    component lt = LessEqThan(maxNonceInBits);
    lt.in[0] <== nonce;
    lt.in[1] <== maxEpochKeyNonce;
    lt.out === 1;
    /* End of check*/


    /* Check epoch key is computed correctly */
    // TODO
    /* End of check*/
}