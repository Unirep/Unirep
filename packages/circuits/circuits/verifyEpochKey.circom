/*
    Verify that an epoch key exists in a state tree
*/

include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "./incrementalMerkleTree.circom";
include "./modulo.circom";

template VerifyEpochKey(GST_TREE_DEPTH, EPOCH_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH) {
    // Global state tree
    signal private input gst_path_index[GST_TREE_DEPTH];
    signal private input gst_path_elements[GST_TREE_DEPTH];
    // Global state tree leaf: Identity & user state root
    signal private input identity_nullifier;

    signal private input nonce;
    signal input epoch;
    signal input attester_id;
    signal output epoch_key;
    signal output gst_root;

    signal private input pos_rep;
    signal private input neg_rep;

    /* 1. Check if user exists in the Global State Tree */

    // Compute user state tree root
    component leaf_hasher = Poseidon(5);
    leaf_hasher.inputs[0] <== identity_nullifier;
    leaf_hasher.inputs[1] <== attester_id;
    leaf_hasher.inputs[2] <== epoch;
    leaf_hasher.inputs[3] <== pos_rep;
    leaf_hasher.inputs[4] <== neg_rep;

    component merkletree = MerkleTreeInclusionProof(GST_TREE_DEPTH);
    merkletree.leaf <== leaf_hasher.out;
    for (var i = 0; i < GST_TREE_DEPTH; i++) {
        merkletree.path_index[i] <== gst_path_index[i];
        merkletree.path_elements[i] <== gst_path_elements[i];
    }
    gst_root <== merkletree.root;

    /* End of check 1 */

    /* 2. Check nonce validity */

    var bitsPerNonce = 8;
    component nonce_lt = LessThan(bitsPerNonce);
    nonce_lt.in[0] <== nonce;
    nonce_lt.in[1] <== EPOCH_KEY_NONCE_PER_EPOCH;
    nonce_lt.out === 1;

    /* End of check 2*/

    /* 3. Output an epoch key */

    component epoch_key_hasher = Poseidon(4);
    epoch_key_hasher.inputs[0] <== identity_nullifier;
    epoch_key_hasher.inputs[1] <== attester_id;
    epoch_key_hasher.inputs[2] <== epoch;
    epoch_key_hasher.inputs[3] <== nonce;

    component epoch_key_mod = ModuloTreeDepth(EPOCH_TREE_DEPTH);
    epoch_key_mod.dividend <== epoch_key_hasher.out;
    epoch_key <== epoch_key_mod.remainder;

    /* End of check 3 */
}
