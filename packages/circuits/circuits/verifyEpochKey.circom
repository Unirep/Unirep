pragma circom 2.0.0;

/*
    Verify that an epoch key exists in a state tree
*/

include "./circomlib/circuits/poseidon.circom";
include "./circomlib/circuits/bitify.circom";
include "./incrementalMerkleTree.circom";

template VerifyEpochKey(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH) {
    // Global state tree
    signal input state_tree_indexes[STATE_TREE_DEPTH];
    signal input state_tree_elements[STATE_TREE_DEPTH];
    // Global state tree leaf: Identity & user state root
    signal input identity_nullifier;

    signal output epoch_key;
    signal output state_tree_root;

    signal input pos_rep;
    signal input neg_rep;
    signal input graffiti;
    signal input timestamp;

    // Some arbitrary data to endorse
    signal input data;

    /**
     * Optionally reveal nonce, epoch, attester_id
     **/
    signal output control_output;

    /**
     * 8 bits nonce
     * 64 bits epoch
     * 160 bits attester_id
     * 1 bit reveal nonce
     **/
    signal input control;

    // no bits above 233 should be set
    control \ (2 ** 233) === 0;

    signal reveal_nonce <-- control \ 2 ** 232;
    signal attester_id <-- (control \ 2 ** 72) & (2**160 - 1);
    signal epoch <-- (control \ 2 ** 8) & (2**64 - 1);
    signal nonce <-- control & (2 ** 8 - 1);

    // individual range check
    reveal_nonce \ 2 === 0;
    attester_id \ 2**160 === 0;
    epoch \ 2**64 === 0;
    nonce \ 2**8 === 0;

    // check extracted value
    control === reveal_nonce * 2**232 + attester_id * 2**72 + epoch * 2**8 + nonce;

    // generate the public params
    control_output <== reveal_nonce * (2 ** 232) + attester_id * 2**72 + epoch * 2**8 + reveal_nonce * nonce;

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

    nonce \ EPOCH_KEY_NONCE_PER_EPOCH === 0;

    /* End of check 2*/

    /* 3. Output an epoch key */

    component epoch_key_hasher = Poseidon(4);
    epoch_key_hasher.inputs[0] <== identity_nullifier;
    epoch_key_hasher.inputs[1] <== attester_id;
    epoch_key_hasher.inputs[2] <== epoch;
    epoch_key_hasher.inputs[3] <== nonce;

    epoch_key <== epoch_key_hasher.out;

    /* End of check 3 */
}
