pragma circom 2.0.0;

include "./circomlib/circuits/poseidon.circom";
include "./incrementalMerkleTree.circom";
include "./circomlib/circuits/gates.circom";
include "./circomlib/circuits/poseidon.circom";
include "./sparseMerkleTree.circom";

template PreventDoubleAction(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, MAX_REPUTATION_SCORE_BITS) {
    // Global state tree
    signal input state_tree_indexes[STATE_TREE_DEPTH];
    signal input state_tree_elements[STATE_TREE_DEPTH][1];
    signal output state_tree_root;

    // Global state tree leaf: Identity & user state root
    signal input identity_secret;

    // Optionally reveal nonce, epoch, attester_id
    signal input control[2];
    signal output control_output[2];
    signal output epoch_key;

    signal input pos_rep;
    signal input neg_rep;
    signal input graffiti;
    signal input timestamp;
    signal input graffiti_pre_image;

    /**
     * control[0] structure:
     * 8 bits nonce
     * 64 bits epoch
     * 160 bits attester_id
     * 1 bit reveal nonce
     * 1 bit prove_graffiti
     **/
    control[0] \ (2 ** 234) === 0;
    signal prove_graffiti <-- (control[0] \ 2 ** 233) & 1;
    signal reveal_nonce <-- (control[0] \ 2 ** 232) & 1;
    signal attester_id <-- (control[0] \ 2 ** 72) & (2 ** 160 - 1);
    signal epoch <-- (control[0] \ 2 ** 8) & (2 ** 64 - 1);
    signal nonce <-- control[0] & (2 ** 8 - 1);

    // individual range check
    prove_graffiti \ 2 === 0;
    reveal_nonce \ 2 === 0;
    attester_id \ 2**160 === 0;
    epoch \ 2**64 === 0;
    nonce \ 2**8 === 0;

    // check extended value
    control[0] === prove_graffiti * 2 ** 233 + reveal_nonce * 2**232 + attester_id * 2**72 + epoch * 2**8 + nonce;

    /**
     * control[1] structure:
     * 64 bits min_rep
     * 64 bits max_rep
     * 1 bit prove_min_rep
     * 1 bit prove_max_rep
     * 1 bit prove_zero_rep
     **/
    control[1] \ (2 ** 131) === 0;
    signal prove_zero_rep <-- (control[1] \ 2 ** 130) & 1;
    signal prove_max_rep <-- (control[1] \ 2 ** 129) & 1;
    signal prove_min_rep <-- (control[1] \ 2 ** 128) & 1;
    signal max_rep <-- (control[1] \ 2 ** 64) & (2 ** 64 - 1);
    signal min_rep <-- control[1] & (2 ** 64 - 1);

    // individual range check
    prove_zero_rep \ 2 === 0;
    prove_max_rep \ 2 === 0;
    prove_min_rep \ 2 === 0;
    max_rep \ 2**64 === 0;
    min_rep \ 2**64 === 0;

    // check extended value
    control[1] === prove_zero_rep * 2 ** 130 + prove_max_rep * 2**129 + prove_min_rep * 2**128 + max_rep * 2**64 + min_rep;

    control_output[0] <== prove_graffiti * 2 ** 233 + reveal_nonce * 2**232 + attester_id * 2**72 + epoch * 2**8 + reveal_nonce * nonce;
    control_output[1] <== control[1];

    /* 1. Check if user exists in the Global State Tree*/
    // Compute user state tree root
    component leaf_hasher = Poseidon(7);
    leaf_hasher.inputs[0] <== identity_secret;
    leaf_hasher.inputs[1] <== attester_id;
    leaf_hasher.inputs[2] <== epoch;
    leaf_hasher.inputs[3] <== pos_rep;
    leaf_hasher.inputs[4] <== neg_rep;
    leaf_hasher.inputs[5] <== graffiti;
    leaf_hasher.inputs[6] <== timestamp;


    component merkletree = MerkleTreeInclusionProof(STATE_TREE_DEPTH);
    merkletree.leaf <== leaf_hasher.out;
    for (var i = 0; i < STATE_TREE_DEPTH; i++) {
        merkletree.path_index[i] <== state_tree_indexes[i];
        merkletree.path_elements[i] <== state_tree_elements[i];
    }
    state_tree_root <== merkletree.root;

    /* 2. Check if user has reputation greater than min_rep */
    // if proving min_rep > 0, check if pos_rep >= neg_rep + min_rep
    component min_rep_check = GreaterEqThan(MAX_REPUTATION_SCORE_BITS);
    min_rep_check.in[0] <== pos_rep;
    min_rep_check.in[1] <== neg_rep + min_rep;

    component if_not_prove_min_rep = IsZero();
    if_not_prove_min_rep.in <== prove_min_rep;

    component output_rep_check = OR();
    output_rep_check.a <== if_not_prove_min_rep.out;
    output_rep_check.b <== min_rep_check.out;

    output_rep_check.out === 1;

    /* 3. Check if user has reputation less than max_rep */
    // if proving max_rep > 0, check if neg_rep >= pos_rep + min_rep
    component max_rep_check = GreaterEqThan(MAX_REPUTATION_SCORE_BITS);
    max_rep_check.in[0] <== neg_rep;
    max_rep_check.in[1] <== pos_rep + max_rep;

    component if_not_prove_max_rep = IsZero();
    if_not_prove_max_rep.in <== prove_max_rep;

    component max_rep_check_out = OR();
    max_rep_check_out.a <== if_not_prove_max_rep.out;
    max_rep_check_out.b <== max_rep_check.out;

    max_rep_check_out.out === 1;

    /* 4. Check if user has net 0 reputation */
    component zero_rep_check = IsEqual();
    zero_rep_check.in[0] <== pos_rep;
    zero_rep_check.in[1] <== neg_rep;

    component if_not_prove_zero_rep = IsZero();
    if_not_prove_zero_rep.in <== prove_zero_rep;

    component zero_rep_check_out = OR();
    zero_rep_check_out.a <== if_not_prove_zero_rep.out;
    zero_rep_check_out.b <== zero_rep_check.out;

    zero_rep_check_out.out === 1;

    /* 5. Check graffiti pre-image is valid if needed */
    component if_not_check_graffiti = IsZero();
    if_not_check_graffiti.in <== prove_graffiti;

    component graffiti_hasher = Poseidon(1);
    graffiti_hasher.inputs[0] <== graffiti_pre_image;

    component graffiti_eq = IsEqual();
    graffiti_eq.in[0] <== graffiti_hasher.out;
    graffiti_eq.in[1] <== graffiti;

    component check_graffiti = OR();
    check_graffiti.a <== if_not_check_graffiti.out;
    check_graffiti.b <== graffiti_eq.out;

    check_graffiti.out === 1;

    /* 6. Check nonce and epoch key are valid */

    nonce \ EPOCH_KEY_NONCE_PER_EPOCH === 0;

    component epoch_key_hasher = Poseidon(4);
    epoch_key_hasher.inputs[0] <== identity_secret;
    epoch_key_hasher.inputs[1] <== attester_id;
    epoch_key_hasher.inputs[2] <== epoch;
    epoch_key_hasher.inputs[3] <== nonce;

    epoch_key <== epoch_key_hasher.out;

    /* 7. Check identity nullifier and proposal index*/
    signal input identityNullifier;
    signal input proposalIndex;

    signal output externalNullifier;

    component poseidon = Poseidon(2);

    poseidon.inputs[0] <== identityNullifier;
    poseidon.inputs[1] <== proposalIndex;

    externalNullifier <== poseidon.out;
}
