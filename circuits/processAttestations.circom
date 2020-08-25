include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/mux1.circom";
include "./hasherPoseidon.circom";
include "./sparseMerkleTree.circom";
include "./verifyHashChain.circom";

template ProcessAttestations(nullifier_tree_depth, user_state_tree_depth, NUM_ATTESTATIONS) {
    signal input epoch;
    signal input identity_nullifier;

    signal input intermediate_user_state_tree_root[NUM_ATTESTATIONS + 1];
    // Inputs of old atttestation records
    signal input old_pos_reps[NUM_ATTESTATIONS];
    signal input old_neg_reps[NUM_ATTESTATIONS];
    signal input old_graffities[NUM_ATTESTATIONS];
    signal input path_elements[NUM_ATTESTATIONS][user_state_tree_depth];

    // Inputs of the atttestations
    signal input attester_ids[NUM_ATTESTATIONS];
    signal input pos_reps[NUM_ATTESTATIONS];
    signal input neg_reps[NUM_ATTESTATIONS];
    signal input graffities[NUM_ATTESTATIONS];
    signal input overwrite_graffitis[NUM_ATTESTATIONS];

    signal input selectors[NUM_ATTESTATIONS];
    signal input hash_chain_result;

    // Nullifiers of the attestations
    signal output nullifiers[NUM_ATTESTATIONS];


    component attestation_hashers[NUM_ATTESTATIONS];

    component nullifier_hashers[NUM_ATTESTATIONS];

    component hash_chain_verifier = VerifyHashChain(NUM_ATTESTATIONS);
    hash_chain_verifier.result <== hash_chain_result;

    signal quotient[NUM_ATTESTATIONS];
    component quot_lt[NUM_ATTESTATIONS];
    signal nullifierHashModed[NUM_ATTESTATIONS];
    component nul_lt[NUM_ATTESTATIONS];

    for (var i = 0; i < NUM_ATTESTATIONS; i++) {
        // Compute hash of the attestation
        attestation_hashers[i] = Hasher5();
        attestation_hashers[i].in[0] <== attester_ids[i];
        attestation_hashers[i].in[1] <== pos_reps[i];
        attestation_hashers[i].in[2] <== neg_reps[i];
        attestation_hashers[i].in[3] <== graffities[i];
        attestation_hashers[i].in[4] <== overwrite_graffitis[i];
        hash_chain_verifier.in_rest[i] <== attestation_hashers[i].hash;
        hash_chain_verifier.selectors[i] <== selectors[i];

        // Compute nullifier of the attestation
        nullifier_hashers[i] = Hasher5();
        nullifier_hashers[i].in[0] <== identity_nullifier;
        nullifier_hashers[i].in[1] <== attester_ids[i];
        nullifier_hashers[i].in[2] <== epoch;
        nullifier_hashers[i].in[3] <== 0;
        nullifier_hashers[i].in[4] <== 0;

        // Mod nullifier hash
        // circom's best practices state that we should avoid using <-- unless
        // we know what we are doing. But this is the only way to perform the
        // modulo operation.
        quotient[i] <-- nullifier_hashers[i].hash \ (2 ** nullifier_tree_depth);
        nullifierHashModed[i] <-- nullifier_hashers[i].hash % (2 ** nullifier_tree_depth);
        // Range check on nullifier
        nul_lt[i] = LessEqThan(nullifier_tree_depth);
        nul_lt[i].in[0] <== nullifierHashModed[i];
        nul_lt[i].in[1] <== 2 ** nullifier_tree_depth - 1;
        nul_lt[i].out === 1;
        // Range check on quotient[i]
        quot_lt[i] = LessEqThan(254 - nullifier_tree_depth);
        quot_lt[i].in[0] <== quotient[i];
        quot_lt[i].in[1] <== 2 ** (254 - nullifier_tree_depth) - 1;
        quot_lt[i].out === 1;
        // Check equality
        nullifier_hashers[i].hash === quotient[i] * (2 ** nullifier_tree_depth) + nullifierHashModed[i];
        nullifiers[i] <== nullifierHashModed[i];
    }

    // Process attestations
    component which_leaf_index_to_check[NUM_ATTESTATIONS];
    signal leaf_index_to_check[NUM_ATTESTATIONS];

    component old_leaf_value_hasher[NUM_ATTESTATIONS];
    component which_old_leaf_value_to_check[NUM_ATTESTATIONS];
    signal old_leaf_value_to_check[NUM_ATTESTATIONS];

    component overwrite_graffiti_muxer[NUM_ATTESTATIONS];
    component new_leaf_value_hasher[NUM_ATTESTATIONS];
    component which_new_leaf_value_to_check[NUM_ATTESTATIONS];
    signal new_leaf_value_to_check[NUM_ATTESTATIONS];

    component old_attestation_record_match_check[NUM_ATTESTATIONS]; 
    component new_attestation_record_match_check[NUM_ATTESTATIONS];
 
    signal one_leaf;
    component one_leaf_hasher = HashLeftRight();
    one_leaf_hasher.left <== 1;
    one_leaf_hasher.right <== 0;
    one_leaf <== one_leaf_hasher.hash;

    for (var i = 0; i < NUM_ATTESTATIONS; i++) {

        which_leaf_index_to_check[i] = Mux1();
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

        which_old_leaf_value_to_check[i] = Mux1();
        which_old_leaf_value_to_check[i].c[0] <== one_leaf;  // Leaf 0 is reserved and has value hashLeftRight(1, 0)
        which_old_leaf_value_to_check[i].c[1] <== old_leaf_value_hasher[i].hash;
        which_old_leaf_value_to_check[i].s <== selectors[i];
        old_leaf_value_to_check[i] <== which_old_leaf_value_to_check[i].out;

        old_attestation_record_match_check[i] = SMTLeafExists(user_state_tree_depth);
        old_attestation_record_match_check[i].leaf_index <== leaf_index_to_check[i];
        old_attestation_record_match_check[i].leaf <== old_leaf_value_to_check[i];
        for (var j = 0; j < user_state_tree_depth; j++) {
            old_attestation_record_match_check[i].path_elements[j] <== path_elements[i][j];
        }
        old_attestation_record_match_check[i].root <== intermediate_user_state_tree_root[i];

        // Top up pos and neg reps
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

        which_new_leaf_value_to_check[i] = Mux1();
        which_new_leaf_value_to_check[i].c[0] <== one_leaf;  // Leaf 0 is reserved and has value hashLeftRight(1, 0)
        which_new_leaf_value_to_check[i].c[1] <== new_leaf_value_hasher[i].hash;
        which_new_leaf_value_to_check[i].s <== selectors[i];
        new_leaf_value_to_check[i] <== which_new_leaf_value_to_check[i].out;

        new_attestation_record_match_check[i] = SMTLeafExists(user_state_tree_depth);
        new_attestation_record_match_check[i].leaf_index <== leaf_index_to_check[i];
        new_attestation_record_match_check[i].leaf <== new_leaf_value_to_check[i];
        for (var j = 0; j < user_state_tree_depth; j++) {
            new_attestation_record_match_check[i].path_elements[j] <== path_elements[i][j];
        }
        new_attestation_record_match_check[i].root <== intermediate_user_state_tree_root[i + 1];
    }
}