include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/mux1.circom";
include "./hasherPoseidon.circom";
include "./sparseMerkleTree.circom";
include "./verifyHashChain.circom";

template ProcessAttestations(user_state_tree_depth, NUM_ATTESTATIONS) {
    signal input epoch;
    signal input nonce;
    signal input identity_nullifier;
    signal input epoch_key;

    signal input intermediate_user_state_tree_roots[NUM_ATTESTATIONS + 1];
    // Inputs of old reputation records
    signal input old_pos_reps[NUM_ATTESTATIONS];
    signal input old_neg_reps[NUM_ATTESTATIONS];
    signal input old_graffities[NUM_ATTESTATIONS];
    signal input path_elements[NUM_ATTESTATIONS][user_state_tree_depth][1];

    // Inputs of the atttestations
    signal input attester_ids[NUM_ATTESTATIONS];
    signal input pos_reps[NUM_ATTESTATIONS];
    signal input neg_reps[NUM_ATTESTATIONS];
    signal input graffities[NUM_ATTESTATIONS];
    signal input overwrite_graffitis[NUM_ATTESTATIONS];

    // Selector is used to determined if the attestation should be processed
    signal input selectors[NUM_ATTESTATIONS];
    signal input hash_chain_result;

    // Nullifiers of the attestations
    signal output epoch_key_nullifier;

    component attestation_hashers[NUM_ATTESTATIONS];

    component hash_chain_verifier = VerifyHashChain(NUM_ATTESTATIONS);
    hash_chain_verifier.result <== hash_chain_result;

    /* 1. Verify attestation hash chain and compute nullifiers */
    for (var i = 0; i < NUM_ATTESTATIONS; i++) {
        // 1.1 Compute hash of the attestation and verify the hash chain of these hashes
        attestation_hashers[i] = Hasher5();
        attestation_hashers[i].in[0] <== attester_ids[i];
        attestation_hashers[i].in[1] <== pos_reps[i];
        attestation_hashers[i].in[2] <== neg_reps[i];
        attestation_hashers[i].in[3] <== graffities[i];
        attestation_hashers[i].in[4] <== overwrite_graffitis[i];
        hash_chain_verifier.hashes[i] <== attestation_hashers[i].hash;
        hash_chain_verifier.selectors[i] <== selectors[i];
    }

    // 1.2 Compute epoch key nullifier
    // 1.2.1 Compute nullifier
    component epoch_key_nullifier_hasher = Hasher5();
    epoch_key_nullifier_hasher.in[0] <== 2;  // 2 is the domain separator for epoch key nullifier
    epoch_key_nullifier_hasher.in[1] <== identity_nullifier;
    epoch_key_nullifier_hasher.in[2] <== epoch;
    epoch_key_nullifier_hasher.in[3] <== nonce;
    epoch_key_nullifier_hasher.in[4] <== 0;

    epoch_key_nullifier <== epoch_key_nullifier_hasher.hash;
    /* End of 1. verify attestation hash chain and compute nullifiers */

    /* 2. Process attestations and update user state tree */

    // If the attestation is not to be processed, we check and verify leaf 0 instead.
    // Leaf 0 is reserved and has value hash5(0, 0, 0, 0, 0)
    signal default_leaf_zero;
    component default_leaf_zero_hasher = Hasher5();
    default_leaf_zero_hasher.in[0] <== 0;
    default_leaf_zero_hasher.in[1] <== 0;
    default_leaf_zero_hasher.in[2] <== 0;
    default_leaf_zero_hasher.in[3] <== 0;
    default_leaf_zero_hasher.in[4] <== 0;
    default_leaf_zero <== default_leaf_zero_hasher.hash;
    component which_leaf_index_to_check[NUM_ATTESTATIONS];
    signal leaf_index_to_check[NUM_ATTESTATIONS];

    component old_leaf_value_hasher[NUM_ATTESTATIONS];
    component which_old_leaf_value_to_check[NUM_ATTESTATIONS];

    component overwrite_graffiti_muxer[NUM_ATTESTATIONS];
    component new_leaf_value_hasher[NUM_ATTESTATIONS];
    component which_new_leaf_value_to_check[NUM_ATTESTATIONS];

    component old_attestation_record_match_check[NUM_ATTESTATIONS]; 
    component new_attestation_record_match_check[NUM_ATTESTATIONS];
 
    for (var i = 0; i < NUM_ATTESTATIONS; i++) {
        which_leaf_index_to_check[i] = Mux1();
        // Check and verify the attestation record if the selector is true
        // Check and verify leaf 0 otherwise
        which_leaf_index_to_check[i].c[0] <== 0;  // Leaf index 0
        which_leaf_index_to_check[i].c[1] <== attester_ids[i];
        which_leaf_index_to_check[i].s <== selectors[i];
        leaf_index_to_check[i] <== which_leaf_index_to_check[i].out;

        old_leaf_value_hasher[i] = Hasher5();
        old_leaf_value_hasher[i].in[0] <== old_pos_reps[i];
        old_leaf_value_hasher[i].in[1] <== old_neg_reps[i];
        old_leaf_value_hasher[i].in[2] <== old_graffities[i];
        old_leaf_value_hasher[i].in[3] <== 0;
        old_leaf_value_hasher[i].in[4] <== 0;

        // Attestation record to be checked should have value hash5(pos, neg, graffiti)
        // while leaf 0 should have value hash5(0, 0, 0, 0, 0)
        which_old_leaf_value_to_check[i] = Mux1();
        which_old_leaf_value_to_check[i].c[0] <== default_leaf_zero;
        which_old_leaf_value_to_check[i].c[1] <== old_leaf_value_hasher[i].hash;
        which_old_leaf_value_to_check[i].s <== selectors[i];

        // Verify merkle proof against pre_processing_tree_root
        old_attestation_record_match_check[i] = SMTLeafExists(user_state_tree_depth);
        old_attestation_record_match_check[i].leaf_index <== leaf_index_to_check[i];
        old_attestation_record_match_check[i].leaf <== which_old_leaf_value_to_check[i].out;
        for (var j = 0; j < user_state_tree_depth; j++) {
            old_attestation_record_match_check[i].path_elements[j][0] <== path_elements[i][j][0];
        }
        old_attestation_record_match_check[i].root <== intermediate_user_state_tree_roots[i];

        // Top up pos and neg reps
        // Update graffiti if overwrite_graffiti is true
        overwrite_graffiti_muxer[i] = Mux1();
        overwrite_graffiti_muxer[i].c[0] <== old_graffities[i];
        overwrite_graffiti_muxer[i].c[1] <== graffities[i];
        overwrite_graffiti_muxer[i].s <== overwrite_graffitis[i];
        new_leaf_value_hasher[i] = Hasher5();
        new_leaf_value_hasher[i].in[0] <== pos_reps[i] + old_pos_reps[i];
        new_leaf_value_hasher[i].in[1] <== neg_reps[i] + old_neg_reps[i];
        new_leaf_value_hasher[i].in[2] <== overwrite_graffiti_muxer[i].out;
        new_leaf_value_hasher[i].in[3] <== 0;
        new_leaf_value_hasher[i].in[4] <== 0;

        // Attestation record to be checked should have value hash5(pos, neg, graffiti)
        // while leaf 0 should have value hash5(0, 0, 0, 0, 0)
        which_new_leaf_value_to_check[i] = Mux1();
        which_new_leaf_value_to_check[i].c[0] <== default_leaf_zero;
        which_new_leaf_value_to_check[i].c[1] <== new_leaf_value_hasher[i].hash;
        which_new_leaf_value_to_check[i].s <== selectors[i];

        // Verify merkle proof against post_processing_tree_root
        new_attestation_record_match_check[i] = SMTLeafExists(user_state_tree_depth);
        new_attestation_record_match_check[i].leaf_index <== leaf_index_to_check[i];
        new_attestation_record_match_check[i].leaf <== which_new_leaf_value_to_check[i].out;
        for (var j = 0; j < user_state_tree_depth; j++) {
            new_attestation_record_match_check[i].path_elements[j][0] <== path_elements[i][j][0];
        }
        new_attestation_record_match_check[i].root <== intermediate_user_state_tree_roots[i + 1];
    }
    /* End of 2. process attestations and update user state tree */
}