pragma circom 2.0.0;

/*
    Prove:
        1. if user has a leaf in current state tree
        2. leaf has claimed reputation
        4. output a chosen epoch key
*/

include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/gates.circom";
include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "./sparseMerkleTree.circom";
include "./incrementalMerkleTree.circom";
include "./modulo.circom";

template ProveReputation(STATE_TREE_DEPTH, EPOCH_TREE_DEPTH, EPOCH_TREE_ARITY, EPOCH_KEY_NONCE_PER_EPOCH, MAX_REPUTATION_SCORE_BITS) {
    signal input epoch;
    signal input nonce;
    signal output epoch_key;

    // Global state tree leaf: Identity & user state root
    signal input identity_nullifier;
    // Global state tree
    signal input state_tree_indexes[STATE_TREE_DEPTH];
    signal input state_tree_elements[STATE_TREE_DEPTH][1];
    signal output state_tree_root;
    // Attester to prove reputation from
    signal input attester_id;
    // Attestation by the attester
    signal input pos_rep;
    signal input neg_rep;
    signal input graffiti;
    signal input timestamp;
    // Prove the minimum reputation
    signal input min_rep;
    // Graffiti
    signal input prove_graffiti;
    signal input graffiti_pre_image;

    /* 1a. Check if user exists in the Global State Tree */

    component leaf_hasher = Poseidon(7);
    leaf_hasher.inputs[0] <== identity_nullifier;
    leaf_hasher.inputs[1] <== attester_id;
    leaf_hasher.inputs[2] <== epoch;
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

    /* End of check 1a */

    /* 2. Check if user has positive reputation greater than min_rep */
    // if proving min_rep > 0, check if pos_rep + min_rep >= neg_rep

    component min_rep_check = GreaterEqThan(MAX_REPUTATION_SCORE_BITS);
    min_rep_check.in[0] <== pos_rep + min_rep;
    min_rep_check.in[1] <== neg_rep;

    component if_not_prove_min_rep = IsZero();
    if_not_prove_min_rep.in <== min_rep;

    component output_rep_check = OR();
    output_rep_check.a <== if_not_prove_min_rep.out;
    output_rep_check.b <== min_rep_check.out;

    output_rep_check.out === 1;

    /* End of check 2 */

    /* 3. Prove the graffiti pre-image if needed */

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

    /* End of check 3 */

    /* 4. Check nonce and output epoch key */

    component nonce_checker = LessThan(8);
    nonce_checker.in[0] <== nonce;
    nonce_checker.in[1] <== EPOCH_KEY_NONCE_PER_EPOCH;
    nonce_checker.out === 1;

    component epoch_key_hasher = Poseidon(4);
    epoch_key_hasher.inputs[0] <== identity_nullifier;
    epoch_key_hasher.inputs[1] <== attester_id;
    epoch_key_hasher.inputs[2] <== epoch;
    epoch_key_hasher.inputs[3] <== nonce;

    component epoch_key_mod = Modulo();
    epoch_key_mod.divisor <== EPOCH_TREE_ARITY ** EPOCH_TREE_DEPTH;
    epoch_key_mod.dividend <== epoch_key_hasher.out;
    epoch_key <== epoch_key_mod.remainder;

    /* End of check 4 */
}
