pragma circom 2.0.0;
/**
 * Take some epoch key balances and commit them to a SMT
 * Output a hashchain and update the epoch tree root.
 **/

include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/mux1.circom";
include "./updateSparseTree.circom";

template AggregateEpochKeys(EPOCH_TREE_DEPTH, KEY_COUNT) {

    signal input start_root;
    signal input epoch;
    signal input attester_id;
    signal input hashchain_index;

    signal input path_elements[KEY_COUNT][EPOCH_TREE_DEPTH];
    signal input epoch_keys[KEY_COUNT];
    signal input epoch_key_balances[KEY_COUNT][2];
    signal input old_epoch_key_hashes[KEY_COUNT];

    signal input epoch_key_count;

    signal output to_root;
    signal output hashchain;

    // TODO: check the epoch key range

    // make sure we have a non-zero number of epoch keys to process
    // TODO: maybe check the upper bound?
    component epoch_key_count_check = IsZero();
    epoch_key_count_check.in <== epoch_key_count;
    epoch_key_count_check.out === 0;

    component sparse_tree_updaters[KEY_COUNT];
    component hashers[KEY_COUNT];
    component should_not_process[KEY_COUNT];
    component hash_selector[KEY_COUNT];

    for (var i = 0; i < KEY_COUNT; i++) {
        sparse_tree_updaters[i] = UpdateSparseTree(EPOCH_TREE_DEPTH);

        if (i == 0) {
            sparse_tree_updaters[i].from_root <== start_root;
        } else {
            sparse_tree_updaters[i].from_root <== sparse_tree_updaters[i - 1].to_root;
        }
        sparse_tree_updaters[i].leaf_index <== epoch_keys[i];
        sparse_tree_updaters[i].pos_rep <== epoch_key_balances[i][0];
        sparse_tree_updaters[i].neg_rep <== epoch_key_balances[i][1];
        sparse_tree_updaters[i].old_leaf <== old_epoch_key_hashes[i];
        for (var x = 0; x < EPOCH_TREE_DEPTH; x++) {
            sparse_tree_updaters[i].leaf_elements[x] <== path_elements[i][x];
        }

        // only process the inputs < epoch_key_count
        should_not_process[i] = GreaterEqThan(8);
        should_not_process[i].in[0] <== i;
        should_not_process[i].in[1] <== epoch_key_count;

        // if we're over the number of epoch keys we short circuit
        // and return the last root
        sparse_tree_updaters[i].should_ignore <== should_not_process[i].out;

        hashers[i] = Poseidon(4);

        if (i == 0) {
            // epoch_key_count will never be 0, so we always evaluate the first epoch key
            hashers[i].inputs[0] <== 0;
            hashers[i].inputs[1] <== epoch_keys[i];
            hashers[i].inputs[2] <== epoch_key_balances[i][0];
            hashers[i].inputs[3] <== epoch_key_balances[i][1];
        } else {
            hash_selector[i] = MultiMux1(4);

            hash_selector[i].c[0][0] <== hashers[i - 1].out;
            hash_selector[i].c[0][1] <== hashers[i-1].inputs[0];

            hash_selector[i].c[1][0] <== epoch_keys[i];
            hash_selector[i].c[1][1] <== hashers[i-1].inputs[1];

            hash_selector[i].c[2][0] <== epoch_key_balances[i][0];
            hash_selector[i].c[2][1] <== hashers[i-1].inputs[2];

            hash_selector[i].c[3][0] <== epoch_key_balances[i][1];
            hash_selector[i].c[3][1] <== hashers[i-1].inputs[3];

            hash_selector[i].s <== should_not_process[i].out;

            hashers[i].inputs[0] <== hash_selector[i].out[0];
            hashers[i].inputs[1] <== hash_selector[i].out[1];
            hashers[i].inputs[2] <== hash_selector[i].out[2];
            hashers[i].inputs[3] <== hash_selector[i].out[3];
        }
    }

    to_root <== sparse_tree_updaters[KEY_COUNT - 1].to_root;
    hashchain <== hashers[KEY_COUNT - 1].out;
}
