// Refer to:
// https://github.com/appliedzkp/maci/blob/master/circuits/circom/trees/incrementalMerkleTree.circom

include "../node_modules/circomlib/circuits/mux1.circom";
include "./hasherPoseidon.circom";

template Selector() {
    signal input input_elem;
    signal input path_elem;
    signal input path_index;

    signal output left;
    signal output right;

    path_index * (1-path_index) === 0

    component mux = MultiMux1(2);
    mux.c[0][0] <== input_elem;
    mux.c[0][1] <== path_elem;

    mux.c[1][0] <== path_elem;
    mux.c[1][1] <== input_elem;

    mux.s <== path_index;

    left <== mux.out[0];
    right <== mux.out[1];
}

template MerkleTreeInclusionProof(n_levels) {
    signal input leaf;
    signal input path_index[n_levels];
    signal input path_elements[n_levels];
    signal output root;

    component selectors[n_levels];
    component hashers[n_levels];

    for (var i = 0; i < n_levels; i++) {
        selectors[i] = Selector();
        hashers[i] = HashLeftRight();

        path_index[i] ==> selectors[i].path_index;
        path_elements[i] ==> selectors[i].path_elem;

        selectors[i].left ==> hashers[i].left;
        selectors[i].right ==> hashers[i].right;
    }

    leaf ==> selectors[0].input_elem;

    for (var i = 1; i < n_levels; i++) {
        hashers[i-1].hash ==> selectors[i].input_elem;
    }

    root <== hashers[n_levels - 1].hash;
}


template LeafExists(levels){
    // Ensures that a leaf exists within a merkletree with given `root`

    // levels is depth of tree
    signal input leaf;

    signal private input path_elements[levels];
    signal private input path_index[levels];

    signal input root;

    component merkletree = MerkleTreeInclusionProof(levels);
    merkletree.leaf <== leaf;
    for (var i = 0; i < levels; i++) {
        merkletree.path_index[i] <== path_index[i];
        merkletree.path_elements[i] <== path_elements[i];
    }

    root === merkletree.root;
}