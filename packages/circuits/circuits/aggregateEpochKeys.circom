pragma circom 2.0.0;
/**
 * Take some epoch key balances and commit them to a SMT
 * Output a hashchain and update the epoch tree root.
 **/

include "../../../node_modules/circomlib/circuits/poseidon.circom";
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

    signal output to_root;
    signal output hashchain;

    // TODO: check the epoch key range

    component sparse_tree_updaters[KEY_COUNT];
    component hashers[KEY_COUNT];

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

        hashers[i] = Poseidon(4);
        if (i == 0) {
            hashers[i].inputs[0] <== 0;
        } else {
            hashers[i].inputs[0] <== hashers[i - 1].out;
        }
        hashers[i].inputs[1] <== epoch_keys[i];
        hashers[i].inputs[2] <== epoch_key_balances[i][0];
        hashers[i].inputs[3] <== epoch_key_balances[i][1];
    }

    to_root <== sparse_tree_updaters[KEY_COUNT - 1].to_root;
    hashchain <== hashers[KEY_COUNT - 1].out;
}
