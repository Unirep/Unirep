pragma circom 2.0.0;

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
    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== identity_nullifier;
    poseidon.inputs[1] <== external_nullifier;
    nullifier <== poseidon.out;

     /* 2. Compute identity commitment */
    component commitment = IdentityCommitment();
    commitment.nullifier <== identity_nullifier;
    commitment.trapdoor <== identity_trapdoor;

    /* 3. Check epoch key is valid */
    component epoch_key_proof = EpochKey(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, FIELD_COUNT);
    for (var i = 0; i < STATE_TREE_DEPTH; i++) {
        epoch_key_proof.state_tree_indexes[i] <== state_tree_indexes[i];
        epoch_key_proof.state_tree_elements[i] <== state_tree_elements[i];
    }
    for (var x = 0; x < FIELD_COUNT; x++) {
        epoch_key_proof.data[x] <== data[x];
    }
    epoch_key_proof.identity_secret <== commitment.secret;
    epoch_key_proof.reveal_nonce <== reveal_nonce;
    epoch_key_proof.attester_id <== attester_id;
    epoch_key_proof.epoch <== epoch;
    epoch_key_proof.nonce <== nonce;
    epoch_key_proof.sig_data <== sig_data;
    control <== epoch_key_proof.control;
    epoch_key <== epoch_key_proof.epoch_key;
    state_tree_root <== epoch_key_proof.state_tree_root;
}
