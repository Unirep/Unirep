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
    EPOCH_KEY_NONCE_PER_EPOCH) {
    signal input epoch;

    // User state tree
    // First intermediate root is the user state tree root before processing
    // Last intermediate root is the new user state tree root after processing
    signal input blinded_user_state[EPOCH_KEY_NONCE_PER_EPOCH];
    signal private input intermediate_user_state_tree_roots[EPOCH_KEY_NONCE_PER_EPOCH + 1];

    // Global state tree leaf: Identity & user state root
    signal private input identity_pk[2];
    signal private input identity_nullifier;
    signal private input identity_trapdoor;

    // Global state tree
    signal private input GST_path_elements[GST_tree_depth][1];
    signal private input GST_path_index[GST_tree_depth];
    signal input GST_root;

    // Epoch key & epoch tree
    signal private input epk_path_elements[EPOCH_KEY_NONCE_PER_EPOCH][epoch_tree_depth][1];
    signal private input hash_chain_results[EPOCH_KEY_NONCE_PER_EPOCH];
    signal input blinded_hash_chain_results[EPOCH_KEY_NONCE_PER_EPOCH];
    signal input epoch_tree_root;

    signal output new_GST_leaf;
    signal output epoch_key_nullifier[EPOCH_KEY_NONCE_PER_EPOCH];

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
    /* End of check 1 */

    /* 2. Process the hashchain of the epoch key specified by nonce `n` */
    var start_index;
    component blinded_hash_chain_hasher[EPOCH_KEY_NONCE_PER_EPOCH];
    component seal_hash_chain_hasher[EPOCH_KEY_NONCE_PER_EPOCH];
    component epkExist[EPOCH_KEY_NONCE_PER_EPOCH];
    for (var n = 0; n < EPOCH_KEY_NONCE_PER_EPOCH; n++) {
        // 2.1 Check if blinded hash chain matches hash chain
        blinded_hash_chain_hasher[n] = Hasher5();
        blinded_hash_chain_hasher[n].in[0] <== identity_nullifier;
        blinded_hash_chain_hasher[n].in[1] <== hash_chain_results[n];
        blinded_hash_chain_hasher[n].in[2] <== epoch;
        blinded_hash_chain_hasher[n].in[3] <== n;
        blinded_hash_chain_hasher[n].in[4] <== 0;
        blinded_hash_chain_results[n] === blinded_hash_chain_hasher[n].hash;

        // 2.2 Sealed the hash chain result
        seal_hash_chain_hasher[n] = HashLeftRight()
        seal_hash_chain_hasher[n].left <== 1;
        seal_hash_chain_hasher[n].right <== hash_chain_results[n];

        // 2.3 Check if epoch key exists in epoch tree
        epkExist[n] = epochKeyExist(epoch_tree_depth);
        epkExist[n].identity_nullifier <== identity_nullifier;
        epkExist[n].epoch <== epoch;
        epkExist[n].nonce <== n;
        epkExist[n].hash_chain_result <== seal_hash_chain_hasher[n].hash;
        epkExist[n].epoch_tree_root <== epoch_tree_root;
        for (var i = 0; i < epoch_tree_depth; i++) {
            epkExist[n].path_elements[i][0] <== epk_path_elements[n][i][0];
        }
    }
    /* End of 2. process the hashchain of the epoch key specified by nonce `n` */

    /* 3. Check if blinded user state matches */
    component blinded_user_state_hasher[EPOCH_KEY_NONCE_PER_EPOCH];
    for (var n = 0; n < EPOCH_KEY_NONCE_PER_EPOCH; n++) {
        blinded_user_state_hasher[n] = Hasher5();
        blinded_user_state_hasher[n].in[0] <== identity_nullifier;
        blinded_user_state_hasher[n].in[1] <== intermediate_user_state_tree_roots[n + 1];
        blinded_user_state_hasher[n].in[2] <== epoch;
        blinded_user_state_hasher[n].in[3] <== n;
        blinded_user_state_hasher[n].in[4] <== 0;
        blinded_user_state[n] === blinded_user_state_hasher[n].hash;
    }
    /* End of 3. Check if blinded user state matches*/

    /* 4. Compute and output nullifiers and new GST leaf */
    // 4.1 Compute nullifier
    component epoch_key_nullifier_hasher[EPOCH_KEY_NONCE_PER_EPOCH];
    for (var n = 0; n < EPOCH_KEY_NONCE_PER_EPOCH; n++) {
        epoch_key_nullifier_hasher[n] = Hasher5();
        epoch_key_nullifier_hasher[n].in[0] <== 1;  // 1 is the domain separator for epoch key nullifier
        epoch_key_nullifier_hasher[n].in[1] <== identity_nullifier;
        epoch_key_nullifier_hasher[n].in[2] <== epoch;
        epoch_key_nullifier_hasher[n].in[3] <== n;
        epoch_key_nullifier_hasher[n].in[4] <== 0;
        epoch_key_nullifier[n] <== epoch_key_nullifier_hasher[n].hash;
    }

    // 4.2 Compute new GST leaf
    component new_leaf_hasher = HashLeftRight();
    new_leaf_hasher.left <== user_exist.out;
    // Last intermediate root is the new user state tree root
    new_leaf_hasher.right <== intermediate_user_state_tree_roots[EPOCH_KEY_NONCE_PER_EPOCH];
    new_GST_leaf <== new_leaf_hasher.hash;
    /* End of 4. compute and output nullifiers and new GST leaf */
}