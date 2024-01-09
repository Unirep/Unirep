pragma circom 2.1.0;

/*
    Prove:
        1. if spender has enough reputation that he want to spend
        2. spender and receiver epoch keys contain  data in the epoch tree
        3. output a updated_epoch_tree_root
*/

include "./circomlib/circuits/comparators.circom";
include "./circomlib/circuits/gates.circom";
include "./incrementalMerkleTree.circom";
include "./hasher.circom";


template SpendReputation(EPOCH_KEY_NONCE_PER_EPOCH, EPOCH_TREE_DEPTH, SUM_FIELD_COUNT, FIELD_COUNT) {
    assert(SUM_FIELD_COUNT < FIELD_COUNT);

    // Global state tree leaf: Identity & user state root
    signal input spender_identity_secret;
    signal input receiver_identity_secret;

    // Attestation by the attester
    signal input spender_data[EPOCH_KEY_NONCE_PER_EPOCH][FIELD_COUNT];
    signal input receiver_data[EPOCH_KEY_NONCE_PER_EPOCH][FIELD_COUNT];
    // Epoch tree
    signal input attester_id;
    signal input reveal_nonce;
    signal input epoch;
    signal input nonce;
    signal input chain_id;
    signal input epoch_tree_root;
    signal input epoch_tree_elements[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_DEPTH];
    signal input epoch_tree_indices[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_DEPTH];
    signal input spend_amount[EPOCH_KEY_NONCE_PER_EPOCH][FIELD_COUNT];
    signal output updated_epoch_tree_root;
    signal output control;
    signal spender_epoch_key_hasher;
    signal receiver_epoch_key_hasher;
    signal spender_leaf_hasher;
    signal receiver_leaf_hasher;
    signal spender_epoch_tree_proof;
    signal receiver_epoch_tree_proof;
    signal epoch_tree_root_valid;
    signal new_spender_leaf_hasher;
    signal new_receiver_leaf_hasher;
    // control[0]
    /**
     * Control structure
     * 8 bits nonce
     * 48 bits epoch
     * 160 bits attester id
     * 1 bit reveal nonce
     * 36 bit chain id
     **/
    var NONCE_BITS = 8;
    var EPOCH_BITS = 48;
    var ATTESTER_ID_BITS = 160;
    var REVEAL_NONCE_BITS = 1;
    var CHAIN_ID_BITS = 36;

    // Reputation

    /* 1 if spender has enough reputation that he want to spend */

    // range check
    _ <== Num2Bits(256)(spender_data[0][0]);
    _ <== Num2Bits(256)(spender_data[0][1]);

    /* End of check 1 */

    // range check
    _ <== Num2Bits(48)(epoch);
    _ <== Num2Bits(160)(attester_id);

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

    /* 2. spender and receiver epoch keys contain  data in the epoch tree */ 

    spender_epoch_key_hasher <== EpochKeyHasher()(
        spender_identity_secret,
        attester_id,
        epoch,
        nonce,
        chain_id
    );

    receiver_epoch_key_hasher <== EpochKeyHasher()(
        receiver_identity_secret,
        attester_id,
        epoch,
        nonce,
        chain_id
    );

    // range check 
    _ <== Num2Bits(256)(receiver_data[0][0]);

    spender_leaf_hasher <== EpochTreeLeaf(FIELD_COUNT)(spender_epoch_key_hasher, spender_data[0]);
    receiver_leaf_hasher <== EpochTreeLeaf(FIELD_COUNT)(receiver_epoch_key_hasher, receiver_data[0]);


    spender_epoch_tree_proof <== MerkleTreeInclusionProof(EPOCH_TREE_DEPTH)(
        spender_leaf_hasher,
        epoch_tree_indices[0],
        epoch_tree_elements[0]
    );

    receiver_epoch_tree_proof <== MerkleTreeInclusionProof(EPOCH_TREE_DEPTH)(
        receiver_leaf_hasher,
        epoch_tree_indices[0],
        epoch_tree_elements[0]
    );

    // check  epock key have own data
    epoch_tree_root_valid <== IsEqual()([epoch_tree_root, spender_epoch_tree_proof]);
    
    epoch_tree_root_valid === 1;
    /* End of check 2 */

    /* 3 output a updated_epoch_tree_root */
    signal new_receiver_data[EPOCH_KEY_NONCE_PER_EPOCH][FIELD_COUNT];
    signal new_spender_data[EPOCH_KEY_NONCE_PER_EPOCH][FIELD_COUNT];
    for (var i = 0; i < FIELD_COUNT; i++) {
        new_receiver_data[0][i] <== receiver_data[0][i] + spend_amount[0][i];
        new_spender_data[0][i] <== spender_data[0][i] - spend_amount[0][i];

    }
    new_spender_leaf_hasher <== EpochTreeLeaf(FIELD_COUNT)(spender_epoch_key_hasher, new_spender_data[0]);
    new_receiver_leaf_hasher <== EpochTreeLeaf(FIELD_COUNT)(receiver_epoch_key_hasher, new_receiver_data[0]);

    signal new_leaf_hasher <== Poseidon(2)([new_spender_leaf_hasher, new_receiver_leaf_hasher]);

    updated_epoch_tree_root <== MerkleTreeInclusionProof(EPOCH_TREE_DEPTH)(
        new_leaf_hasher,
        epoch_tree_indices[0],
        epoch_tree_elements[0]
    );
    /* End of check 3 */

}
