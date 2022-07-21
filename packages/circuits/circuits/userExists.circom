/*
    Prove: if user's identity and the user state tree root is one of the global state tree leaf
    global state tree leaf = hashLeftRight(id_commitment, user_state_tree_root)
*/


include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "./identityCommitment.circom";
include "./incrementalMerkleTree.circom";

template UserExists(GST_tree_depth){
    // Global state tree
    signal private input GST_path_index[GST_tree_depth];
    signal private input GST_path_elements[GST_tree_depth][1];
    signal input GST_root;
    // Global state tree leaf: Identity & user state root
    signal private input identity_nullifier;
    signal private input identity_trapdoor;
    signal private input user_tree_root;
    signal output out;
    
    component identity_commitment = IdentityCommitment();
    identity_commitment.identity_nullifier <== identity_nullifier;
    identity_commitment.identity_trapdoor <== identity_trapdoor;
    out <== identity_commitment.out;

    // Compute user state tree root
    component leaf_hasher = Poseidon(2);
    leaf_hasher.inputs[0] <== identity_commitment.out;
    leaf_hasher.inputs[1] <== user_tree_root;

    // Check if user state hash is in GST
    component GST_leaf_exists = LeafExists(GST_tree_depth);
    GST_leaf_exists.leaf <== leaf_hasher.out;
    for (var i = 0; i < GST_tree_depth; i++) {
        GST_leaf_exists.path_index[i] <== GST_path_index[i];
        GST_leaf_exists.path_elements[i][0] <== GST_path_elements[i][0];
    }
    GST_leaf_exists.root <== GST_root;
}