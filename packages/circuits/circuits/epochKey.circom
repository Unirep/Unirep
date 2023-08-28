pragma circom 2.0.0;

/*
    Verify that an epoch key exists in a state tree
*/

include "./incrementalMerkleTree.circom";
include "./epochKeyLite.circom";
include "./hasher.circom";

template EpochKey(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, FIELD_COUNT) {
    // Global state tree
    signal input state_tree_indexes[STATE_TREE_DEPTH];
    signal input state_tree_elements[STATE_TREE_DEPTH];
    // Global state tree leaf: Identity & user state root
    signal input identity_secret;

    signal output epoch_key;
    signal output state_tree_root;

    signal input reveal_nonce;
    signal input attester_id;
    signal input epoch;
    signal input nonce;

    signal input data[FIELD_COUNT];

    // Some arbitrary data to endorse
    signal input sig_data;

    /**
     * Optionally reveal nonce, epoch, attester_id
     **/
    signal output control;

    /* 1. Check if user exists in the Global State Tree */

    // Compute user state tree root
    signal leaf <== StateTreeLeaf(FIELD_COUNT)(
        data,
        identity_secret,
        attester_id,
        epoch
    );

    state_tree_root <== MerkleTreeInclusionProof(STATE_TREE_DEPTH)(
        leaf,
        state_tree_indexes,
        state_tree_elements,
    );

    /* End of check 1 */

    /* 2. Check epoch key validity */

    (control, epoch_key) <== EpochKeyLite(EPOCH_KEY_NONCE_PER_EPOCH)(
        identity_secret,
        reveal_nonce,
        attester_id,
        epoch,
        nonce,
        sig_data
    );
    
    /* End of check 2*/
}
