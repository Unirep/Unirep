pragma circom 2.0.0;

/*
    Verify that an epoch key exists in a state tree
*/

include "./circomlib/circuits/poseidon.circom";
include "./circomlib/circuits/bitify.circom";
include "./incrementalMerkleTree.circom";
include "./epochKeyLite.circom";

template VerifyEpochKey(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH) {
    // Global state tree
    signal input state_tree_indexes[STATE_TREE_DEPTH];
    signal input state_tree_elements[STATE_TREE_DEPTH];
    // Global state tree leaf: Identity & user state root
    signal input identity_secret;

    signal output epoch_key;
    signal output state_tree_root;

    signal input reveal_nonce;
    signal input attester_id;
    signal input epoch;
    signal input nonce;

    signal input pos_rep;
    signal input neg_rep;
    signal input graffiti;
    signal input timestamp;

    // Some arbitrary data to endorse
    signal input data;

    /**
     * Optionally reveal nonce, epoch, attester_id
     **/
    signal output control;

    /* 1. Check if user exists in the Global State Tree */

    // Compute user state tree root
    component leaf_hasher = Poseidon(7);
    leaf_hasher.inputs[0] <== identity_secret;
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

    /* 2. Check epoch key validity */

    component epoch_key_lite = EpochKeyLite(EPOCH_KEY_NONCE_PER_EPOCH);
    epoch_key_lite.identity_secret <== identity_secret;
    epoch_key_lite.reveal_nonce <== reveal_nonce;
    epoch_key_lite.attester_id <== attester_id;
    epoch_key_lite.epoch <== epoch;
    epoch_key_lite.nonce <== nonce;
    epoch_key_lite.data <== data;
    control <== epoch_key_lite.control;
    epoch_key <== epoch_key_lite.epoch_key;
    /* End of check 2*/
}
