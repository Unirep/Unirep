include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/mux1.circom";
include "./hasherPoseidon.circom";

template SMTInclusionProof(n_levels) {
    signal input leaf;
    signal input leaf_index;
    signal input path_elements[n_levels][1];
    signal output root;

    component hashers[n_levels];
    component mux[n_levels];

    signal levelHashes[n_levels + 1];
    levelHashes[0] <== leaf;

    // Build path indices from leaf index
    signal path_index[n_levels];
    component n2b = Num2Bits(n_levels);
    n2b.in <== leaf_index;
    for (var i = 0; i < n_levels; i++) {
       path_index[i] <== n2b.out[i];
    }


    for (var i = 0; i < n_levels; i++) {
        // Should be 0 or 1
        path_index[i] * (1 - path_index[i]) === 0;

        hashers[i] = HashLeftRight();
        mux[i] = MultiMux1(2);

        mux[i].c[0][0] <== levelHashes[i];
        mux[i].c[0][1] <== path_elements[i][0];

        mux[i].c[1][0] <== path_elements[i][0];
        mux[i].c[1][1] <== levelHashes[i];

        mux[i].s <== path_index[i];
        hashers[i].left <== mux[i].out[0];
        hashers[i].right <== mux[i].out[1];

        levelHashes[i + 1] <== hashers[i].hash;
    }

    root <== levelHashes[n_levels];
}


template SMTLeafExists(levels){
    // Ensures that a leaf exists within a merkletree with given `root`

    // levels is depth of tree
    signal input leaf;

    signal private input path_elements[levels][1];
    signal private input leaf_index;

    signal input root;

    component merkletree = SMTInclusionProof(levels);
    merkletree.leaf <== leaf;
    merkletree.leaf_index <== leaf_index;
    for (var i = 0; i < levels; i++) {
        merkletree.path_elements[i][0] <== path_elements[i][0];
    }

    root === merkletree.root;
}