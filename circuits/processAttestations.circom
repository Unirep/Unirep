include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/mux1.circom";
include "./hasherPoseidon.circom";
include "./sparseMerkleTree.circom";
include "./verifyHashChain.circom";

template ProcessAttestations(nullifier_tree_depth, user_state_tree_depth, NUM_ATTESTATIONS) {
    signal input epoch;
    signal input nonce;
    signal input identity_nullifier;

    signal input intermediate_user_state_tree_roots[NUM_ATTESTATIONS + 1];
    // Inputs of old atttestation records
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

    // Selector is used to determined if the nullifier should be processed
    signal input selectors[NUM_ATTESTATIONS];
    signal input hash_chain_result;

    // Nullifiers of the attestations
    signal output nullifiers[NUM_ATTESTATIONS];
    signal output no_attestation_nullifier;


    component attestation_hashers[NUM_ATTESTATIONS];

    component nullifier_hashers[NUM_ATTESTATIONS];

    component hash_chain_verifier = VerifyHashChain(NUM_ATTESTATIONS);
    hash_chain_verifier.result <== hash_chain_result;

    signal quotient[NUM_ATTESTATIONS];
    component quot_lt[NUM_ATTESTATIONS];
    signal nullifier_hash_moded[NUM_ATTESTATIONS];
    component nul_lt[NUM_ATTESTATIONS];
    component nullifier_muxer[NUM_ATTESTATIONS];

    signal one_leaf;
    component one_leaf_hasher = HashLeftRight();
    one_leaf_hasher.left <== 1;
    one_leaf_hasher.right <== 0;
    one_leaf <== one_leaf_hasher.hash;

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

        // 1.2 Compute nullifier of the attestation
        nullifier_hashers[i] = Hasher5();
        nullifier_hashers[i].in[0] <== identity_nullifier;
        nullifier_hashers[i].in[1] <== attester_ids[i];
        nullifier_hashers[i].in[2] <== epoch;
        nullifier_hashers[i].in[3] <== 0;
        nullifier_hashers[i].in[4] <== 0;

        // 1.2.2 Mod nullifier hash
        // circom's best practices state that we should avoid using <-- unless
        // we know what we are doing. But this is the only way to perform the
        // modulo operation.
        quotient[i] <-- nullifier_hashers[i].hash \ (2 ** nullifier_tree_depth);
        nullifier_hash_moded[i] <-- nullifier_hashers[i].hash % (2 ** nullifier_tree_depth);
        // 1.2.3 Range check on moded nullifier
        nul_lt[i] = LessEqThan(nullifier_tree_depth);
        nul_lt[i].in[0] <== nullifier_hash_moded[i];
        nul_lt[i].in[1] <== 2 ** nullifier_tree_depth - 1;
        nul_lt[i].out === 1;
        // 1.2.4 Range check on quotient[i]
        quot_lt[i] = LessEqThan(254 - nullifier_tree_depth);
        quot_lt[i].in[0] <== quotient[i];
        quot_lt[i].in[1] <== 2 ** (254 - nullifier_tree_depth) - 1;
        quot_lt[i].out === 1;
        // 1.2.5 Check equality
        nullifier_hashers[i].hash === quotient[i] * (2 ** nullifier_tree_depth) + nullifier_hash_moded[i];

        // Ouput nullifiers
        // Filter by selectors, if selector is true, output actual nullifier,
        // output 0 otherwise since leaf 0 of nullifier tree is reserved.
        nullifier_muxer[i] = Mux1();
        nullifier_muxer[i].c[0] <== 0;
        nullifier_muxer[i].c[1] <== nullifier_hash_moded[i];
        nullifier_muxer[i].s <== selectors[i];
        nullifiers[i] <== nullifier_muxer[i].out;
    }

    // 1.2 Compute no attestation nullifier
    // If there's no attestation, hash chain result should be the same as hashLeftRight(1, 0)
    // and so `has_no_attestation.out` should be 1.
    // 1.2.1 Compute nullifier
    component no_attestation_nullifier_hasher = Hasher5();
    no_attestation_nullifier_hasher.in[0] <== identity_nullifier;
    no_attestation_nullifier_hasher.in[1] <== epoch;
    no_attestation_nullifier_hasher.in[2] <== nonce;
    no_attestation_nullifier_hasher.in[3] <== 0;
    no_attestation_nullifier_hasher.in[4] <== 0;
    // 1.2.2 Mod nullifier hash
    // circom's best practices state that we should avoid using <-- unless
    // we know what we are doing. But this is the only way to perform the
    // modulo operation.
    signal no_atte_quotient;
    component no_atte_quot_lt;
    signal no_atte_nullifier_hash_moded;
    component no_atte_nul_lt;
    no_atte_quotient <-- no_attestation_nullifier_hasher.hash \ (2 ** nullifier_tree_depth);
    no_atte_nullifier_hash_moded <-- no_attestation_nullifier_hasher.hash % (2 ** nullifier_tree_depth);
    // 1.2.3 Range check on moded nullifier
    no_atte_nul_lt = LessEqThan(nullifier_tree_depth);
    no_atte_nul_lt.in[0] <== no_atte_nullifier_hash_moded;
    no_atte_nul_lt.in[1] <== 2 ** nullifier_tree_depth - 1;
    no_atte_nul_lt.out === 1;
    // 1.2.4 Range check on no_atte_quotient
    no_atte_quot_lt = LessEqThan(254 - nullifier_tree_depth);
    no_atte_quot_lt.in[0] <== no_atte_quotient;
    no_atte_quot_lt.in[1] <== 2 ** (254 - nullifier_tree_depth) - 1;
    no_atte_quot_lt.out === 1;
    // 1.2.5 Check equality
    no_attestation_nullifier_hasher.hash === no_atte_quotient * (2 ** nullifier_tree_depth) + no_atte_nullifier_hash_moded;
    // 1.2.6 Output no_attestation_nullifier
    component has_no_attestation = IsEqual();
    has_no_attestation.in[0] <== one_leaf;
    has_no_attestation.in[1] <== hash_chain_result;
    // Output `no_attestation_nullifier`, it's either 0 or the nullifier computed above.
    component no_attestation_nullifier_muxer = Mux1();
    no_attestation_nullifier_muxer.c[0] <== 0;
    no_attestation_nullifier_muxer.c[1] <== no_atte_nullifier_hash_moded;
    no_attestation_nullifier_muxer.s <== has_no_attestation.out;
    no_attestation_nullifier <== no_attestation_nullifier_muxer.out;
    /* End of 1. verify attestation hash chain and compute nullifiers */


    /* 2. Process attestations and update user state tree */

    // If the attestation is not to be processed, we check and verify leaf 0 instead.
    // Leaf 0 is reserved and has value hashLeftRight(1, 0)
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
        // while leaf 0 should have value hashLeftRight(1, 0)
        which_old_leaf_value_to_check[i] = Mux1();
        which_old_leaf_value_to_check[i].c[0] <== one_leaf;
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
        new_leaf_value_hasher[i].in[0] <== old_pos_reps[i] + pos_reps[i];
        new_leaf_value_hasher[i].in[1] <== old_neg_reps[i] + neg_reps[i];
        new_leaf_value_hasher[i].in[2] <== overwrite_graffiti_muxer[i].out;
        new_leaf_value_hasher[i].in[3] <== 0;
        new_leaf_value_hasher[i].in[4] <== 0;

        // Attestation record to be checked should have value hash5(pos, neg, graffiti)
        // while leaf 0 should have value hashLeftRight(1, 0)
        which_new_leaf_value_to_check[i] = Mux1();
        which_new_leaf_value_to_check[i].c[0] <== one_leaf;
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