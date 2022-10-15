pragma circom 2.0.0;

include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/mux1.circom";
include "./sparseMerkleTree.circom";
include "./incrementalMerkleTree.circom";
include "./modulo.circom";

template UserStateTransition(GST_TREE_DEPTH, EPOCH_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, MAX_REPUTATION_SCORE_BITS) {
    signal input from_epoch;
    signal input to_epoch;

    // Global state tree leaf: Identity & user state root
    signal input identity_nullifier;
    // Global state tree
    signal input GST_path_index[GST_TREE_DEPTH];
    signal input GST_path_elements[GST_TREE_DEPTH][1];
    signal output gst_root;
    signal output gst_leaf;
    // Attester to prove reputation from
    signal input attester_id;
    // Attestation by the attester
    signal input pos_rep;
    signal input neg_rep;
    signal input graffiti;
    signal input timestamp;
    // signal input graffiti;
    // Graffiti - todo?
    // signal input prove_graffiti;
    // signal input graffiti_pre_image;

    // prove what we've received in from epoch
    signal input epoch_tree_root;
    signal input new_pos_rep[EPOCH_KEY_NONCE_PER_EPOCH];
    signal input new_neg_rep[EPOCH_KEY_NONCE_PER_EPOCH];
    signal input new_graffiti[EPOCH_KEY_NONCE_PER_EPOCH];
    signal input new_timestamp[EPOCH_KEY_NONCE_PER_EPOCH];
    signal input epoch_tree_elements[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_DEPTH];
    signal output epoch_transition_nullifier;

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

    component state_merkletree = MerkleTreeInclusionProof(GST_TREE_DEPTH);
    state_merkletree.leaf <== leaf_hasher.out;
    for (var i = 0; i < GST_TREE_DEPTH; i++) {
        state_merkletree.path_index[i] <== GST_path_index[i];
        state_merkletree.path_elements[i] <== GST_path_elements[i][0];
    }
    gst_root <== state_merkletree.root;

    /* End of check 1 */

    /* 2. Verify new reputation for the from epoch */

    component epoch_key_hashers[EPOCH_KEY_NONCE_PER_EPOCH];
    component epoch_key_mods[EPOCH_KEY_NONCE_PER_EPOCH];
    for (var i = 0; i < EPOCH_KEY_NONCE_PER_EPOCH; i++) {
        epoch_key_hashers[i] = Poseidon(4);
        epoch_key_hashers[i].inputs[0] <== identity_nullifier;
        epoch_key_hashers[i].inputs[1] <== attester_id;
        epoch_key_hashers[i].inputs[2] <== from_epoch;
        epoch_key_hashers[i].inputs[3] <== i;

        epoch_key_mods[i] = ModuloTreeDepth(EPOCH_TREE_DEPTH);
        epoch_key_mods[i].dividend <== epoch_key_hashers[i].out;
    }

    component epoch_tree_membership[EPOCH_KEY_NONCE_PER_EPOCH];
    component new_leaf_hasher[EPOCH_KEY_NONCE_PER_EPOCH];

    for (var i = 0; i < EPOCH_KEY_NONCE_PER_EPOCH; i++) {
        epoch_tree_membership[i] = SMTInclusionProof(EPOCH_TREE_DEPTH);
        epoch_tree_membership[i].leaf_index <== epoch_key_mods[i].remainder;
        for (var j = 0; j < EPOCH_TREE_DEPTH; j++) {
            epoch_tree_membership[i].path_elements[j][0] <== epoch_tree_elements[i][j];
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
    gst_leaf <== out_leaf_hasher.out;

    /* End of check 3 */

    /* 4. Output epoch transition nullifier */

    component nullifier_hasher = Poseidon(3);
    nullifier_hasher.inputs[0] <== attester_id;
    nullifier_hasher.inputs[1] <== from_epoch;
    nullifier_hasher.inputs[2] <== identity_nullifier;
    epoch_transition_nullifier <== nullifier_hasher.out;

    /* End of check 4 */
}
