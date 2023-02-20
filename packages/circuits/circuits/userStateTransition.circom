pragma circom 2.0.0;

include "./circomlib/circuits/poseidon.circom";
include "./circomlib/circuits/comparators.circom";
include "./circomlib/circuits/mux1.circom";
include "./circomlib/circuits/gates.circom";
include "./incrementalMerkleTree.circom";
include "./modulo.circom";
include "./inclusionNoninclusion.circom";
include "./leafHasher.circom";

template UserStateTransition(
  STATE_TREE_DEPTH,
  EPOCH_TREE_DEPTH,
  EPOCH_TREE_ARITY,
  EPOCH_KEY_NONCE_PER_EPOCH,
  EPK_R,
  FIELD_COUNT,
  SUM_FIELD_COUNT
) {
    signal input from_epoch;
    signal input to_epoch;

    // Global state tree leaf: Identity & user state root
    signal input identity_secret;
    // Global state tree
    signal input state_tree_indexes[STATE_TREE_DEPTH];
    signal input state_tree_elements[STATE_TREE_DEPTH][1];
    signal output state_tree_root;
    signal output state_tree_leaf;
    // Attester to prove reputation from
    signal input attester_id;
    // Attestation by the attester
    signal input data[FIELD_COUNT];

    // prove what we've received in from epoch
    signal input new_data[EPOCH_KEY_NONCE_PER_EPOCH][FIELD_COUNT];

    // the common subtree
    signal input epoch_tree_elements[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_DEPTH - 1][EPOCH_TREE_ARITY];
    signal input epoch_tree_indices[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_DEPTH - 1];

    signal input noninclusion_leaf[EPOCH_KEY_NONCE_PER_EPOCH][2];
    signal input noninclusion_leaf_index[EPOCH_KEY_NONCE_PER_EPOCH];
    signal input noninclusion_elements[EPOCH_KEY_NONCE_PER_EPOCH][2][EPOCH_TREE_ARITY];

    // The index of the epoch tree leaf in the set of elements
    signal input inclusion_leaf_index[EPOCH_KEY_NONCE_PER_EPOCH];
    // The sibling elements for the epoch tree leaf
    signal input inclusion_elements[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_ARITY];

    signal output transition_nullifier;
    signal output epoch_tree_root;

    // only check to_epoch
    // from_epoch is implicitly checked by the
    // state tree leaf membership proof
    component to_epoch_bits = Num2Bits(254);
    to_epoch_bits.in <== to_epoch;
    for (var x = 64; x < 254; x++) {
        to_epoch_bits.out[x] === 0;
    }
    component epoch_check = GreaterThan(64);
    epoch_check.in[0] <== to_epoch;
    epoch_check.in[1] <== from_epoch;
    epoch_check.out === 1;

    /* 1. Check if user exists in the Global State Tree */

    component leaf_hasher = StateTreeLeaf(FIELD_COUNT, EPK_R);
    leaf_hasher.identity_secret <== identity_secret;
    leaf_hasher.attester_id <== attester_id;
    leaf_hasher.epoch <== from_epoch;
    for (var x = 0; x < FIELD_COUNT; x++) {
      leaf_hasher.data[x] <== data[x];
    }

    component state_merkletree = MerkleTreeInclusionProof(STATE_TREE_DEPTH);
    state_merkletree.leaf <== leaf_hasher.out;
    for (var i = 0; i < STATE_TREE_DEPTH; i++) {
        state_merkletree.path_index[i] <== state_tree_indexes[i];
        state_merkletree.path_elements[i] <== state_tree_elements[i][0];
    }
    state_tree_root <== state_merkletree.root;

    /* End of check 1 */

    /* 2. Verify new reputation for the from epoch */

    component epoch_key_hashers[EPOCH_KEY_NONCE_PER_EPOCH];
    component leaf_hashers[EPOCH_KEY_NONCE_PER_EPOCH];
    for (var i = 0; i < EPOCH_KEY_NONCE_PER_EPOCH; i++) {
        epoch_key_hashers[i] = Poseidon(4);
        epoch_key_hashers[i].inputs[0] <== identity_secret;
        epoch_key_hashers[i].inputs[1] <== attester_id;
        epoch_key_hashers[i].inputs[2] <== from_epoch;
        epoch_key_hashers[i].inputs[3] <== i; // nonce

        leaf_hashers[i] = EpochTreeLeaf(FIELD_COUNT, EPK_R);
        leaf_hashers[i].epoch_key <== epoch_key_hashers[i].out;
        for (var x = 0; x < FIELD_COUNT; x++) {
          leaf_hashers[i].data[x] <== new_data[i][x];
        }
    }

    // if the leaf balance is 0 we do a non-inclusion
    // else we do an inclusion
    component inc_noninc[EPOCH_KEY_NONCE_PER_EPOCH];
    component inc_mux[EPOCH_KEY_NONCE_PER_EPOCH];
    signal has_no_attestations[EPOCH_KEY_NONCE_PER_EPOCH];
    component zero_check[EPOCH_KEY_NONCE_PER_EPOCH][FIELD_COUNT];
    component not_check[EPOCH_KEY_NONCE_PER_EPOCH][FIELD_COUNT];
    component fin_zero_check[EPOCH_KEY_NONCE_PER_EPOCH];


    signal roots[EPOCH_KEY_NONCE_PER_EPOCH];

    var proven_inc_or_noninc = 0;

    for (var i = 0; i < EPOCH_KEY_NONCE_PER_EPOCH; i++) {
        inc_noninc[i] = ProveInclusionOrNoninclusion(EPOCH_TREE_DEPTH, EPOCH_TREE_ARITY);
        inc_noninc[i].leaf <== leaf_hashers[i].out;

        //~~ multiple levels of elements of the parent tree'

        for (var j = 0; j < EPOCH_TREE_DEPTH - 1; j++) {
            inc_noninc[i].parent_indices[j] <== epoch_tree_indices[i][j];
            for (var k = 0; k < EPOCH_TREE_ARITY; k++) {
                inc_noninc[i].parent_elements[j][k] <== epoch_tree_elements[i][j][k];
            }
        }

        inc_noninc[i].inclusion_leaf_index <== inclusion_leaf_index[i];
        inc_noninc[i].noninclusion_leaf_index <== noninclusion_leaf_index[i];
        inc_noninc[i].noninclusion_leaf[0] <== noninclusion_leaf[i][0];
        inc_noninc[i].noninclusion_leaf[1] <== noninclusion_leaf[i][1];
        for (var j = 0; j < EPOCH_TREE_ARITY; j++) {
            inc_noninc[i].inclusion_elements[j] <== inclusion_elements[i][j];
            inc_noninc[i].noninclusion_elements[0][j] <== noninclusion_elements[i][0][j];
            inc_noninc[i].noninclusion_elements[1][j] <== noninclusion_elements[i][1][j];
        }


        //~~ inc_noninc.inclusion
        //~~ inc_noninc.noninclusion

        /*~~~~

        Now check if the epoch key has attestations. If they do we expect
        inclusion === 1.

        Otherwise we expect noninclusion === 1.
        */
        var fields_nonzero = 0;
        for (var j = 0; j < FIELD_COUNT; j++) {
          zero_check[i][j] = IsZero();
          zero_check[i][j].in <== new_data[i][j];
          not_check[i][j] = NOT();
          not_check[i][j].in <== zero_check[i][j].out;
          fields_nonzero += not_check[i][j].out;
        }
        // if fields_zero is not 0 we have
        fin_zero_check[i] = IsZero();
        fin_zero_check[i].in <== fields_nonzero;

        // we have no attestation if fin_zero_check is 1
        // e.g. there are no fields with non-zero data
        has_no_attestations[i] <== fin_zero_check[i].out;

        /***~~~~~

        if (has_no_attestations) {
          require(noninclusion)
        } else {
          require(inclusion)
        }
        */

        inc_mux[i] = Mux1();

        inc_mux[i].s <== has_no_attestations[i];
        inc_mux[i].c[0] <== inc_noninc[i].inclusion;
        inc_mux[i].c[1] <== inc_noninc[i].noninclusion;

        proven_inc_or_noninc += inc_mux[i].out;

        //~~ check that all roots are equal
        roots[i] <== inc_noninc[i].root;
        roots[0] === roots[i];
    }

    component has_proven_inc_or_noninc = IsZero();
    has_proven_inc_or_noninc.in <== proven_inc_or_noninc - EPOCH_KEY_NONCE_PER_EPOCH;


    //~~ output the root, or 0 if we haven't proven membership (no attestations)
    epoch_tree_root <== has_proven_inc_or_noninc.out * roots[0];

    //~~ if root is 0 no new reputation must be supplied
    var no_attestations_sum = 0;
    for (var x = 0; x < EPOCH_KEY_NONCE_PER_EPOCH; x++) {
        no_attestations_sum += has_no_attestations[x];
    }
    component zero_rep_check = Mux1();
    zero_rep_check.s <== has_proven_inc_or_noninc.out;
    zero_rep_check.c[0] <== no_attestations_sum;
    zero_rep_check.c[1] <== EPOCH_KEY_NONCE_PER_EPOCH;
    zero_rep_check.out === EPOCH_KEY_NONCE_PER_EPOCH;

    /* End of check 2 */

    /* 3. Calculate the new gst leaf */

    var final_data[FIELD_COUNT];
    for (var x = 0; x < FIELD_COUNT; x++) {
      final_data[x] = data[x];
    }

    var REPL_FIELD_COUNT = FIELD_COUNT - SUM_FIELD_COUNT;

    component timestamp_check[EPOCH_KEY_NONCE_PER_EPOCH][REPL_FIELD_COUNT];
    component data_select[EPOCH_KEY_NONCE_PER_EPOCH][REPL_FIELD_COUNT];

    for (var i = 0; i < EPOCH_KEY_NONCE_PER_EPOCH; i++) {
      // first combine the sum data
      for (var j = 0; j < SUM_FIELD_COUNT; j++) {
        final_data[j] += new_data[i][j];
      }
      // then combine the replacement data
      for (var j = 0; j < REPL_FIELD_COUNT; j+=2) {
        timestamp_check[i][j] = GreaterThan(64);
        timestamp_check[i][j].in[0] <== new_data[i][j+SUM_FIELD_COUNT+1];
        timestamp_check[i][j].in[1] <== final_data[j+SUM_FIELD_COUNT+1];
        data_select[i][j] = MultiMux1(2);
        // timestamp selection
        data_select[i][j].c[0][0] <== final_data[j+SUM_FIELD_COUNT+1];
        data_select[i][j].c[0][1] <== new_data[i][j+SUM_FIELD_COUNT+1];
        // data selection
        data_select[i][j].c[1][0] <== final_data[j+SUM_FIELD_COUNT];
        data_select[i][j].c[1][1] <== new_data[i][j+SUM_FIELD_COUNT];
        // select based on timestamp check
        data_select[i][j].s <== timestamp_check[i][j].out;
        // replace the old final data
        final_data[j+SUM_FIELD_COUNT+1] = data_select[i][j].out[0];
        final_data[j+SUM_FIELD_COUNT] = data_select[i][j].out[1];
      }
    }

    component out_leaf_hasher = StateTreeLeaf(FIELD_COUNT, EPK_R);
    out_leaf_hasher.identity_secret <== identity_secret;
    out_leaf_hasher.attester_id <== attester_id;
    out_leaf_hasher.epoch <== to_epoch;
    for (var x = 0; x < FIELD_COUNT; x++) {
      out_leaf_hasher.data[x] <== final_data[x];
    }
    state_tree_leaf <== out_leaf_hasher.out;

    /* End of check 3 */

    /* 4. Output epoch transition nullifier */

    component nullifier_hasher = Poseidon(3);
    nullifier_hasher.inputs[0] <== attester_id;
    nullifier_hasher.inputs[1] <== from_epoch;
    nullifier_hasher.inputs[2] <== identity_secret;
    transition_nullifier <== nullifier_hasher.out;

    /* End of check 4 */
}
