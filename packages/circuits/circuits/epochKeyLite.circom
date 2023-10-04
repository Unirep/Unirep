pragma circom 2.1.0;

include "./circomlib/circuits/bitify.circom";
include "./circomlib/circuits/comparators.circom";
include "./hasher.circom";

template EpochKeyLite(EPOCH_KEY_NONCE_PER_EPOCH) {
    
    var NONCE_BITS = 8;
    var ATTESTER_ID_BITS = 160;
    var EPOCH_BITS = 48;
    var CHAIN_ID_BITS = 36;
    var REVEAL_NONCE_BITS = 1;

    assert(EPOCH_KEY_NONCE_PER_EPOCH < 2**NONCE_BITS);

    // inputs
    signal input identity_secret;
    signal input reveal_nonce;
    signal input attester_id;
    signal input epoch;
    signal input nonce;
    signal input sig_data; // public
    signal input chain_id;

    // outputs
    signal output control;
    signal output epoch_key;

    // dummy square to ensure constraint
    signal sig_data_square <== sig_data * sig_data;
    /**
     * Control structure
     * 8 bits nonce
     * 48 bits epoch
     * 160 bits attester id
     * 1 bit reveal nonce
     * 36 bit chain id
     **/

    // check that reveal_nonce is 0 or 1
    reveal_nonce * (reveal_nonce - 1) === 0;

    // then range check the others
    _ <== Num2Bits(ATTESTER_ID_BITS)(attester_id);
    _ <== Num2Bits(EPOCH_BITS)(epoch);
    _ <== Num2Bits(NONCE_BITS)(nonce);
    _ <== Num2Bits(CHAIN_ID_BITS)(chain_id);

    signal nonce_lt <== LessThan(NONCE_BITS)([nonce, EPOCH_KEY_NONCE_PER_EPOCH]);
    nonce_lt === 1;

    var acc_bits = 0;
    var acc_control = reveal_nonce * nonce;
    acc_bits += NONCE_BITS;

    acc_control += epoch * 2 ** acc_bits;
    acc_bits += EPOCH_BITS;

    acc_control += attester_id * 2 ** acc_bits;
    acc_bits += ATTESTER_ID_BITS;

    acc_control += reveal_nonce * 2 ** acc_bits;
    acc_bits += REVEAL_NONCE_BITS;

    acc_control += chain_id * 2 ** acc_bits;
    control <== acc_control;

    epoch_key <== EpochKeyHasher()(
        identity_secret,
        attester_id,
        epoch,
        nonce,
        chain_id
    );
}
