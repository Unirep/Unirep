pragma circom 2.0.0;

/*
    Prove:
        1. if user has a leaf in current state tree
        2. leaf has claimed reputation
        3. current epoch has claimed new reputation
        4. output a chosen epoch key
*/

include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/gates.circom";
include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "./sparseMerkleTree.circom";
include "./incrementalMerkleTree.circom";
include "./modulo.circom";

template ProveReputation(GST_TREE_DEPTH, EPOCH_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, MAX_REPUTATION_SCORE_BITS) {
    signal input epoch;
    signal input epoch_key_nonce;
    signal output epoch_key;

    // Global state tree leaf: Identity & user state root
    signal input identity_nullifier;
    // Global state tree
    signal input GST_path_index[GST_TREE_DEPTH];
    signal input GST_path_elements[GST_TREE_DEPTH][1];
    signal output gst_root;
    // Attester to prove reputation from
    signal input attester_id;
    // Attestation by the attester
    signal input pos_rep;
    signal input neg_rep;
    // signal input graffiti;
    // Prove the minimum reputation
    signal input min_rep;
    // Graffiti - todo?
    // signal input prove_graffiti;
    // signal input graffiti_pre_image;

    // prove what we've received this epoch
    signal input epoch_tree_root;
    signal input new_pos_rep[EPOCH_KEY_NONCE_PER_EPOCH];
    signal input new_neg_rep[EPOCH_KEY_NONCE_PER_EPOCH];
    signal input epoch_tree_elements[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_DEPTH];

    signal output pos_rep_balance;
    signal output neg_rep_balance;

    /* 1a. Check if user exists in the Global State Tree */

    component leaf_hasher = Poseidon(5);
    leaf_hasher.inputs[0] <== identity_nullifier;
    leaf_hasher.inputs[1] <== attester_id;
    leaf_hasher.inputs[2] <== epoch;
    leaf_hasher.inputs[3] <== pos_rep;
    leaf_hasher.inputs[4] <== neg_rep;

    component state_merkletree = MerkleTreeInclusionProof(GST_TREE_DEPTH);
    state_merkletree.leaf <== leaf_hasher.out;
    for (var i = 0; i < GST_TREE_DEPTH; i++) {
        state_merkletree.path_index[i] <== GST_path_index[i];
        state_merkletree.path_elements[i] <== GST_path_elements[i][0];
    }
    gst_root <== state_merkletree.root;

    /* End of check 1a */

    /* 1b. Output epoch key and check nonce range */

    component epoch_key_hashers[EPOCH_KEY_NONCE_PER_EPOCH];
    component epoch_key_mods[EPOCH_KEY_NONCE_PER_EPOCH];
    for (var i = 0; i < EPOCH_KEY_NONCE_PER_EPOCH; i++) {
        epoch_key_hashers[i] = Poseidon(4);
        epoch_key_hashers[i].inputs[0] <== identity_nullifier;
        epoch_key_hashers[i].inputs[1] <== attester_id;
        epoch_key_hashers[i].inputs[2] <== epoch;
        epoch_key_hashers[i].inputs[3] <== i;

        epoch_key_mods[i] = ModuloTreeDepth(EPOCH_TREE_DEPTH);
        epoch_key_mods[i].dividend <== epoch_key_hashers[i].out;
    }

    // TODO: figure out a way to use the above hasher/mod result
    component output_epoch_key_hasher = Poseidon(4);
    output_epoch_key_hasher.inputs[0] <== identity_nullifier;
    output_epoch_key_hasher.inputs[1] <== attester_id;
    output_epoch_key_hasher.inputs[2] <== epoch;
    output_epoch_key_hasher.inputs[3] <== epoch_key_nonce;
    component output_epoch_key_mod = ModuloTreeDepth(EPOCH_TREE_DEPTH);
    output_epoch_key_mod.dividend <== output_epoch_key_hasher.out;
    epoch_key <== output_epoch_key_mod.remainder;

    // check epoch key nonce range
    var bits_per_nonce = 8;
    component nonce_check = LessThan(bits_per_nonce);
    nonce_check.in[0] <== epoch_key_nonce;
    nonce_check.in[1] <== EPOCH_KEY_NONCE_PER_EPOCH;
    nonce_check.out === 1;

    /* End of check 1b */

    /* 2. Verify new reputation from the current epoch */
    component epoch_tree_membership[EPOCH_KEY_NONCE_PER_EPOCH];
    component new_leaf_hasher[EPOCH_KEY_NONCE_PER_EPOCH];

    for (var i = 0; i < EPOCH_KEY_NONCE_PER_EPOCH; i++) {
        epoch_tree_membership[i] = SMTInclusionProof(EPOCH_TREE_DEPTH);
        epoch_tree_membership[i].leaf_index <== epoch_key_mods[i].remainder;
        for (var j = 0; j < EPOCH_TREE_DEPTH; j++) {
            epoch_tree_membership[i].path_elements[j][0] <== epoch_tree_elements[i][j];
        }
        // calculate leaf
        new_leaf_hasher[i] = Poseidon(2);
        new_leaf_hasher[i].inputs[0] <== new_pos_rep[i];
        new_leaf_hasher[i].inputs[1] <== new_neg_rep[i];
        epoch_tree_membership[i].leaf <== new_leaf_hasher[i].out;
        // check root
        epoch_tree_root === epoch_tree_membership[i].root;
    }

    /* End of check 2 */

    /* 3. Output the summed balances */

    var final_pos_rep = pos_rep;
    var final_neg_rep = neg_rep;
    for (var i = 0; i < EPOCH_KEY_NONCE_PER_EPOCH; i++) {
        final_pos_rep += new_pos_rep[i];
        final_neg_rep += new_neg_rep[i];
    }
    pos_rep_balance <== final_pos_rep;
    neg_rep_balance <== final_neg_rep;

    /* End of check 3 */

    /* 4. Check if user has positive reputation greater than min_rep */
    // if proving min_rep > 0, check if pos_rep + min_rep >= neg_rep

    component min_rep_check = GreaterEqThan(MAX_REPUTATION_SCORE_BITS);
    min_rep_check.in[0] <== pos_rep_balance + min_rep;
    min_rep_check.in[1] <== neg_rep_balance;

    component if_not_prove_min_rep = IsZero();
    if_not_prove_min_rep.in <== min_rep;

    component output_rep_check = OR();
    output_rep_check.a <== if_not_prove_min_rep.out;
    output_rep_check.b <== min_rep_check.out;

    output_rep_check.out === 1;

    /* End of check 4 */
    /* 5. Check pre-image of graffiti */
    /*
    component if_not_check_graffiti = IsZero();
    if_not_check_graffiti.in <== prove_graffiti;

    component graffiti_hasher = Poseidon(1);
    graffiti_hasher.inputs[0] <== graffiti_pre_image;

    component graffiti_eq = IsEqual();
    graffiti_eq.in[0] <== graffiti_hasher.out;
    graffiti_eq.in[1] <== graffiti;

    component check_graffiti = OR();
    check_graffiti.a <== if_not_check_graffiti.out;
    check_graffiti.b <== graffiti_eq.out;

    check_graffiti.out === 1;
    */
    /* End of check 5 */
}
