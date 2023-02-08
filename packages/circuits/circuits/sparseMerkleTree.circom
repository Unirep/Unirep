include "./circomlib/circuits/bitify.circom";
include "./circomlib/circuits/poseidon.circom";
include "./circomlib/circuits/comparators.circom";
include "./circomlib/circuits/gates.circom";
include "./circomlib/circuits/mux1.circom";
include "./modulo.circom";

template SMTRootCalc(HEIGHT, ARITY) {
    signal input path_elements[HEIGHT][ARITY];
    signal input path_indices[HEIGHT];
    signal output root;

    component hashers[HEIGHT];
    component leaf_equals[(HEIGHT - 1) * ARITY];
    component index_equals[(HEIGHT - 1) * ARITY];

    for (var i = 0; i < HEIGHT; i++) {
        hashers[i] = Poseidon(ARITY);
        for (var j = 0; j < ARITY; j++) {
            hashers[i].inputs[j] <== path_elements[i][j];
        }
        // start doing checks
        if (i > 0) {
            // range check
            path_indices[i] \ ARITY === 0;
            // check that if we're looking at the target index
            // the previous level output matches
            for (var j = 0; j < ARITY; j++) {
                var index = (i - 1) * ARITY + j;
                leaf_equals[index] = IsEqual();
                leaf_equals[index].in[0] <== hashers[i-1].out;
                leaf_equals[index].in[1] <== path_elements[i][j];
                index_equals[index] = IsEqual();
                index_equals[index].in[0] <== j;
                index_equals[index].in[1] <== path_indices[i];
                index_equals[index].out === leaf_equals[index].out;
            }
        }
    }
    root <== hashers[HEIGHT - 1].out;
}

template SMTInclusionProof(HEIGHT, ARITY) {
    signal input leaf;
    signal input leaf_index;
    signal input path_elements[HEIGHT][ARITY];
    signal output root;

    component hashers[HEIGHT];
    component modulos[HEIGHT];

    // TODO: see if these can be reduced
    // for a tree of height 32 and arity 8 we get
    // ~768 extra constraints because of these
    component selector[HEIGHT * ARITY];
    component equals[HEIGHT * ARITY];

    signal levelHashes[HEIGHT + 1];
    levelHashes[0] <== leaf;

    for (var i = 0; i < HEIGHT; i++) {
        hashers[i] = Poseidon(ARITY);
        modulos[i] = Modulo();
        modulos[i].divisor <== ARITY;
        if (i == 0) {
            modulos[i].dividend <== leaf_index;
        } else {
            modulos[i].dividend <== modulos[i - 1].quotient;
        }

        for (var j = 0; j < ARITY; j++) {
            var component_index = i * ARITY + j;
            equals[component_index] = IsEqual();
            selector[component_index] = Mux1();

            equals[component_index].in[0] <== j;
            equals[component_index].in[1] <== modulos[i].remainder;
            selector[component_index].c[0] <== path_elements[i][j];
            selector[component_index].c[1] <== levelHashes[i];
            selector[component_index].s <== equals[component_index].out;

            hashers[i].inputs[j] <== selector[component_index].out;
        }

        levelHashes[i + 1] <== hashers[i].out;
    }

    root <== levelHashes[HEIGHT];
}


template SMTLeafExists(HEIGHT, ARITY){
    // Ensures that a leaf exists within a merkletree with given `root`

    // HEIGHT is depth of tree
    signal input leaf;

    signal input path_elements[HEIGHT][ARITY];
    signal input leaf_index;

    signal input root;

    component merkletree = SMTInclusionProof(HEIGHT, ARITY);
    merkletree.leaf <== leaf;
    merkletree.leaf_index <== leaf_index;
    for (var i = 0; i < HEIGHT; i++) {
        for (var j = 0; j < ARITY; j++) {
            merkletree.path_elements[i][j] <== path_elements[i][j];
        }
    }

    root === merkletree.root;
}
