include "../node_modules/circomlib/circuits/mux1.circom";
include "./hasherPoseidon.circom";

template VerifyHashChain(NUM_ELEMENT) {
    signal input in_first;
    signal input in_rest[NUM_ELEMENT];
    signal input selectors[NUM_ELEMENT];
    signal input result;

    component hashers[NUM_ELEMENT];
    component toHashOrNot[NUM_ELEMENT];

    signal cur_hash[NUM_ELEMENT + 1];
    cur_hash[0] <== in_first;
    for (var i = 0; i < NUM_ELEMENT; i++) {
        hashers[i] = HashLeftRight();
        hashers[i].left <== in_rest[i];
        hashers[i].right <== cur_hash[i];

        toHashOrNot[i] = Mux1();
        toHashOrNot[i].c[0] <== cur_hash[i];
        toHashOrNot[i].c[1] <== hashers[i].hash;
        toHashOrNot[i].s <== selectors[i];
        cur_hash[i + 1] <== toHashOrNot[i].out;
    }
    result === cur_hash[NUM_ELEMENT];
}