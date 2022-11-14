pragma circom 2.0.0;

/*
    Verify that an epoch key exists in a state tree
*/

include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "./incrementalMerkleTree.circom";
include "./modulo.circom";

template VerifyEpochKey(STATE_TREE_DEPTH, EPOCH_TREE_DEPTH, EPOCH_TREE_ARITY, EPOCH_KEY_NONCE_PER_EPOCH) {
    // Global state tree
    signal input state_tree_indexes[STATE_TREE_DEPTH];
    signal input state_tree_elements[STATE_TREE_DEPTH];
    // Global state tree leaf: Identity & user state root
    signal input identity_nullifier;

    signal input nonce;
    signal input epoch;
    signal input attester_id;
    signal output epoch_key;
    signal output state_tree_root;

    signal input pos_rep;
    signal input neg_rep;
    signal input graffiti;
    signal input timestamp;

    // Some arbitrary data to endorse
    signal input data;

    /* 1. Check if user exists in the Global State Tree */

    // Compute user state tree root
    component leaf_hasher = Poseidon(7);
    leaf_hasher.inputs[0] <== identity_nullifier;
    leaf_hasher.inputs[1] <== attester_id;
    leaf_hasher.inputs[2] <== epoch;
    leaf_hasher.inputs[3] <== pos_rep;
    leaf_hasher.inputs[4] <== neg_rep;
    leaf_hasher.inputs[5] <== graffiti;
    leaf_hasher.inputs[6] <== timestamp;

    component merkletree = MerkleTreeInclusionProof(STATE_TREE_DEPTH);
    merkletree.leaf <== leaf_hasher.out;
    for (var i = 0; i < STATE_TREE_DEPTH; i++) {
        merkletree.path_index[i] <== state_tree_indexes[i];
        merkletree.path_elements[i] <== state_tree_elements[i];
    }
    state_tree_root <== merkletree.root;

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

    component epoch_key_mod = ModuloTreeDepth();
    epoch_key_mod.divisor <== EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH;
    epoch_key_mod.dividend <== epoch_key_hasher.out;
    epoch_key <== epoch_key_mod.remainder;

    /* End of check 3 */
}
