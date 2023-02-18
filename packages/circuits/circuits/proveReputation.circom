pragma circom 2.0.0;

/*
    Prove:
        1. if user has a leaf in current state tree
        2. leaf has claimed reputation
        4. output a chosen epoch key
*/

include "./circomlib/circuits/comparators.circom";
include "./circomlib/circuits/gates.circom";
include "./circomlib/circuits/poseidon.circom";
include "./sparseMerkleTree.circom";
include "./incrementalMerkleTree.circom";
include "./epochKey.circom";

template ProveReputation(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, SUM_FIELD_COUNT, FIELD_COUNT, EPK_R) {
    signal output epoch_key;

    // Global state tree leaf: Identity & user state root
    signal input identity_secret;
    // Global state tree
    signal input state_tree_indexes[STATE_TREE_DEPTH];
    signal input state_tree_elements[STATE_TREE_DEPTH][1];
    signal output state_tree_root;
    // Attestation by the attester
    signal input data[FIELD_COUNT];
    // Graffiti
    signal input prove_graffiti;
    signal input graffiti_pre_image;
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

    // then range check the others
    component min_rep_bits = Num2Bits(254);
    min_rep_bits.in <== min_rep;
    for (var x = 64; x < 254; x++) {
        min_rep_bits.out[x] === 0;
    }

    component max_rep_bits = Num2Bits(254);
    max_rep_bits.in <== max_rep;
    for (var x = 64; x < 254; x++) {
        max_rep_bits.out[x] === 0;
    }

    control[1] <== prove_graffiti * 2 ** 131 + prove_zero_rep * 2 ** 130 + prove_max_rep * 2**129 + prove_min_rep * 2**128 + max_rep * 2**64 + min_rep;

    /* 1a. Do the epoch key proof, state tree membership */

    component epoch_key_prover = EpochKey(
      STATE_TREE_DEPTH,
      EPOCH_KEY_NONCE_PER_EPOCH,
      FIELD_COUNT,
      EPK_R
    );
    epoch_key_prover.identity_secret <== identity_secret;
    epoch_key_prover.reveal_nonce <== reveal_nonce;
    epoch_key_prover.attester_id <== attester_id;
    epoch_key_prover.epoch <== epoch;
    epoch_key_prover.nonce <== nonce;
    epoch_key_prover.sig_data <== sig_data;
    for (var i = 0; i < STATE_TREE_DEPTH; i++) {
        epoch_key_prover.state_tree_indexes[i] <== state_tree_indexes[i];
        epoch_key_prover.state_tree_elements[i] <== state_tree_elements[i][0];
    }
    for (var i = 0; i < FIELD_COUNT; i++) {
        epoch_key_prover.data[i] <== data[i];
    }

    control[0] <== epoch_key_prover.control;
    epoch_key <== epoch_key_prover.epoch_key;
    state_tree_root <== epoch_key_prover.state_tree_root;

    /* End of check 1a */

    /* 2. Check if user has reputation greater than min_rep */
    // if proving min_rep > 0, check if data[0] >= data[1] + min_rep

    component min_rep_check = GreaterEqThan(252);
    min_rep_check.in[0] <== data[0];
    min_rep_check.in[1] <== data[1] + min_rep;

    component if_not_prove_min_rep = IsZero();
    if_not_prove_min_rep.in <== prove_min_rep;

    component output_rep_check = OR();
    output_rep_check.a <== if_not_prove_min_rep.out;
    output_rep_check.b <== min_rep_check.out;

    output_rep_check.out === 1;

    /* End of check 2 */

    /* 3. Check if user has reputation less than max_rep */
    // if proving max_rep > 0, check if data[1] >= data[0] + max_rep

    component max_rep_check = GreaterEqThan(252);
    max_rep_check.in[0] <== data[1];
    max_rep_check.in[1] <== data[0] + max_rep;

    component if_not_prove_max_rep = IsZero();
    if_not_prove_max_rep.in <== prove_max_rep;

    component max_rep_check_out = OR();
    max_rep_check_out.a <== if_not_prove_max_rep.out;
    max_rep_check_out.b <== max_rep_check.out;

    max_rep_check_out.out === 1;

    /* End of check 3 */

    /* 4. Check if user has net 0 reputation */

    component zero_rep_check = IsEqual();
    zero_rep_check.in[0] <== data[0];
    zero_rep_check.in[1] <== data[1];

    component if_not_prove_zero_rep = IsZero();
    if_not_prove_zero_rep.in <== prove_zero_rep;

    component zero_rep_check_out = OR();
    zero_rep_check_out.a <== if_not_prove_zero_rep.out;
    zero_rep_check_out.b <== zero_rep_check.out;

    zero_rep_check_out.out === 1;

    /* End of check 4 */

    /* 3. Prove the graffiti pre-image if needed */

    component if_not_check_graffiti = IsZero();
    if_not_check_graffiti.in <== prove_graffiti;

    component graffiti_hasher = Poseidon(1);
    graffiti_hasher.inputs[0] <== graffiti_pre_image;

    component graffiti_eq = IsEqual();
    graffiti_eq.in[0] <== graffiti_hasher.out;
    graffiti_eq.in[1] <== data[SUM_FIELD_COUNT];

    component check_graffiti = OR();
    check_graffiti.a <== if_not_check_graffiti.out;
    check_graffiti.b <== graffiti_eq.out;

    check_graffiti.out === 1;

    /* End of check 3 */
}
