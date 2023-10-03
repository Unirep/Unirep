pragma circom 2.1.0;

include "./circomlib/circuits/poseidon.circom";
include "./circomlib/circuits/comparators.circom";
include "./circomlib/circuits/mux1.circom";
include "./incrementalMerkleTree.circom";
include "./hasher.circom";
include "./bigComparators.circom";


template UserStateTransition(
  STATE_TREE_DEPTH,
  EPOCH_TREE_DEPTH,
  HISTORY_TREE_DEPTH,
  EPOCH_KEY_NONCE_PER_EPOCH,
  FIELD_COUNT,
  SUM_FIELD_COUNT,
  REPL_NONCE_BITS
) {
    var NONCE_BITS = 8;
    assert(EPOCH_KEY_NONCE_PER_EPOCH < 2**NONCE_BITS);
    assert(SUM_FIELD_COUNT < FIELD_COUNT);

    signal input from_epoch;
    signal input to_epoch;
    // State tree leaf: Identity & user state root
    signal input identity_secret;
    // State tree
    signal input state_tree_indices[STATE_TREE_DEPTH];
    signal input state_tree_elements[STATE_TREE_DEPTH];
    // History tree
    signal input history_tree_indices[HISTORY_TREE_DEPTH];
    signal input history_tree_elements[HISTORY_TREE_DEPTH];
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
    signal input chain_id;

    signal output history_tree_root;
    signal output state_tree_leaf;
    signal output epks[EPOCH_KEY_NONCE_PER_EPOCH];
    signal output control;

    var ATTESTER_ID_BITS = 160;
    var EPOCH_BITS = 48;
    var CHAIN_ID_BITS = 36;

    _ <== Num2Bits(EPOCH_BITS)(from_epoch);
    _ <== Num2Bits(EPOCH_BITS)(to_epoch);

    signal epoch_check <== GreaterThan(EPOCH_BITS)([to_epoch, from_epoch]);
    epoch_check === 1;

    // range check
    _ <== Num2Bits(ATTESTER_ID_BITS)(attester_id);
    _ <== Num2Bits(CHAIN_ID_BITS)(chain_id);


    /* 1. Check if user exists in the Global State Tree */

    signal leaf_hasher;
    (leaf_hasher, _, _) <== StateTreeLeaf(FIELD_COUNT)(
        data,
        identity_secret,
        attester_id,
        from_epoch,
        chain_id
    );

    signal state_merkletree_root <== MerkleTreeInclusionProof(STATE_TREE_DEPTH)(
        leaf_hasher,
        state_tree_indices,
        state_tree_elements
    );

    signal history_leaf_hasher <== Poseidon(2)([state_merkletree_root, epoch_tree_root]);

    history_tree_root <== MerkleTreeInclusionProof(HISTORY_TREE_DEPTH)(
        history_leaf_hasher,
        history_tree_indices,
        history_tree_elements
    );

    /* End of check 1 */

    /* 2. Verify new reputation for the from epoch */

    signal epoch_key_hashers[EPOCH_KEY_NONCE_PER_EPOCH];
    signal leaf_hashers[EPOCH_KEY_NONCE_PER_EPOCH];
    for (var i = 0; i < EPOCH_KEY_NONCE_PER_EPOCH; i++) {
        epoch_key_hashers[i] <== EpochKeyHasher()(
            identity_secret,
            attester_id,
            from_epoch,
            i, // nonce
            chain_id
        );

        leaf_hashers[i] <== EpochTreeLeaf(FIELD_COUNT)(epoch_key_hashers[i], new_data[i]);
    }

    // do an inclusion proof for each epoch key

    signal epoch_tree_proof[EPOCH_KEY_NONCE_PER_EPOCH];
    signal epoch_tree_proof_valid[EPOCH_KEY_NONCE_PER_EPOCH];
    for (var x = 0; x < EPOCH_KEY_NONCE_PER_EPOCH; x++) {
      epoch_tree_proof[x] <== MerkleTreeInclusionProof(EPOCH_TREE_DEPTH)(
          leaf_hashers[x],
          epoch_tree_indices[x],
          epoch_tree_elements[x]
      );

      epoch_tree_proof_valid[x] <== IsEqual()([epoch_tree_root, epoch_tree_proof[x]]);
    }

    for (var x = 0; x < EPOCH_KEY_NONCE_PER_EPOCH; x++) {
        epks[x] <== EpochKeyHasher()(
            identity_secret,
            attester_id,
            from_epoch,
            epoch_tree_proof_valid[x] * EPOCH_KEY_NONCE_PER_EPOCH + x, // nonce
            chain_id
        );
    }

    // if an inclusion proof is not valid the newData must be 0
    signal proof_invalid[EPOCH_KEY_NONCE_PER_EPOCH];
    for (var x = 0; x < EPOCH_KEY_NONCE_PER_EPOCH; x++) {
        proof_invalid[x] <== IsZero()(epoch_tree_proof_valid[x]);
        for (var y = 0; y < FIELD_COUNT; y++) {
            ForceEqualIfEnabled()(proof_invalid[x], [0, new_data[x][y]]);
        }
    }

    /* End of check 2 */

    /* 3. Calculate the new state tree leaf */

    signal final_data[EPOCH_KEY_NONCE_PER_EPOCH][FIELD_COUNT];

    var REPL_FIELD_COUNT = FIELD_COUNT - SUM_FIELD_COUNT;

    signal index_check[EPOCH_KEY_NONCE_PER_EPOCH][REPL_FIELD_COUNT];
    signal field_select[EPOCH_KEY_NONCE_PER_EPOCH][REPL_FIELD_COUNT];

    for (var i = 0; i < EPOCH_KEY_NONCE_PER_EPOCH; i++) {
      // first combine the sum data
      for (var j = 0; j < SUM_FIELD_COUNT; j++) {
        if (i == 0) {
          final_data[i][j] <== data[j] + new_data[i][j];
        } else {
          final_data[i][j] <== final_data[i-1][j] + new_data[i][j];
        }
      }
      // then combine the replacement data
      for (var j = 0; j < REPL_FIELD_COUNT; j++) {
        var field_i = SUM_FIELD_COUNT + j;
        
        if (i == 0) {
          index_check[i][j] <== LowerGreaterThan(REPL_NONCE_BITS)([new_data[i][field_i], data[field_i]]);
        } else {
          index_check[i][j] <== LowerGreaterThan(REPL_NONCE_BITS)([new_data[i][field_i], final_data[i-1][field_i]]);
        }

        if (i == 0) {
          field_select[i][j] <== Mux1()([data[field_i], new_data[i][field_i]], index_check[i][j]);
        } else {
          field_select[i][j] <== Mux1()([final_data[i-1][field_i], new_data[i][field_i]], index_check[i][j]);
        }

        final_data[i][field_i] <== field_select[i][j];
      }
    }

    (state_tree_leaf, _, _) <== StateTreeLeaf(FIELD_COUNT)(
        final_data[EPOCH_KEY_NONCE_PER_EPOCH - 1],
        identity_secret,
        attester_id,
        to_epoch,
        chain_id
    );

    /* End of check 3 */

    /* 4. Calculate the new control */
    /**
    * 160 bits attester_id
    * 48 bits to_epoch
    */
    var acc_bits = 0;
    var acc_data = attester_id;
    acc_bits += ATTESTER_ID_BITS;

    acc_data += to_epoch * 2 ** acc_bits;
    control <== acc_data;

    /* End of check 4 */
}
