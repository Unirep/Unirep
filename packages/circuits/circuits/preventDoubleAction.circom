pragma circom 2.0.0;

include "./circomlib/circuits/poseidon.circom";
include "./circomlib/circuits/bitify.circom";
include "./incrementalMerkleTree.circom";
include "./epochKeyLite.circom";
include "./leafHasher.circom";
include "./identity.circom";

template PreventDoubleAction(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, FIELD_COUNT, EPK_R) {

    // Global state tree
    signal input state_tree_indexes[STATE_TREE_DEPTH];
    signal input state_tree_elements[STATE_TREE_DEPTH];

    // Global state tree leaf: Identity & user state root
    signal input identity_secret;
    signal input reveal_nonce;
    signal input attester_id;
    signal input epoch;
    signal input nonce;

    signal input data[FIELD_COUNT];

    // Some arbitrary data to endorse
    signal input sig_data;

    signal output epoch_key;
    signal output state_tree_root;

    // Optionally reveal nonce, epoch, attester_id
    signal output control;

    signal input identity_nullifier;
    signal input external_nullifier;
    signal output nullifier;

    signal input trapdoor;
    signal output identity_commitment;

    /* 1. Check if user exists in the Global State Tree*/
    // Compute user state tree root
    component leaf_hasher = StateTreeLeaf(FIELD_COUNT, EPK_R);
    leaf_hasher.identity_secret <== identity_secret;
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

    /* 2. Check nonce and epoch key are valid */
    component epoch_key_lite = EpochKeyLite(EPOCH_KEY_NONCE_PER_EPOCH);
    epoch_key_lite.identity_secret <== identity_secret;
    epoch_key_lite.reveal_nonce <== reveal_nonce;
    epoch_key_lite.attester_id <== attester_id;
    epoch_key_lite.epoch <== epoch;
    epoch_key_lite.nonce <== nonce;
    epoch_key_lite.sig_data <== sig_data;
    control <== epoch_key_lite.control;
    epoch_key <== epoch_key_lite.epoch_key;

    /* 3. Check nullifier's validity */
    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== identity_nullifier;
    poseidon.inputs[1] <== external_nullifier;
    nullifier <== poseidon.out;

     /* 4. Check identity commitment's validity */
    component commitment = IdentityCommitment();
    commitment.nullifier <== nullifier;
    commitment.trapdoor <== trapdoor;
    identity_commitment <== commitment.out;
}