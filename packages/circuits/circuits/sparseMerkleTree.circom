include "../../../node_modules/circomlib/circuits/bitify.circom";
include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/mux1.circom";

template Modulo() {
    signal input divisor;
    signal input dividend;
    signal output remainder;

    signal quotient;

    // circom's best practices state that we should avoid using <-- unless
    // we know what we are doing. But this is the only way to perform the
    // modulo operation.
    quotient <-- dividend \ divisor;
    remainder <-- dividend % divisor;

    component remainder_lt;
    // Range check on remainder
    remainder_lt = LessThan(252);
    remainder_lt.in[0] <== remainder;
    remainder_lt.in[1] <== divisor;
    remainder_lt.out === 1;

    // Check equality
    dividend === divisor * quotient + remainder;
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
            modulos[i].dividend <== modulos[i - 1].remainder;
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
