include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/mux1.circom";
include "./hasherPoseidon.circom";
include "./incrementalMerkleTree.circom";
include "./modulo.circom";
include "./sparseMerkleTree.circom";
include "./processAttestations.circom";
include "./userExists.circom";

template epochKeyExist(epoch_tree_depth) {
    signal input identity_nullifier;
    signal input epoch;
    signal input nonce;
    signal input hash_chain_result;
    signal input epoch_tree_root;
    signal input path_elements[epoch_tree_depth][1];
    signal output epoch_key;

    component epochKeyHasher = Hasher5();
    epochKeyHasher.in[0] <== identity_nullifier;
    epochKeyHasher.in[1] <== epoch;
    epochKeyHasher.in[2] <== nonce;
    epochKeyHasher.in[3] <== 0;
    epochKeyHasher.in[4] <== 0;

    signal epkModed;
    // 2.1.2 Mod epoch key
    component modEPK = ModuloTreeDepth(epoch_tree_depth);
    modEPK.dividend <== epochKeyHasher.hash;
    epkModed <== modEPK.remainder;

    // 2.1.6 Check if hash chain of the epoch key exists in epoch tree
    component epk_exists = SMTLeafExists(epoch_tree_depth);
    epk_exists.leaf_index <== epkModed;
    epk_exists.leaf <== hash_chain_result;
    epk_exists.root <== epoch_tree_root;
    for (var i = 0; i < epoch_tree_depth; i++) {
        epk_exists.path_elements[i][0] <== path_elements[i][0];
    }
    epoch_key <== epkModed;
}

