pragma circom 2.1.3;

include "./circomlib/circuits/poseidon.circom";

template EpochKeyLite(EPOCH_KEY_NONCE_PER_EPOCH) {
    signal input identity_secret;

    signal input control;
    signal input data;

    signal output control_output;
    signal output epoch_key;

    /**
     * Control structure
     * 8 bits nonce
     * 64 bits epoch
     * 160 bits attester_id
     * 1 bit reveal nonce
     **/

    signal control_divided <-- control \ (2 ** 233);
    control_divided === 0;
    signal reveal_nonce <-- (control \ 2 ** 232) & 1;
    signal attester_id <-- (control \ 2 ** 72) & (2 ** 160 - 1);
    signal epoch <-- (control \ 2 ** 8) & (2 ** 64 - 1);
    signal nonce <-- control & (2 ** 8 - 1);

    signal reveal_nonce_divided <-- reveal_nonce \ 2;
    signal attester_id_divided <-- attester_id \ 2**160;
    signal epoch_divided <-- epoch \ 2**64;
    signal nonce_divided <-- nonce \ 2**8;
    reveal_nonce_divided === 0;
    attester_id_divided === 0;
    epoch_divided === 0;
    nonce_divided === 0;

    control === reveal_nonce * 2**232 + attester_id * 2**72 + epoch * 2**8 + nonce;

    // check the epoch key range using a single constraint
    signal epknonce_divided <-- nonce \ EPOCH_KEY_NONCE_PER_EPOCH;
    epknonce_divided === 0;

    control_output <== reveal_nonce * 2**232 + attester_id * 2**72 + epoch * 2**8 + reveal_nonce * nonce;

    component epoch_key_hasher = Poseidon(4);
    epoch_key_hasher.inputs[0] <== identity_secret;
    epoch_key_hasher.inputs[1] <== attester_id;
    epoch_key_hasher.inputs[2] <== epoch;
    epoch_key_hasher.inputs[3] <== nonce;

    epoch_key <== epoch_key_hasher.out;
}
