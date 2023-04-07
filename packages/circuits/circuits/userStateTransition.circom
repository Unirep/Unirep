pragma circom 2.0.0;

include "./circomlib/circuits/poseidon.circom";
include "./circomlib/circuits/comparators.circom";
include "./circomlib/circuits/mux1.circom";
include "./circomlib/circuits/gates.circom";
include "./incrementalMerkleTree.circom";
include "./leafHasher.circom";

template UserStateTransition(
  STATE_TREE_DEPTH,
  EPOCH_TREE_DEPTH,
  EPOCH_KEY_NONCE_PER_EPOCH,
  FIELD_COUNT,
  SUM_FIELD_COUNT
) {
    signal input from_epoch;
    signal input to_epoch;

    // State tree leaf: Identity & user state root
    signal input identity_secret;
    // State tree
    signal input state_tree_indexes[STATE_TREE_DEPTH];
    signal input state_tree_elements[STATE_TREE_DEPTH];

    signal output state_tree_root;
    signal output state_tree_leaf;

    // Attester to prove reputation from
    signal input attester_id;

    // The starting data in fromEpoch
    signal input data[FIELD_COUNT];

    // prove what we've received in fromEpoch
    signal input new_data[EPOCH_KEY_NONCE_PER_EPOCH][FIELD_COUNT];

    // A root to prove against
    signal input epoch_tree_root;

    // the inclusion proofs
    signal input epoch_tree_elements[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_DEPTH];
    signal input epoch_tree_indices[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_DEPTH];

    signal output epks[EPOCH_KEY_NONCE_PER_EPOCH];

    // to_epoch will be checked on chain
    // from_epoch is implicitly checked by the
    // state tree leaf membership proof
    component epoch_check = GreaterThan(64);
    epoch_check.in[0] <== to_epoch;
    epoch_check.in[1] <== from_epoch;
    epoch_check.out === 1;

    /* 1. Check if user exists in the Global State Tree */

    component leaf_hasher = StateTreeLeaf(FIELD_COUNT);
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
        state_merkletree.path_elements[i] <== state_tree_elements[i];
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

        leaf_hashers[i] = EpochTreeLeaf(FIELD_COUNT);
        leaf_hashers[i].epoch_key <== epoch_key_hashers[i].out;
        for (var x = 0; x < FIELD_COUNT; x++) {
          leaf_hashers[i].data[x] <== new_data[i][x];
        }
    }

    // do an inclusion proof for each epoch key

    component epoch_tree_proof[EPOCH_KEY_NONCE_PER_EPOCH];
    component epoch_tree_proof_valid[EPOCH_KEY_NONCE_PER_EPOCH];
    for (var x = 0; x < EPOCH_KEY_NONCE_PER_EPOCH; x++) {
      epoch_tree_proof[x] = MerkleTreeInclusionProof(EPOCH_TREE_DEPTH);
      epoch_tree_proof[x].leaf <== leaf_hashers[x].out;
      for (var y = 0; y < EPOCH_TREE_DEPTH; y++) {
        epoch_tree_proof[x].path_index[y] <== epoch_tree_indices[x][y];
        epoch_tree_proof[x].path_elements[y] <== epoch_tree_elements[x][y];
      }
      epoch_tree_proof_valid[x] = IsEqual();
      epoch_tree_proof_valid[x].in[0] <== epoch_tree_root;
      epoch_tree_proof_valid[x].in[1] <== epoch_tree_proof[x].root;
    }

    component epk_out_hashers[EPOCH_KEY_NONCE_PER_EPOCH];
    for (var x = 0; x < EPOCH_KEY_NONCE_PER_EPOCH; x++) {
        epk_out_hashers[x] = Poseidon(4);
        epk_out_hashers[x].inputs[0] <== identity_secret;
        epk_out_hashers[x].inputs[1] <== attester_id;
        epk_out_hashers[x].inputs[2] <== from_epoch;
        epk_out_hashers[x].inputs[3] <== epoch_tree_proof_valid[x].out * EPOCH_KEY_NONCE_PER_EPOCH + x; // nonce
        epks[x] <== epk_out_hashers[x].out;
    }

    // if an inclusion proof is not valid the newData must be 0
    component data_check[EPOCH_KEY_NONCE_PER_EPOCH][FIELD_COUNT];
    component proof_invalid[EPOCH_KEY_NONCE_PER_EPOCH];
    for (var x = 0; x < EPOCH_KEY_NONCE_PER_EPOCH; x++) {
        proof_invalid[x] = IsZero();
        proof_invalid[x].in <== epoch_tree_proof_valid[x].out;
        for (var y = 0; y < FIELD_COUNT; y++) {
            data_check[x][y] = ForceEqualIfEnabled();
            data_check[x][y].enabled <== proof_invalid[x].out;
            data_check[x][y].in[0] <== 0;
            data_check[x][y].in[1] <== new_data[x][y];
        }
    }

    /* End of check 2 */

    /* 3. Calculate the new state tree leaf */

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

    component out_leaf_hasher = StateTreeLeaf(FIELD_COUNT);
    out_leaf_hasher.identity_secret <== identity_secret;
    out_leaf_hasher.attester_id <== attester_id;
    out_leaf_hasher.epoch <== to_epoch;
    for (var x = 0; x < FIELD_COUNT; x++) {
      out_leaf_hasher.data[x] <== final_data[x];
    }
    state_tree_leaf <== out_leaf_hasher.out;

    /* End of check 3 */
}
