pragma circom 2.0.0;

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
    signal input spender_data[FIELD_COUNT];
    signal input receiver_data[FIELD_COUNT];
    // Epoch tree
    signal input attester_id;
    signal input reveal_nonce;
    signal input epoch;
    signal input nonce;
    signal input epoch_tree_root;
    signal input epoch_tree_elements[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_DEPTH];
    signal input epoch_tree_indices[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_DEPTH];
    signal output updated_epoch_tree_root;

    // Reputation
    signal input spend_amount;

    /* 1 if spender has enough reputation that he want to spend */

    // range check
    _ <== Num2Bits(64)(data[0]);
    _ <== Num2Bits(64)(data[1]);

    signal reputation_amount_check <== GreaterEqThan(66)([data[0], data[1] + spend_amount]);
    reputation_amount_check === 1;

    /* End of check 1 */


    // range check
    _ <== Num2Bits(48)(epoch);
    _ <== Num2Bits(160)(attester_id);

    /* 2. spender and receiver epoch keys contain  data in the epoch tree */ 

    spender_epoch_key_hasher<== EpochKeyHasher()(
        spender_identity_secret,
        attester_id,
        epoch,
        nonce
    )

    receiver_epoch_key_hasher<== EpochKeyHasher()(
        receiver_identity_secret,
        attester_id,
        epoch,
        nonce
    )

    // range check 
    _ <== Num2Bits(64)(sender_data[0]);
    _ <== Num2Bits(64)(receiver_data[0]);

    spender_leaf_hasher <== EpochTreeLeaf(FIELD_COUNT)(spender_epoch_key_hasher, spender_data[0]);
    receiver_leaf_hasher <== EpochTreeLeaf(FIELD_COUNT)(receiver_epoch_key_hasher, receiver_data[0]);


    spender_epoch_tree_proof <== MerkleTreeInclusionProof(EPOCH_TREE_DEPTH)(
        spender_leaf_hasher,
        epoch_tree_indices,
        epoch_tree_elements
    );

    receiver_epoch_tree_proof <== MerkleTreeInclusionProof(EPOCH_TREE_DEPTH)(
        receiver_leaf_hasher,
        epoch_tree_indices,
        epoch_tree_elements
    );

    spender_epoch_tree_root_valid <== IsEqual()([epoch_tree_root, spender_epoch_tree_proof]);
    receiver_epoch_tree_root_valid <== IsEqual()([epoch_tree_root, receiver_epoch_tree_proof]);
    
    // check each epock keys have own data
    if (spender_epoch_tree_root_valid && receiver_epoch_tree_root_valid) { 
        new_spender_leaf_hasher <== EpochTreeLeaf(FIELD_COUNT)(spender_epoch_key_hashers, spender_data[0] - spend_amount);
        new_receiver_leaf_hasher <== EpochTreeLeaf(FIELD_COUNT)(receiver_epoch_key_hashers, receiver_data[0] + spend_amount);
    }
    else {
        // insert a new leaf in the epoch tree
        new_spender_leaf_hasher <== EpochTreeLeaf(FIELD_COUNT)(spender_epoch_key_hashers, spender_data[0]);
        new_receiver_leaf_hasher <== EpochTreeLeaf(FIELD_COUNT)(receiver_epoch_key_hashers, receiver_data[0]);
        
        MerkleTreeInclusionProof(EPOCH_TREE_DEPTH)(
        new_spender_leaf_hasher,
        epoch_tree_indices,
        epoch_tree_elements
        );

        MerkleTreeInclusionProof(EPOCH_TREE_DEPTH)(
        new_receiver_leaf_hasher,
        epoch_tree_indices,
        epoch_tree_elements
        );
        
        new_spender_leaf_hasher <== EpochTreeLeaf(FIELD_COUNT)(spender_epoch_key_hashers, spender_data[0] - spend_amount);
        new_receiver_leaf_hasher <== EpochTreeLeaf(FIELD_COUNT)(receiver_epoch_key_hashers, receiver_data[0] + spend_amount);

    }
    /* End of check 2 */

    /* 3 output a updated_epoch_tree_root */

    MerkleTreeInclusionProof(EPOCH_TREE_DEPTH)(
        new_spender_leaf_hasher,
        epoch_tree_indices,
        epoch_tree_elements
    );

    updated_epoch_tree_root <== MerkleTreeInclusionProof(EPOCH_TREE_DEPTH)(
        new_receiver_leaf_hasher,
        epoch_tree_indices,
        epoch_tree_elements
    );

    /* End of check 3 */

}
