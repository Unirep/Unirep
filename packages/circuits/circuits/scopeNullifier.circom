pragma circom 2.1.0;

include "./circomlib/circuits/poseidon.circom";
include "./epochKey.circom";
include "./identity.circom";

template ScopeNullifier(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, FIELD_COUNT) {

    // Global state tree
    signal input state_tree_indeces[STATE_TREE_DEPTH];
    signal input state_tree_elements[STATE_TREE_DEPTH];
    // Global state tree leaf: Identity & user state root
    signal input reveal_nonce;
    signal input attester_id;
    signal input epoch;
    signal input nonce;
     // Some arbitrary data to endorse
    signal input sig_data; // public input
    signal input secret;
    signal input scope; // public input
    signal input data[FIELD_COUNT];
    signal input chain_id;

    signal output epoch_key;
    signal output state_tree_root;
    // Optionally reveal nonce, epoch, attester_id, chain_id
    signal output control;
    signal output nullifier;

    /* 1. Compute nullifier */
    nullifier <== Poseidon(2)([scope, secret]);

    /* 2. Check epoch key is valid */
    (epoch_key, state_tree_root, control) <== EpochKey(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, FIELD_COUNT)(
        state_tree_indeces,
        state_tree_elements,
        secret,
        reveal_nonce,
        attester_id,
        epoch,
        nonce,
        data,
        sig_data,
        chain_id
    );
}
