pragma circom 2.1.0;

include "./circomlib/circuits/poseidon.circom";
include "./epochKey.circom";
include "./identity.circom";

template PreventDoubleAction(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, FIELD_COUNT) {

    // Global state tree
    signal input state_tree_indexes[STATE_TREE_DEPTH];
    signal input state_tree_elements[STATE_TREE_DEPTH];

    // Global state tree leaf: Identity & user state root
    signal input reveal_nonce;
    signal input attester_id;
    signal input epoch;
    signal input nonce;
    signal output epoch_key;
    signal output state_tree_root;

    // Some arbitrary data to endorse
    signal input sig_data; // public input

    // Optionally reveal nonce, epoch, attester_id
    signal output control;

    signal input identity_nullifier;
    signal input external_nullifier;
    signal output nullifier;

    signal input identity_trapdoor;

    signal input data[FIELD_COUNT];

    /* 1. Compute nullifier */
    nullifier <== Poseidon(2)([identity_nullifier, external_nullifier]);

     /* 2. Compute identity commitment */
    signal identity_secret;
    (identity_secret, _) <== IdentityCommitment()(identity_nullifier, identity_trapdoor);

    /* 3. Check epoch key is valid */
    (epoch_key, state_tree_root, control) <== EpochKey(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, FIELD_COUNT)(
        state_tree_indexes,
        state_tree_elements,
        identity_secret,
        reveal_nonce,
        attester_id,
        epoch,
        nonce,
        data,
        sig_data
    );
}
