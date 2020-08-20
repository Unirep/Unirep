include "./hasherPoseidon.circom";
include "./identityCommitment.circom";
include "./incrementalMerkleTree.circom";
include "./sparseMerkleTree.circom";
include "./processAttestations.circom";

template UserStateTransition(GST_tree_depth, epoch_tree_depth, NUM_ATTESTATIONS) {
    signal input epoch;
    signal input max_nonce;
    signal private input nonce;  // epoch key nonce

    // Global state tree leaf: Identity & user state root
    signal private input identity_pk[2];
    signal private input identity_nullifier;
    signal private input identity_trapdoor;
    signal private input old_user_state_root;
    // Global state tree
    signal private input GST_path_elements[GST_tree_depth];
    signal private input GST_path_index[GST_tree_depth];
    signal input GST_root;

    // Inputs of the atttestations
    signal private input attester_ids[NUM_ATTESTATIONS];
    signal private input pos_reps[NUM_ATTESTATIONS];
    signal private input neg_reps[NUM_ATTESTATIONS];
    signal private input graffities[NUM_ATTESTATIONS];
    signal private input overwrite_graffitis[NUM_ATTESTATIONS];

    // Epoch key & epoch tree
    signal private input epk_path_elements[epoch_tree_depth];
    signal private input selectors[NUM_ATTESTATIONS];
    signal private input hash_chain_result;
    signal input epoch_tree_root;

    // signal output new_user_state_root;
    // signal output completedUserStateTransition;


    /* Check if user exists in the Global State Tree */
    component identity_commitment = IdentityCommitment();
    identity_commitment.identity_pk[0] <== identity_pk[0];
    identity_commitment.identity_pk[1] <== identity_pk[1];
    identity_commitment.identity_nullifier <== identity_nullifier;
    identity_commitment.identity_trapdoor <== identity_trapdoor;

    component leaf = HashLeftRight();
    leaf.left <== identity_commitment.out;
    leaf.right <== old_user_state_root;

    component GST_leaf_exists = LeafExists(GST_tree_depth);
    GST_leaf_exists.leaf <== leaf.hash;
    for (var i = 0; i < GST_tree_depth; i++) {
        GST_leaf_exists.path_index[i] <== GST_path_index[i];
        GST_leaf_exists.path_elements[i] <== GST_path_elements[i];
    }
    GST_leaf_exists.root <== GST_root;
    /* End of check*/

    /* Process the attestations of the epoch key specified by`nonce` */
    component epochKeyHasher = Hasher5();
    epochKeyHasher.in[0] <== identity_nullifier;
    epochKeyHasher.in[1] <== epoch;
    epochKeyHasher.in[2] <== nonce;
    epochKeyHasher.in[3] <== 0;
    epochKeyHasher.in[4] <== 0;

    signal quotient;
    signal epkModed;
    // circom's best practices state that we should avoid using <-- unless
    // we know what we are doing. But this is the only way to perform the
    // modulo operation.
    quotient <-- epochKeyHasher.hash \ (2 ** epoch_tree_depth);
    epkModed <-- epochKeyHasher.hash % (2 ** epoch_tree_depth);
    // Range check on epoch key
    component epk_lt = LessEqThan(epoch_tree_depth);
    epk_lt.in[0] <== epkModed;
    epk_lt.in[1] <== 2 ** epoch_tree_depth - 1;
    epk_lt.out === 1;
    // Range check on quotient
    component quot_lt = LessEqThan(254 - epoch_tree_depth);
    quot_lt.in[0] <== quotient;
    quot_lt.in[1] <== 2 ** (254 - epoch_tree_depth) - 1;
    quot_lt.out === 1;
    // Check equality
    epochKeyHasher.hash === quotient * (2 ** epoch_tree_depth) + epkModed;

    // Check if hash chain of the epoch key exists in epoch tree
    component epk_exists = SMTLeafExists(epoch_tree_depth);
    epk_exists.leaf_index <== epkModed;
    epk_exists.leaf <== hash_chain_result;
    epk_exists.root <== epoch_tree_root;
    for (var i = 0; i < epoch_tree_depth; i++) {
        epk_exists.path_elements[i] <== epk_path_elements[i];
    }

    component process_attestations = ProcessAttestations(NUM_ATTESTATIONS);
    process_attestations.epoch <== epoch;
    process_attestations.identity_nullifier <== identity_nullifier;
    process_attestations.hash_chain_result <== hash_chain_result;
    for (var i = 0; i < NUM_ATTESTATIONS; i++) {
        process_attestations.attester_ids[i] <== attester_ids[i];
        process_attestations.pos_reps[i] <== pos_reps[i];
        process_attestations.neg_reps[i] <== neg_reps[i];
        process_attestations.graffities[i] <== graffities[i];
        process_attestations.overwrite_graffitis[i] <== overwrite_graffitis[i];
        process_attestations.selectors[i] <== selectors[i];
    }

    /* End of process*/
}