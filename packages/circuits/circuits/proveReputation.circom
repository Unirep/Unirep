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

template ProveReputation(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, SUM_FIELD_COUNT, FIELD_COUNT, REPL_NONCE_BITS) {
    assert(SUM_FIELD_COUNT < FIELD_COUNT);

    signal output epoch_key;

    // Global state tree leaf: Identity & user state root
    signal input identity_secret;
    // Global state tree
    signal input state_tree_indexes[STATE_TREE_DEPTH];
    signal input state_tree_elements[STATE_TREE_DEPTH];
    signal output state_tree_root;
    // Attestation by the attester
    signal input data[FIELD_COUNT];
    // Graffiti
    signal input prove_graffiti;
    signal input graffiti;
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

    signal output control[2];

    signal input sig_data;

    /**
     * control[0]:
     * 8 bits nonce
     * 64 bits epoch
     * 160 bits attester_id
     * 1 bit reveal_nonce
     * control[1]:
     * 64 bits min_rep
     * 64 bits max_rep
     * 1 bit prove min_rep
     * 1 bit prove max_rep
     * 1 bit prove zero rep
     * 1 bit prove_graffiti
     **/

    // check that one bit signal is 0 or 1
    prove_graffiti * (prove_graffiti - 1) === 0;
    prove_min_rep * (prove_min_rep - 1) === 0;
    prove_max_rep * (prove_max_rep - 1) === 0;
    prove_zero_rep * (prove_zero_rep - 1) === 0;

    // range check
    _ <== Num2Bits(64)(min_rep);
    _ <== Num2Bits(64)(max_rep);

    control[1] <== prove_graffiti * 2 ** 131 + prove_zero_rep * 2 ** 130 + prove_max_rep * 2**129 + prove_min_rep * 2**128 + max_rep * 2**64 + min_rep;

    /* 1a. Do the epoch key proof, state tree membership */

    // range check
    _ <== Num2Bits(48)(epoch);
    _ <== Num2Bits(160)(attester_id);

    (epoch_key, state_tree_root, control[0]) <== EpochKey(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, FIELD_COUNT)(
        state_tree_indexes,
        state_tree_elements,
        identity_secret,
        reveal_nonce,
        attester_id,
        epoch,
        nonce,
        data,
        sig_data
    );

    /* End of check 1a */

    /* 2. Check if user has reputation greater than min_rep */
    // if proving min_rep > 0, check if data[0] >= data[1] + min_rep

    // range check
    _ <== Num2Bits(64)(data[0]);
    _ <== Num2Bits(64)(data[1]);

    signal min_rep_check <== GreaterEqThan(66)([data[0], data[1] + min_rep]);
    signal if_not_prove_min_rep <== IsZero()(prove_min_rep);
    signal output_rep_check <== OR()(if_not_prove_min_rep, min_rep_check);
    output_rep_check === 1;

    /* End of check 2 */

    /* 3. Check if user has reputation less than max_rep */
    // if proving max_rep > 0, check if data[1] >= data[0] + max_rep

    signal max_rep_check <== GreaterEqThan(66)([data[1], data[0] + max_rep]);
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
    signal repl_field_equal <== replFieldEqual(REPL_NONCE_BITS)([graffiti, data[SUM_FIELD_COUNT]]);
    signal check_graffiti <== OR()(if_not_check_graffiti, repl_field_equal);
    check_graffiti === 1;

    /* End of check 3 */
}
