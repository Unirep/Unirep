pragma circom 2.0.0;

/*
    Prove:
        1. if user has a leaf in current state tree
        2. leaf has claimed reputation
        4. output a chosen epoch key
*/

include "./circomlib/circuits/comparators.circom";
include "./circomlib/circuits/gates.circom";
include "./bigComparators.circom";
include "./incrementalMerkleTree.circom";
include "./epochKey.circom";

template Reputation(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, SUM_FIELD_COUNT, FIELD_COUNT, REPL_NONCE_BITS) {
    assert(SUM_FIELD_COUNT < FIELD_COUNT);

    // Global state tree leaf: Identity & user state root
    signal input identity_secret;
    // Global state tree
    signal input state_tree_indexes[STATE_TREE_DEPTH];
    signal input state_tree_elements[STATE_TREE_DEPTH];
    // Attestation by the attester
    signal input data[FIELD_COUNT];
    // Graffiti
    signal input prove_graffiti;
    signal input graffiti; // public
    // Epoch key
    signal input reveal_nonce;
    signal input attester_id;
    signal input epoch;
    signal input nonce;
    // Reputation
    signal input min_rep;
    signal input max_rep;
    signal input prove_min_rep;
    signal input prove_max_rep;
    signal input prove_zero_rep;
    signal input sig_data; // public
    signal input chain_id;

    signal output epoch_key;
    signal output state_tree_root;
    signal output control[2];

    // control[0]
    var NONCE_BITS = 8;
    var EPOCH_BITS = 48;
    var ATTESTER_ID_BITS = 160;
    var REVEAL_NONCE_BITS = 1;
    var CHAIN_ID_BITS = 36;
    // control[1]
    var REP_BITS = 64;
    var ONE_BIT = 1;


    // check that one bit signal is 0 or 1
    prove_graffiti * (prove_graffiti - 1) === 0;
    prove_min_rep * (prove_min_rep - 1) === 0;
    prove_max_rep * (prove_max_rep - 1) === 0;
    prove_zero_rep * (prove_zero_rep - 1) === 0;

    // range check
    _ <== Num2Bits(REP_BITS)(min_rep);
    _ <== Num2Bits(REP_BITS)(max_rep);
    _ <== Num2Bits(253-REPL_NONCE_BITS)(graffiti);

    var acc_bits = 0;
    var control1 = min_rep;
    acc_bits += REP_BITS;

    control1 += max_rep * 2**(acc_bits);
    acc_bits += REP_BITS;

    control1 += prove_min_rep * 2 **(acc_bits);
    acc_bits += ONE_BIT;

    control1 += prove_max_rep * 2 **(acc_bits);
    acc_bits += ONE_BIT;

    control1 += prove_zero_rep * 2 **(acc_bits);
    acc_bits += ONE_BIT;

    control1 += prove_graffiti * 2 **(acc_bits);
    control[1] <== control1;

    /* 1a. Do the epoch key proof, state tree membership */

    // range check
    _ <== Num2Bits(EPOCH_BITS)(epoch);
    _ <== Num2Bits(ATTESTER_ID_BITS)(attester_id);
    _ <== Num2Bits(CHAIN_ID_BITS)(chain_id);

    (epoch_key, state_tree_root, control[0]) <== EpochKey(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, FIELD_COUNT)(
        state_tree_indexes,
        state_tree_elements,
        identity_secret,
        reveal_nonce,
        attester_id,
        epoch,
        nonce,
        data,
        sig_data,
        chain_id
    );

    /* End of check 1a */

    /* 2. Check if user has reputation greater than min_rep */
    // if proving min_rep > 0, check if data[0] >= data[1] + min_rep

    // range check
    _ <== Num2Bits(REP_BITS)(data[0]);
    _ <== Num2Bits(REP_BITS)(data[1]);

    signal min_rep_check <== GreaterEqThan(REP_BITS+2)([data[0], data[1] + min_rep]);
    signal if_not_prove_min_rep <== IsZero()(prove_min_rep);
    signal output_rep_check <== OR()(if_not_prove_min_rep, min_rep_check);
    output_rep_check === 1;

    /* End of check 2 */

    /* 3. Check if user has reputation less than max_rep */
    // if proving max_rep > 0, check if data[1] >= data[0] + max_rep

    signal max_rep_check <== GreaterEqThan(REP_BITS+2)([data[1], data[0] + max_rep]);
    signal if_not_prove_max_rep <== IsZero()(prove_max_rep);
    signal max_rep_check_out <== OR()(if_not_prove_max_rep, max_rep_check);
    max_rep_check_out === 1;

    /* End of check 3 */

    /* 4. Check if user has net 0 reputation */

    signal zero_rep_check <== IsEqual()([data[0], data[1]]);
    signal if_not_prove_zero_rep <== IsZero()(prove_zero_rep);
    signal zero_rep_check_out <== OR()(if_not_prove_zero_rep, zero_rep_check);
    zero_rep_check_out === 1;

    /* End of check 4 */

    /* 3. Prove the graffiti if needed */

    signal if_not_check_graffiti <== IsZero()(prove_graffiti);
    signal graffiti_data;
    (graffiti_data, _) <== ExtractBits(REPL_NONCE_BITS, 253-REPL_NONCE_BITS)(data[SUM_FIELD_COUNT]);
    signal repl_field_equal <== IsEqual()([graffiti, graffiti_data]);
    signal check_graffiti <== OR()(if_not_check_graffiti, repl_field_equal);
    check_graffiti === 1;

    /* End of check 3 */
}
