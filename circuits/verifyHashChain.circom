include "./hasherPoseidon.circom";

template VerifyHashChain(NUM_ELEMENT) {
    signal input in_first;
    signal input in_rest[NUM_ELEMENT];
    signal input result;

    component hashers[NUM_ELEMENT];

    signal cur_hash[NUM_ELEMENT];
    cur_hash[0] <== in_first;
    for (var i = 0; i < NUM_ELEMENT; i++) {
        hashers[i] = HashLeftRight();
        hashers[i].left <== in_rest[i];
        hashers[i].right <== cur_hash[i];
        if(i < NUM_ELEMENT - 1)
            cur_hash[i + 1] <== hashers[i].hash;
    }
    result === hashers[NUM_ELEMENT - 1].hash;
}