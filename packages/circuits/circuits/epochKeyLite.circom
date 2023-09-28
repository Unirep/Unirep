pragma circom 2.1.0;

include "./circomlib/circuits/bitify.circom";
include "./circomlib/circuits/comparators.circom";
include "./hasher.circom";

template EpochKeyLite(EPOCH_KEY_NONCE_PER_EPOCH) {
    assert(EPOCH_KEY_NONCE_PER_EPOCH < 2**8);

    var NONCE_BITS = 8;
    var ATTESTER_ID_BITS = 160;
    var EPOCH_BITS = 48;

    signal input identity_secret;

    signal input reveal_nonce;
    signal input attester_id;
    signal input epoch;
    signal input nonce;

    signal input sig_data;
    // dummy square to ensure constraint
    signal sig_data_square <== sig_data * sig_data;

    signal output control;
    signal output epoch_key;

    /**
     * Control structure
     * 8 bits nonce
     * 64 bits epoch
     * 160 bits attester_id
     * 1 bit reveal nonce
     **/

    // check that reveal_nonce is 0 or 1
    reveal_nonce * (reveal_nonce - 1) === 0;

    // then range check the others

    _ <== Num2Bits(ATTESTER_ID_BITS)(attester_id);

    _ <== Num2Bits(EPOCH_BITS)(epoch);

    _ <== Num2Bits(NONCE_BITS)(nonce);

    signal nonce_lt <== LessThan(NONCE_BITS)([nonce, EPOCH_KEY_NONCE_PER_EPOCH]);
    nonce_lt === 1;

    control <== reveal_nonce * 2**(NONCE_BITS + EPOCH_BITS + ATTESTER_ID_BITS) + attester_id * 2**(NONCE_BITS + EPOCH_BITS) + epoch * 2**NONCE_BITS + reveal_nonce * nonce;

    epoch_key <== EpochKeyHasher()(
        identity_secret,
        attester_id,
        epoch,
        nonce
    );
}
