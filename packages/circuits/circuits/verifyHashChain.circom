include "../../../node_modules/circomlib/circuits/mux1.circom";
include "./hasherPoseidon.circom";

/*
    Verify sealed hash chain result is computed correctly
    hash_attestation_i = hash5(attester_id_i, pos_rep_i, neg_rep_i, graffiti_i, sign_up_i)
    hash_chain_1 = hashLeftRight(hash_attestation_1, 0)
    hash_chain_n = hashLeftRight(hash_attestation_n, hash_chain_{n-1})
    sealed_hash_chain = hashLeftRight(1, hash_chain_n)
*/

template VerifyHashChain(NUM_ELEMENT) {
    signal input hashes[NUM_ELEMENT];
    // Selector is used to determined if the hash should be included in the hash chain
    signal input selectors[NUM_ELEMENT];
    signal input result;

    component hashers[NUM_ELEMENT];
    component toHashOrNot[NUM_ELEMENT];

    signal cur_hash[NUM_ELEMENT + 1];
    // Hash chain starts with hashLeftRight(x, 0)
    cur_hash[0] <== 0;
    for (var i = 0; i < NUM_ELEMENT; i++) {
        hashers[i] = HashLeftRight();
        hashers[i].left <== hashes[i];
        hashers[i].right <== cur_hash[i];

        toHashOrNot[i] = Mux1();
        toHashOrNot[i].c[0] <== cur_hash[i];
        toHashOrNot[i].c[1] <== hashers[i].hash;
        toHashOrNot[i].s <== selectors[i];
        cur_hash[i + 1] <== toHashOrNot[i].out;
    }

    // Hash chain is sealed with hashLeftRight(1, y)
    component finalHasher = HashLeftRight();
    finalHasher.left <== 1;
    finalHasher.right <== cur_hash[NUM_ELEMENT];
    result === finalHasher.hash;
}

/*
    Verify sealed hash chain result is computed correctly without sealing
    hash_attestation_i = hash5(attester_id_i, pos_rep_i, neg_rep_i, graffiti_i, sign_up_i)
    hash_chain_1 = hashLeftRight(hash_attestation_1, 0)
    hash_chain_n = hashLeftRight(hash_attestation_n, hash_chain_{n-1})
*/

template HashChainHaser(NUM_ELEMENT) {
    signal input hash_starter;
    signal input hashes[NUM_ELEMENT];
    // Selector is used to determined if the hash should be included in the hash chain
    signal input selectors[NUM_ELEMENT];
    signal output result;

    component hashers[NUM_ELEMENT];
    component toHashOrNot[NUM_ELEMENT];

    signal cur_hash[NUM_ELEMENT + 1];
    // Hash chain starts with hashLeftRight(x, 0)
    cur_hash[0] <== hash_starter;
    for (var i = 0; i < NUM_ELEMENT; i++) {
        hashers[i] = HashLeftRight();
        hashers[i].left <== hashes[i];
        hashers[i].right <== cur_hash[i];

        toHashOrNot[i] = Mux1();
        toHashOrNot[i].c[0] <== cur_hash[i];
        toHashOrNot[i].c[1] <== hashers[i].hash;
        toHashOrNot[i].s <== selectors[i];
        cur_hash[i + 1] <== toHashOrNot[i].out;
    }

    result <== cur_hash[NUM_ELEMENT];
}