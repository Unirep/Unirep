pragma circom 2.0.0;

include "./circomlib/circuits/poseidon.circom";
include "./circomlib/circuits/comparators.circom";
include "./circomlib/circuits/mux1.circom";
include "./circomlib/circuits/gates.circom";
include "./sparseMerkleTree.circom";
include "./incrementalMerkleTree.circom";
include "./modulo.circom";
include "./orderedMerkleTree.circom";

template UserStateTransition(STATE_TREE_DEPTH, EPOCH_TREE_DEPTH, EPOCH_TREE_ARITY, EPOCH_KEY_NONCE_PER_EPOCH, MAX_REPUTATION_SCORE_BITS) {
    signal input from_epoch;
    signal input to_epoch;

    // Global state tree leaf: Identity & user state root
    signal input identity_nullifier;
    // Global state tree
    signal input state_tree_indexes[STATE_TREE_DEPTH];
    signal input state_tree_elements[STATE_TREE_DEPTH][1];
    signal output state_tree_root;
    signal output state_tree_leaf;
    // Attester to prove reputation from
    signal input attester_id;
    // Attestation by the attester
    signal input pos_rep;
    signal input neg_rep;
    signal input graffiti;
    signal input timestamp;

    // prove what we've received in from epoch
    signal input epoch_tree_root;
    signal input new_pos_rep[EPOCH_KEY_NONCE_PER_EPOCH];
    signal input new_neg_rep[EPOCH_KEY_NONCE_PER_EPOCH];
    signal input new_graffiti[EPOCH_KEY_NONCE_PER_EPOCH];
    signal input new_timestamp[EPOCH_KEY_NONCE_PER_EPOCH];

    signal input epoch_tree_elements[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_DEPTH][EPOCH_TREE_ARITY];
    signal input epoch_tree_indexes[EPOCH_KEY_NONCE_PER_EPOCH];

    signal input noninclusion_siblings[EPOCH_KEY_NONCE_PER_EPOCH][2];
    signal input noninclusion_sibling_index[EPOCH_KEY_NONCE_PER_EPOCH];
    signal input noninclusion_elements[2*EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_DEPTH][EPOCH_TREE_ARITY];

    signal output transition_nullifier;

    component epoch_check = GreaterThan(MAX_REPUTATION_SCORE_BITS);
    epoch_check.in[0] <== to_epoch;
    epoch_check.in[1] <== from_epoch;
    epoch_check.out === 1;

    /* 1. Check if user exists in the Global State Tree */

    component leaf_hasher = Poseidon(7);
    leaf_hasher.inputs[0] <== identity_nullifier;
    leaf_hasher.inputs[1] <== attester_id;
    leaf_hasher.inputs[2] <== from_epoch;
    leaf_hasher.inputs[3] <== pos_rep;
    leaf_hasher.inputs[4] <== neg_rep;
    leaf_hasher.inputs[5] <== graffiti;
    leaf_hasher.inputs[6] <== timestamp;

    component state_merkletree = MerkleTreeInclusionProof(STATE_TREE_DEPTH);
    state_merkletree.leaf <== leaf_hasher.out;
    for (var i = 0; i < STATE_TREE_DEPTH; i++) {
        state_merkletree.path_index[i] <== state_tree_indexes[i];
        state_merkletree.path_elements[i] <== state_tree_elements[i][0];
    }
    state_tree_root <== state_merkletree.root;

    /* End of check 1 */

    /* 2. Verify new reputation for the from epoch */

    component epoch_key_hashers[EPOCH_KEY_NONCE_PER_EPOCH];
    component leaf_hashers[EPOCH_KEY_NONCE_PER_EPOCH];
    for (var i = 0; i < EPOCH_KEY_NONCE_PER_EPOCH; i++) {
        epoch_key_hashers[i] = Poseidon(4);
        epoch_key_hashers[i].inputs[0] <== identity_nullifier;
        epoch_key_hashers[i].inputs[1] <== attester_id;
        epoch_key_hashers[i].inputs[2] <== from_epoch;
        epoch_key_hashers[i].inputs[3] <== i;

        leaf_hashers[i] = Poseidon(5);
        leaf_hashers[i].inputs[0] <== epoch_key_hashers[i].out;
        leaf_hashers[i].inputs[1] <== new_pos_rep[i];
        leaf_hashers[i].inputs[2] <== new_neg_rep[i];
        leaf_hashers[i].inputs[3] <== new_graffiti[i];
        leaf_hashers[i].inputs[4] <== new_timestamp[i];
    }

    // if the leaf balance is 0 we do a non-inclusion
    // else we do an inclusion

    component zero_check[EPOCH_KEY_NONCE_PER_EPOCH];
    component not_zero[EPOCH_KEY_NONCE_PER_EPOCH];
    component inclusion[EPOCH_KEY_NONCE_PER_EPOCH];
    component noninclusion[EPOCH_KEY_NONCE_PER_EPOCH];
    signal int1[EPOCH_KEY_NONCE_PER_EPOCH];
    signal int2[EPOCH_KEY_NONCE_PER_EPOCH];
    for (var i = 0; i < EPOCH_KEY_NONCE_PER_EPOCH; i++) {
        zero_check[i] = IsZero();
        zero_check[i].in <== new_pos_rep[i] + new_neg_rep[i] + new_graffiti[i] + new_timestamp[i];
        not_zero[i] = NOT();
        not_zero[i].in <== zero_check[i].out;

        inclusion[i] = SMTInclusionProof(EPOCH_TREE_DEPTH, EPOCH_TREE_ARITY);
        inclusion[i].leaf_index <== epoch_tree_indexes[i];
        inclusion[i].leaf <== leaf_hashers[i].out;
        for (var j = 0; j < EPOCH_TREE_DEPTH; j++) {
            for (var k = 0; k < EPOCH_TREE_ARITY; k++) {
                inclusion[i].path_elements[j][k] <== epoch_tree_elements[i][j][k];
            }
        }

        noninclusion[i] = OMTNoninclusionProof(EPOCH_TREE_DEPTH, EPOCH_TREE_ARITY);

        noninclusion[i].leaf <== leaf_hashers[i].out;

        noninclusion[i].sibling_leaves[0] <== noninclusion_siblings[i][0];
        noninclusion[i].sibling_leaves[1] <== noninclusion_siblings[i][1];
        noninclusion[i].sibling_index <== noninclusion_sibling_index[i];
        for (var j = 0; j < EPOCH_TREE_DEPTH; j++) {
            for (var k = 0; k < EPOCH_TREE_ARITY; k++) {
                noninclusion[i].path_elements[0][j][k] <== noninclusion_elements[2*i][j][k];
            }
        }
        for (var j = 0; j < EPOCH_TREE_DEPTH; j++) {
            for (var k = 0; k < EPOCH_TREE_ARITY; k++) {
                noninclusion[i].path_elements[1][j][k] <== noninclusion_elements[2*i+1][j][k];
            }
        }

        // check root
        int1[i] <== not_zero[i].out * inclusion[i].root;
        int2[i] <== zero_check[i].out * noninclusion[i].root;
        epoch_tree_root === int1[i] + int2[i];
    }


    /*

    component new_leaf_hasher[EPOCH_KEY_NONCE_PER_EPOCH];

    for (var i = 0; i < EPOCH_KEY_NONCE_PER_EPOCH; i++) {
        epoch_tree_membership[i] = SMTInclusionProof(EPOCH_TREE_DEPTH, EPOCH_TREE_ARITY);
        epoch_tree_membership[i].leaf_index <== epoch_key_mods[i].remainder;
        for (var j = 0; j < EPOCH_TREE_DEPTH; j++) {
            for (var k = 0; k < EPOCH_TREE_ARITY; k++) {
                epoch_tree_membership[i].path_elements[j][k] <== epoch_tree_elements[i][j][k];
            }
        }
        // calculate leaf
        new_leaf_hasher[i] = Poseidon(4);
        new_leaf_hasher[i].inputs[0] <== new_pos_rep[i];
        new_leaf_hasher[i].inputs[1] <== new_neg_rep[i];
        new_leaf_hasher[i].inputs[2] <== new_graffiti[i];
        new_leaf_hasher[i].inputs[3] <== new_timestamp[i];
        epoch_tree_membership[i].leaf <== new_leaf_hasher[i].out;
        // check root
        epoch_tree_root === epoch_tree_membership[i].root;
    }
    */

    /* End of check 2 */

    /* 3. Calculate the new gst leaf */

    var final_pos_rep = pos_rep;
    var final_neg_rep = neg_rep;
    var final_graffiti = graffiti;
    var final_timestamp = timestamp;

    component timestamp_check[EPOCH_KEY_NONCE_PER_EPOCH];
    component graffiti_select[EPOCH_KEY_NONCE_PER_EPOCH];

    for (var i = 0; i < EPOCH_KEY_NONCE_PER_EPOCH; i++) {
        final_pos_rep += new_pos_rep[i];
        final_neg_rep += new_neg_rep[i];
        // if timestamp is > final_timestamp we take the graffiti
        // timestamp must be smaller than 2^64
        timestamp_check[i] = GreaterThan(64);
        timestamp_check[i].in[0] <== new_timestamp[i];
        timestamp_check[i].in[1] <== final_timestamp;
        graffiti_select[i] = MultiMux1(2);
        graffiti_select[i].c[0][0] <== final_timestamp;
        graffiti_select[i].c[0][1] <== new_timestamp[i];
        graffiti_select[i].c[1][0] <== final_graffiti;
        graffiti_select[i].c[1][1] <== new_graffiti[i];
        graffiti_select[i].s <== timestamp_check[i].out;
        final_timestamp = graffiti_select[i].out[0];
        final_graffiti = graffiti_select[i].out[1];
    }

    component out_leaf_hasher = Poseidon(7);
    out_leaf_hasher.inputs[0] <== identity_nullifier;
    out_leaf_hasher.inputs[1] <== attester_id;
    out_leaf_hasher.inputs[2] <== to_epoch;
    out_leaf_hasher.inputs[3] <== final_pos_rep;
    out_leaf_hasher.inputs[4] <== final_neg_rep;
    out_leaf_hasher.inputs[5] <== final_graffiti;
    out_leaf_hasher.inputs[6] <== final_timestamp;
    state_tree_leaf <== out_leaf_hasher.out;

    /* End of check 3 */

    /* 4. Output epoch transition nullifier */

    component nullifier_hasher = Poseidon(3);
    nullifier_hasher.inputs[0] <== attester_id;
    nullifier_hasher.inputs[1] <== from_epoch;
    nullifier_hasher.inputs[2] <== identity_nullifier;
    transition_nullifier <== nullifier_hasher.out;

    /* End of check 4 */
}
