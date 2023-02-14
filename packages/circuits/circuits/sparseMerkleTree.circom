include "./circomlib/circuits/poseidon.circom";
include "./circomlib/circuits/comparators.circom";
include "./exists.circom";

template SMTRootCalc(HEIGHT, ARITY) {
    signal input path_elements[HEIGHT][ARITY];
    signal input path_indices[HEIGHT];
    signal output root;

    component hashers[HEIGHT];
    component index_exists[HEIGHT];

    for (var i = 0; i < HEIGHT; i++) {
        hashers[i] = Poseidon(ARITY);
        for (var j = 0; j < ARITY; j++) {
            hashers[i].inputs[j] <== path_elements[i][j];
        }
        // start doing checks
        if (i > 0) {
            index_exists[i] = Exists(ARITY);
            index_exists[i].index <== path_indices[i];
            index_exists[i].value <== hashers[i-1].out;
            for (var j = 0; j < ARITY; j++) {
                index_exists[i].values[j] <== path_elements[i][j];
            }
            index_exists[i].out === 1;
        }
    }
    root <== hashers[HEIGHT - 1].out;
}