template UserStateTransition(
    GST_tree_depth, 
    epoch_tree_depth, 
    user_state_tree_depth, 
    ATTESTATIONS_PER_EPOCH_KEY, 
    EPOCH_KEY_NONCE_PER_EPOCH, 
    TOTAL_NUM_ATTESTATIONS) {
    signal input epoch;

    // User state tree
    // First intermediate root is the user state tree root before processing
    // Last intermediate root is the new user state tree root after processing
    signal private input intermediate_user_state_tree_roots[TOTAL_NUM_ATTESTATIONS + 1];
    // Inputs of old atttestation records
    signal private input old_pos_reps[TOTAL_NUM_ATTESTATIONS];
    signal private input old_neg_reps[TOTAL_NUM_ATTESTATIONS];
    signal private input old_graffities[TOTAL_NUM_ATTESTATIONS];
    signal private input UST_path_elements[TOTAL_NUM_ATTESTATIONS][user_state_tree_depth][1];

    // Global state tree leaf: Identity & user state root
    signal private input identity_pk[2];
    signal private input identity_nullifier;
    signal private input identity_trapdoor;
    signal private input user_state_hash;
    // Sum of positive and negative karma
    signal private input old_positive_karma;
    signal private input old_negative_karma;

    // Global state tree
    signal private input GST_path_elements[GST_tree_depth][1];
    signal private input GST_path_index[GST_tree_depth];
    signal input GST_root;

    // Selector is used to determined if the attestation should be processed
    signal private input selectors[TOTAL_NUM_ATTESTATIONS];
    // Inputs of the atttestations
    signal private input attester_ids[TOTAL_NUM_ATTESTATIONS];
    signal private input pos_reps[TOTAL_NUM_ATTESTATIONS];
    signal private input neg_reps[TOTAL_NUM_ATTESTATIONS];
    signal private input graffities[TOTAL_NUM_ATTESTATIONS];
    signal private input overwrite_graffitis[TOTAL_NUM_ATTESTATIONS];
    // Sum of positive and negative karma
    signal private input positive_karma;
    signal private input negative_karma;
    signal input airdropped_karma;

    // Epoch key & epoch tree
    signal private input epk_path_elements[EPOCH_KEY_NONCE_PER_EPOCH][epoch_tree_depth][1];
    signal private input hash_chain_results[EPOCH_KEY_NONCE_PER_EPOCH];
    signal input epoch_tree_root;

    signal output new_GST_leaf;
    // Nullifier of epoch keys
    signal output epoch_key_nullifier[EPOCH_KEY_NONCE_PER_EPOCH];

    // Validate config params
    ATTESTATIONS_PER_EPOCH_KEY * EPOCH_KEY_NONCE_PER_EPOCH === TOTAL_NUM_ATTESTATIONS;
    /* 0. Validate inputs */
    for (var i = 0; i < TOTAL_NUM_ATTESTATIONS; i++) {
        selectors[i] * (selectors[i] - 1) === 0;
    }
    /* End of check 0 */


    /* 1. Check if user exists in the Global State Tree */
    component user_exist = userExists(GST_tree_depth);
    for (var i = 0; i< GST_tree_depth; i++) {
        user_exist.GST_path_index[i] <== GST_path_index[i];
        user_exist.GST_path_elements[i][0] <== GST_path_elements[i][0];
    }
    user_exist.GST_root <== GST_root;
    user_exist.identity_pk[0] <== identity_pk[0];
    user_exist.identity_pk[1] <== identity_pk[1];
    user_exist.identity_nullifier <== identity_nullifier;
    user_exist.identity_trapdoor <== identity_trapdoor;
    user_exist.user_tree_root <== intermediate_user_state_tree_roots[0];
    user_exist.user_state_hash <== user_state_hash;
    user_exist.positive_karma <== old_positive_karma;
    user_exist.negative_karma <== old_negative_karma;
    /* End of check 1 */

    /* 2. Process the attestations of the epoch key specified by nonce `n` */
    var start_index;
    component epkExist[EPOCH_KEY_NONCE_PER_EPOCH];
    component process_attestations[EPOCH_KEY_NONCE_PER_EPOCH];
    for (var n = 0; n < EPOCH_KEY_NONCE_PER_EPOCH; n++) {
        start_index = n * ATTESTATIONS_PER_EPOCH_KEY;
        epkExist[n] = epochKeyExist(epoch_tree_depth);
        // 2.1 Check if epoch key exists in epoch tree
        epkExist[n].identity_nullifier <== identity_nullifier;
        epkExist[n].epoch <== epoch;
        epkExist[n].nonce <== n;
        epkExist[n].hash_chain_result <== hash_chain_results[n];
        epkExist[n].epoch_tree_root <== epoch_tree_root;
        for (var i = 0; i < epoch_tree_depth; i++) {
            epkExist[n].path_elements[i][0] <== epk_path_elements[n][i][0];
        }

        // 2.2 Begin processing attestations
        process_attestations[n] = ProcessAttestations(user_state_tree_depth, ATTESTATIONS_PER_EPOCH_KEY);
        process_attestations[n].epoch <== epoch;
        process_attestations[n].nonce <== n;
        process_attestations[n].identity_nullifier <== identity_nullifier;
        process_attestations[n].epoch_key <== epkExist[n].epoch_key;
        process_attestations[n].hash_chain_result <== hash_chain_results[n];
        process_attestations[n].intermediate_user_state_tree_roots[0] <== intermediate_user_state_tree_roots[start_index + 0];
        for (var i = 0; i < ATTESTATIONS_PER_EPOCH_KEY; i++) {
            process_attestations[n].intermediate_user_state_tree_roots[i + 1] <== intermediate_user_state_tree_roots[start_index + i + 1];
            process_attestations[n].old_pos_reps[i] <== old_pos_reps[start_index + i];
            process_attestations[n].old_neg_reps[i] <== old_neg_reps[start_index + i];
            process_attestations[n].old_graffities[i] <== old_graffities[start_index + i];
            for (var j = 0; j < user_state_tree_depth; j++) {
                process_attestations[n].path_elements[i][j][0] <== UST_path_elements[start_index + i][j][0];
            }
            process_attestations[n].attester_ids[i] <== attester_ids[start_index + i];
            process_attestations[n].pos_reps[i] <== pos_reps[start_index + i];
            process_attestations[n].neg_reps[i] <== neg_reps[start_index + i];
            process_attestations[n].graffities[i] <== graffities[start_index + i];
            process_attestations[n].overwrite_graffitis[i] <== overwrite_graffitis[start_index + i];
            process_attestations[n].selectors[i] <== selectors[start_index + i];
        }

        // 2.3 Output epoch key nullifiers
        epoch_key_nullifier[n] <== process_attestations[n].epoch_key_nullifier;
    }
    /* End of 2. process the attestations of the epoch key specified by nonce `n` */


    /* 3. Compute and output new GST leaf */
    // 3.1 Comput total positive and negative reputation
    // if positive and negative are verified by provess_attestations
    // then we sum all pos_reps and neg_reps
    var pos_rep_sum = old_positive_karma + airdropped_karma;
    var neg_rep_sum = old_negative_karma;
    for (var i = 0; i < TOTAL_NUM_ATTESTATIONS; i++){
        pos_rep_sum += pos_reps[i];
        neg_rep_sum += neg_reps[i];
    }
    pos_rep_sum === positive_karma;
    neg_rep_sum === negative_karma;

    // 3.2 Compute new GST leaf
    component new_leaf_hasher = Hasher5();
    new_leaf_hasher.in[0] <== user_exist.out;
    // Last intermediate root is the new user state tree root
    new_leaf_hasher.in[1] <== intermediate_user_state_tree_roots[TOTAL_NUM_ATTESTATIONS];
    new_leaf_hasher.in[2] <== positive_karma;
    new_leaf_hasher.in[3] <== negative_karma;
    new_leaf_hasher.in[4] <== 0;

    new_GST_leaf <== new_leaf_hasher.hash;
    /* End of 3. compute and output new GST leaf */
}