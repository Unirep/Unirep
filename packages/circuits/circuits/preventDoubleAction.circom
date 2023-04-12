pragma circom 2.0.0;

include "./circomlib/circuits/poseidon.circom";
include "./circomlib/circuits/bitify.circom";
include "./incrementalMerkleTree.circom";
include "./epochKeyLite.circom";
include "./leafHasher.circom";
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
    signal output identity_commitment;

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
    identity_commitment <== commitment.out;

    /* 3. Check if user exists in the Global State Tree*/
    // Compute user state tree root
    component leaf_hasher = StateTreeLeaf(FIELD_COUNT);
    leaf_hasher.identity_secret <== commitment.secret;
    leaf_hasher.attester_id <== attester_id;
    leaf_hasher.epoch <== epoch;
    for (var x = 0; x < FIELD_COUNT; x++) {
      leaf_hasher.data[x] <== data[x];
    }

    component merkletree = MerkleTreeInclusionProof(STATE_TREE_DEPTH);
    merkletree.leaf <== leaf_hasher.out;
    for (var i = 0; i < STATE_TREE_DEPTH; i++) {
        merkletree.path_index[i] <== state_tree_indexes[i];
        merkletree.path_elements[i] <== state_tree_elements[i];
    }
    state_tree_root <== merkletree.root;

    /* 4. Check epoch key is valid */
    component epoch_key_lite = EpochKeyLite(EPOCH_KEY_NONCE_PER_EPOCH);
    epoch_key_lite.identity_secret <== commitment.secret;
    epoch_key_lite.reveal_nonce <== reveal_nonce;
    epoch_key_lite.attester_id <== attester_id;
    epoch_key_lite.epoch <== epoch;
    epoch_key_lite.nonce <== nonce;
    epoch_key_lite.sig_data <== sig_data;
    control <== epoch_key_lite.control;
    epoch_key <== epoch_key_lite.epoch_key;
}