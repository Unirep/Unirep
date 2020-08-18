include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/mux1.circom";
include "./incrementalMerkleTree.circom";
include "./hasherPoseidon.circom";

template SMTInclusionProof(n_levels) {
    signal input leaf;
    signal input leaf_index;
    signal input path_elements[n_levels];
    signal output root;

    component selectors[n_levels];
    component hashers[n_levels];

    // Build path indices from leaf index
    signal path_index[n_levels];
    component n2b = Num2Bits(n_levels);
    n2b.in <== leaf_index;
    for (var i = 0; i < n_levels; i++) {
       path_index[i] <== n2b.out[i];
    }


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


template SMTLeafExists(levels){
    // Ensures that a leaf exists within a merkletree with given `root`

    // levels is depth of tree
    signal input leaf;

    signal private input path_elements[levels];
    signal private input leaf_index;

    signal input root;

    component merkletree = SMTInclusionProof(levels);
    merkletree.leaf <== leaf;
    merkletree.leaf_index <== leaf_index;
    for (var i = 0; i < levels; i++) {
        merkletree.path_elements[i] <== path_elements[i];
    }

    root === merkletree.root;
}