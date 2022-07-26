/*
    Prove: if user starts user state transition from an existed global state tree
    compute the blinded_user_state = hash5(identity, UST_root, epoch, epoch_key_nonce)
    compute teh blinded_hash_chain = hash5(identity, hash_chain_result, epoch, epoch_key_nonce)
    Process attestations proof should start with the blinded_user_state and blinded_hash_chain
*/

include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/mux1.circom";
include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "./identityCommitment.circom";
include "./incrementalMerkleTree.circom";

template StartTransition(GST_tree_depth) {
    // Start from which epoch key nonce
    signal private input epoch;
    signal private input nonce;

    // User state tree
    signal private input user_tree_root;

    // Global state tree leaf: Identity & user state root
    signal private input identity_nullifier;
    signal private input identity_trapdoor;

    // Global state tree
    signal private input GST_path_elements[GST_tree_depth][1];
    signal private input GST_path_index[GST_tree_depth];
    signal output GST_root;

    signal output blinded_user_state;
    signal output blinded_hash_chain_result;

    /* 1. Check if user exists in the Global State Tree */
    component identity_commitment = IdentityCommitment();
    identity_commitment.identity_nullifier <== identity_nullifier;
    identity_commitment.identity_trapdoor <== identity_trapdoor;

    // Compute user state tree root
    component leaf_hasher = Poseidon(2);
    leaf_hasher.inputs[0] <== identity_commitment.out;
    leaf_hasher.inputs[1] <== user_tree_root;

    component merkletree = MerkleTreeInclusionProof(GST_tree_depth);
    merkletree.leaf <== leaf_hasher.out;
    for (var i = 0; i < GST_tree_depth; i++) {
        merkletree.path_index[i] <== GST_path_index[i];
        merkletree.path_elements[i] <== GST_path_elements[i][0];
    }
    GST_root <== merkletree.root;
    /* End of check 1 */

    /* 2. Compute blinded public output */
    // 2.1 blinded_user_state = hash5(identity, UST_root, epoch, epoch_key_nonce)
    component blinded_user_state_hasher = Poseidon(5);
    blinded_user_state_hasher.inputs[0] <== identity_nullifier;
    blinded_user_state_hasher.inputs[1] <== user_tree_root;
    blinded_user_state_hasher.inputs[2] <== epoch;
    blinded_user_state_hasher.inputs[3] <== nonce;
    blinded_user_state_hasher.inputs[4] <== 0;
    blinded_user_state <== blinded_user_state_hasher.out;

    // 2.2 blinded_hash_chain_result = hash5(identity, hash_chain_result, epoch, epoch_key_nonce)
    component blinded_hash_chain_result_hasher = Poseidon(5);
    blinded_hash_chain_result_hasher.inputs[0] <== identity_nullifier;
    blinded_hash_chain_result_hasher.inputs[1] <== 0; // hashchain start from 0
    blinded_hash_chain_result_hasher.inputs[2] <== epoch;
    blinded_hash_chain_result_hasher.inputs[3] <== nonce;
    blinded_hash_chain_result_hasher.inputs[4] <== 0;
    blinded_hash_chain_result <== blinded_hash_chain_result_hasher.out;
    /* End of 2. Compute blinded public output */
}
