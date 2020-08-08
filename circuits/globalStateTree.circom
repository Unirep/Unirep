include "../node_modules/circomlib/circuits/mux1.circom";
include "./hasherPoseidon.circom";
include "./identityCommitment.circom";
include "./incrementalMerkleTree.circom";

template GSTMerkleTreeInclusionProof(n_levels) {
    signal private input identity_pk[2];
    signal private input identity_nullifier;
    signal private input identity_trapdoor;
    signal private input user_state_root;
    signal input path_index[n_levels];
    signal input path_elements[n_levels];
    signal output root;

    component selectors[n_levels];
    component hashers[n_levels];

    component identity_commitment = IdentityCommitment();
    identity_commitment.identity_pk[0] <== identity_pk[0]
    identity_commitment.identity_pk[1] <== identity_pk[1]
    identity_commitment.identity_nullifier <== identity_nullifier
    identity_commitment.identity_trapdoor <== identity_trapdoor

    component GST_state_leaf = HashLeftRight();
    GST_state_leaf.left <== identity_commitment.out;
    GST_state_leaf.right <== user_state_root;

    for (var i = 0; i < n_levels; i++) {
        selectors[i] = Selector();
        hashers[i] = HashLeftRight();

        path_index[i] ==> selectors[i].path_index;
        path_elements[i] ==> selectors[i].path_elem;

        selectors[i].left ==> hashers[i].left;
        selectors[i].right ==> hashers[i].right;
    }

    GST_state_leaf.hash ==> selectors[0].input_elem;

    for (var i = 1; i < n_levels; i++) {
        hashers[i-1].hash ==> selectors[i].input_elem;
    }

    root <== hashers[n_levels - 1].hash;
}


template GSTLeafExists(levels){
    // Ensures that a leaf exists within a merkletree with given `root`

    // levels is depth of tree
    signal private input identity_pk[2];
    signal private input identity_nullifier;
    signal private input identity_trapdoor;
    signal private input user_state_root;

    signal private input path_elements[levels];
    signal private input path_index[levels];

    signal input root;

    component merkletree = GSTMerkleTreeInclusionProof(levels);
    merkletree.identity_pk[0] <== identity_pk[0];
    merkletree.identity_pk[1] <== identity_pk[1];
    merkletree.identity_nullifier <== identity_nullifier;
    merkletree.identity_trapdoor <== identity_trapdoor;
    merkletree.user_state_root <== user_state_root;
    for (var i = 0; i < levels; i++) {
        merkletree.path_index[i] <== path_index[i];
        merkletree.path_elements[i] <== path_elements[i];
    }

    root === merkletree.root;
}