/*
    Verify if epoch key is computed correctly
    epoch_key = hash5(id_nullifier, epoch, nonce);
*/

include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "./identityCommitment.circom";
include "./incrementalMerkleTree.circom";

template VerifyEpochKey(GST_tree_depth, epoch_tree_depth, EPOCH_KEY_NONCE_PER_EPOCH) {
    // Global state tree
    signal private input GST_path_index[GST_tree_depth];
    signal private input GST_path_elements[GST_tree_depth];
    // Global state tree leaf: Identity & user state root
    signal private input identity_nullifier;
    signal private input identity_trapdoor;
    signal private input user_tree_root;

    signal private input nonce;
    signal input epoch;
    signal output epoch_key;
    signal output GST_root;

    /* 1. Check if user exists in the Global State Tree */

    component identity_commitment = IdentityCommitment();
    identity_commitment.identity_nullifier <== identity_nullifier;
    identity_commitment.identity_trapdoor <== identity_trapdoor;

    // Compute user state tree root
    component leaf_hasher = Poseidon(2);
    leaf_hasher.inputs[0] <== identity_commitment.out;
    leaf_hasher.inputs[1] <== user_tree_root;

    component merkletree = MerkleTreeInclusionProof(GST_tree_depth);
    merkletree.leaf <== leaf_hasher.out;
    for (var i = 0; i < GST_tree_depth; i++) {
        merkletree.path_index[i] <== GST_path_index[i];
        merkletree.path_elements[i] <== GST_path_elements[i];
    }
    GST_root <== merkletree.root;
    /* End of check 1 */

    /* 2. Check nonce validity */
    var bitsPerNonce = 8;

    component nonce_lt = LessThan(bitsPerNonce);
    nonce_lt.in[0] <== nonce;
    nonce_lt.in[1] <== EPOCH_KEY_NONCE_PER_EPOCH;
    nonce_lt.out === 1;
    /* End of check 2*/

    /* 3. Check epoch key is computed correctly */
    // 3.1.1 Compute epoch key
    component epochKeyHasher = Poseidon(5);
    epochKeyHasher.inputs[0] <== identity_nullifier;
    epochKeyHasher.inputs[1] <== epoch;
    epochKeyHasher.inputs[2] <== nonce;
    epochKeyHasher.inputs[3] <== 0;
    epochKeyHasher.inputs[4] <== 0;

    // signal quotient;
    // 3.1.2 Mod epoch key
    // circom's best practices state that we should avoid using <-- unless
    // we know what we are doing. But this is the only way to perform the
    // modulo operation.

    // We should be safe here because we're not handling raw input signals but
    // rather outputs from the Poseidon hash function and compile time constants
    epoch_key <-- epochKeyHasher.out % (2 ** epoch_tree_depth);
}
