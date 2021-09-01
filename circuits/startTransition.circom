include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/mux1.circom";
include "./hasherPoseidon.circom";
include "./incrementalMerkleTree.circom";
include "./modulo.circom";
include "./sparseMerkleTree.circom";
include "./processAttestations.circom";
include "./userExists.circom";

template StartTransition(GST_tree_depth) {
    // Start from which epoch key nonce
    signal private input epoch;
    signal private input nonce;

    // User state tree
    signal private input user_tree_root;

    // Global state tree leaf: Identity & user state root
    signal private input identity_pk[2];
    signal private input identity_nullifier;
    signal private input identity_trapdoor;

    // Global state tree
    signal private input GST_path_elements[GST_tree_depth][1];
    signal private input GST_path_index[GST_tree_depth];
    signal input GST_root;

    signal output blinded_user_state;
    signal output blinded_hash_chain_result;

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
    user_exist.user_tree_root <== user_tree_root;
    /* End of check 1 */

    /* 2. Compute blinded public output */
    // 2.1 blinded_user_state = hash5(identity, UST_root, epoch, epoch_key_nonce)
    component blinded_user_state_hasher = Hasher5();
    blinded_user_state_hasher.in[0] <== identity_nullifier;
    blinded_user_state_hasher.in[1] <== user_tree_root;
    blinded_user_state_hasher.in[2] <== epoch;
    blinded_user_state_hasher.in[3] <== nonce;
    blinded_user_state_hasher.in[4] <== 0;
    blinded_user_state <== blinded_user_state_hasher.hash;

    // 2.2 blinded_hash_chain_result = hash5(identity, hash_chain_result, epoch, epoch_key_nonce)
    component blinded_hash_chain_result_hasher = Hasher5();
    blinded_hash_chain_result_hasher.in[0] <== identity_nullifier;
    blinded_hash_chain_result_hasher.in[1] <== 0; // hashchain start from 0
    blinded_hash_chain_result_hasher.in[2] <== epoch;
    blinded_hash_chain_result_hasher.in[3] <== nonce;
    blinded_hash_chain_result_hasher.in[4] <== 0;
    blinded_hash_chain_result <== blinded_hash_chain_result_hasher.hash;
    /* End of 2. Compute blinded public output */
}