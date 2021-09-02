include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/mux1.circom";
include "./hasherPoseidon.circom";
include "./sparseMerkleTree.circom";
include "./verifyHashChain.circom";

template ProcessAttestations(user_state_tree_depth, NUM_ATTESTATIONS, EPOCH_KEY_NONCE_PER_EPOCH) {
    signal private input epoch;
    signal private input from_nonce;
    signal private input to_nonce;
    signal private input identity_nullifier;

    signal private input intermediate_user_state_tree_roots[NUM_ATTESTATIONS + 1];
    // Inputs of old reputation records
    signal private input old_pos_reps[NUM_ATTESTATIONS];
    signal private input old_neg_reps[NUM_ATTESTATIONS];
    signal private input old_graffities[NUM_ATTESTATIONS];
    signal private input path_elements[NUM_ATTESTATIONS][user_state_tree_depth][1];

    // Inputs of the atttestations
    signal private input attester_ids[NUM_ATTESTATIONS];
    signal private input pos_reps[NUM_ATTESTATIONS];
    signal private input neg_reps[NUM_ATTESTATIONS];
    signal private input graffities[NUM_ATTESTATIONS];
    signal private input overwrite_graffities[NUM_ATTESTATIONS];

    // Selector is used to determined if the attestation should be processed
    signal private input selectors[NUM_ATTESTATIONS];

    // Inputs of blinded user state and hash chain result that the circuit starts from
    signal private input hash_chain_starter;
    signal input input_blinded_user_state;

    // Output blinded user state and hash chain result that can be published on smart contract
    signal output blinded_user_state;
    signal output blinded_hash_chain_result;

    component attestation_hashers[NUM_ATTESTATIONS];
    component hash_chain_hasher = HashChainHaser(NUM_ATTESTATIONS);
    hash_chain_hasher.hash_starter <== hash_chain_starter;

    // If the attestation is not to be processed, we check and verify leaf 0 instead.
    // Leaf 0 is reserved and has value hash5(0, 0, 0, 0, 0)
    var default_leaf_zero = 14655542659562014735865511769057053982292279840403315552050801315682099828156;

    component which_leaf_index_to_check[NUM_ATTESTATIONS];
    signal leaf_index_to_check[NUM_ATTESTATIONS];

    component old_leaf_value_hasher[NUM_ATTESTATIONS];
    component which_old_leaf_value_to_check[NUM_ATTESTATIONS];

    component overwrite_graffiti_muxer[NUM_ATTESTATIONS];
    component new_leaf_value_hasher[NUM_ATTESTATIONS];
    component which_new_leaf_value_to_check[NUM_ATTESTATIONS];

    component old_attestation_record_match_check[NUM_ATTESTATIONS];
    component new_attestation_record_match_check[NUM_ATTESTATIONS];

    /* 0. Validate inputs */
    // 0.1 Check selectors validity
    for (var i = 0; i < NUM_ATTESTATIONS; i++) {
        selectors[i] * (selectors[i] - 1) === 0;
    }

    // 0.2 Check nonce validity
    var bitsPerNonce = 8;

    component from_nonce_lt = LessThan(bitsPerNonce);
    from_nonce_lt.in[0] <== from_nonce;
    from_nonce_lt.in[1] <== EPOCH_KEY_NONCE_PER_EPOCH;
    from_nonce_lt.out === 1;

    component to_nonce_lt = LessThan(bitsPerNonce);
    to_nonce_lt.in[0] <== to_nonce;
    to_nonce_lt.in[1] <== EPOCH_KEY_NONCE_PER_EPOCH;
    to_nonce_lt.out === 1;
    /* End of check 0 */

    /* 1. Verify blinded input user state */
    component input_blinded_user_state_hasher = Hasher5();
    input_blinded_user_state_hasher.in[0] <== identity_nullifier;
    input_blinded_user_state_hasher.in[1] <== intermediate_user_state_tree_roots[0];
    input_blinded_user_state_hasher.in[2] <== epoch;
    input_blinded_user_state_hasher.in[3] <== from_nonce;
    input_blinded_user_state_hasher.in[4] <== 0;
    input_blinded_user_state === input_blinded_user_state_hasher.hash;
    /* End of 1. Verify blinded input user state*/

    for (var i = 0; i < NUM_ATTESTATIONS; i++) {
        /* 2. Verify attestation hash chain */
        // 2.1 Compute hash of the attestation and verify the hash chain of these hashes
        attestation_hashers[i] = Hasher5();
        attestation_hashers[i].in[0] <== attester_ids[i];
        attestation_hashers[i].in[1] <== pos_reps[i];
        attestation_hashers[i].in[2] <== neg_reps[i];
        attestation_hashers[i].in[3] <== graffities[i];
        attestation_hashers[i].in[4] <== 0;
        
        hash_chain_hasher.hashes[i] <== attestation_hashers[i].hash;
        hash_chain_hasher.selectors[i] <== selectors[i];
         /* End of 2. verify attestation hash chain */

        /* 3. Process attestations and update user state tree */
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
        overwrite_graffiti_muxer[i].s <== overwrite_graffities[i];
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
        /* End of 3. process attestations and update user state tree */
    }

    /* 5. Compute blinded public output */
    // 5.1 blinded_user_state = hash5(identity, UST_root, epoch, epoch_key_nonce, 0)
    component blinded_user_state_hasher = Hasher5();
    blinded_user_state_hasher.in[0] <== identity_nullifier;
    blinded_user_state_hasher.in[1] <== intermediate_user_state_tree_roots[NUM_ATTESTATIONS];
    blinded_user_state_hasher.in[2] <== epoch;
    blinded_user_state_hasher.in[3] <== to_nonce;
    blinded_user_state_hasher.in[4] <== 0;
    blinded_user_state <== blinded_user_state_hasher.hash;

    // 5.2 blinded_hash_chain_result = hash5(identity, hash_chain_result, epoch, epoch_key_nonce, 0)
    component blinded_hash_chain_result_hasher = Hasher5();
    blinded_hash_chain_result_hasher.in[0] <== identity_nullifier;
    blinded_hash_chain_result_hasher.in[1] <== hash_chain_hasher.result;
    blinded_hash_chain_result_hasher.in[2] <== epoch;
    blinded_hash_chain_result_hasher.in[3] <== to_nonce;
    blinded_hash_chain_result_hasher.in[4] <== 0;
    blinded_hash_chain_result <== blinded_hash_chain_result_hasher.hash;
    /* End of 5. Compute blinded public output */
}