pragma circom 2.0.0;

include "./circomlib/circuits/poseidon.circom";
include "./circomlib/circuits/comparators.circom";
include "./circomlib/circuits/mux1.circom";
include "./circomlib/circuits/gates.circom";
include "./incrementalMerkleTree.circom";
include "./modulo.circom";
include "./inclusionNoninclusion.circom";

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
    signal input new_pos_rep[EPOCH_KEY_NONCE_PER_EPOCH];
    signal input new_neg_rep[EPOCH_KEY_NONCE_PER_EPOCH];
    signal input new_graffiti[EPOCH_KEY_NONCE_PER_EPOCH];
    signal input new_timestamp[EPOCH_KEY_NONCE_PER_EPOCH];

    // the common subtree
    signal input epoch_tree_elements[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_DEPTH - 1][EPOCH_TREE_ARITY];
    signal input epoch_tree_indices[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_DEPTH - 1];

    signal input noninclusion_leaf[EPOCH_KEY_NONCE_PER_EPOCH][2];
    signal input noninclusion_leaf_index[EPOCH_KEY_NONCE_PER_EPOCH];
    signal input noninclusion_elements[EPOCH_KEY_NONCE_PER_EPOCH][2][EPOCH_TREE_ARITY];

    // The index of the epoch tree leaf in the set of elements
    signal input inclusion_leaf_index[EPOCH_KEY_NONCE_PER_EPOCH];
    // The sibling elements for the epoch tree leaf
    signal input inclusion_elements[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_ARITY];

    signal output transition_nullifier;
    signal output root;

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
    component inc_noninc[EPOCH_KEY_NONCE_PER_EPOCH];
    component inc_mux[EPOCH_KEY_NONCE_PER_EPOCH];
    component ands[EPOCH_KEY_NONCE_PER_EPOCH][3];
    signal has_no_attestations[EPOCH_KEY_NONCE_PER_EPOCH];
    component zero_check[EPOCH_KEY_NONCE_PER_EPOCH][4];

    signal roots[EPOCH_KEY_NONCE_PER_EPOCH];

    var proven_inc_or_noninc = 0;

    for (var i = 0; i < EPOCH_KEY_NONCE_PER_EPOCH; i++) {
        inc_noninc[i] = ProveInclusionOrNoninclusion(EPOCH_TREE_DEPTH, EPOCH_TREE_ARITY);
        inc_noninc[i].leaf <== leaf_hashers[i].out;

        //~~ multiple levels of elements of the parent tree'

        for (var j = 0; j < EPOCH_TREE_DEPTH - 1; j++) {
            inc_noninc[i].parent_indices[j] <== epoch_tree_indices[i][j];
            for (var k = 0; k < EPOCH_TREE_ARITY; k++) {
                inc_noninc[i].parent_elements[j][k] <== epoch_tree_elements[i][j][k];
            }
        }

        inc_noninc[i].inclusion_leaf_index <== inclusion_leaf_index[i];
        inc_noninc[i].noninclusion_leaf_index <== noninclusion_leaf_index[i];
        inc_noninc[i].noninclusion_leaf[0] <== noninclusion_leaf[i][0];
        inc_noninc[i].noninclusion_leaf[1] <== noninclusion_leaf[i][1];
        for (var j = 0; j < EPOCH_TREE_ARITY; j++) {
            inc_noninc[i].inclusion_elements[j] <== inclusion_elements[i][j];
            inc_noninc[i].noninclusion_elements[0][j] <== noninclusion_elements[i][0][j];
            inc_noninc[i].noninclusion_elements[1][j] <== noninclusion_elements[i][1][j];
        }


        //~~ inc_noninc.inclusion
        //~~ inc_noninc.noninclusion

        /*~~~~

        Now check if the epoch key has attestations. If they do we expect
        inclusion === 1.

        Otherwise we expect noninclusion === 1.
        */

        zero_check[i][0] = IsZero();
        zero_check[i][0].in <== new_pos_rep[i];
        zero_check[i][1] = IsZero();
        zero_check[i][1].in <== new_neg_rep[i];
        zero_check[i][2] = IsZero();
        zero_check[i][2].in <== new_graffiti[i];
        zero_check[i][3] = IsZero();
        zero_check[i][3].in <== new_timestamp[i];

        ands[i][0] = AND();
        ands[i][0].a <== zero_check[i][0].out;
        ands[i][0].b <== zero_check[i][1].out;

        ands[i][1] = AND();
        ands[i][1].a <== zero_check[i][2].out;
        ands[i][1].b <== zero_check[i][3].out;

        ands[i][2] = AND();
        ands[i][2].a <== ands[i][0].out;
        ands[i][2].b <== ands[i][1].out;

        has_no_attestations[i] <== ands[i][2].out;

        /*~~~~~

        if (has_no_attestations) {
          require(noninclusion)
        } else {
          require(inclusion)
        }
        */

        inc_mux[i] = Mux1();

        inc_mux[i].s <== has_no_attestations[i];
        inc_mux[i].c[0] <== inc_noninc[i].inclusion;
        inc_mux[i].c[1] <== inc_noninc[i].noninclusion;

        proven_inc_or_noninc += inc_mux[i].out;

        //~~ check that all roots are equal
        roots[i] <== inc_noninc[i].root;
        roots[0] === roots[i];
    }

    component has_proven_inc_or_noninc = IsZero();
    has_proven_inc_or_noninc.in <== proven_inc_or_noninc - EPOCH_KEY_NONCE_PER_EPOCH;


    //~~ output the root, or 0 if we haven't proven membership (no attestations)
    root <== has_proven_inc_or_noninc.out * roots[0];

    //~~ if root is 0 no new reputation must be supplied
    var no_attestations_sum = 0;
    for (var x = 0; x < EPOCH_KEY_NONCE_PER_EPOCH; x++) {
        no_attestations_sum += has_no_attestations[x];
    }
    component zero_rep_check = Mux1();
    zero_rep_check.s <== has_proven_inc_or_noninc.out;
    zero_rep_check.c[0] <== no_attestations_sum;
    zero_rep_check.c[1] <== EPOCH_KEY_NONCE_PER_EPOCH;
    zero_rep_check.out === EPOCH_KEY_NONCE_PER_EPOCH;

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

