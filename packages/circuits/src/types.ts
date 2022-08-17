export type UBigInt = bigint | BigInt | string | number

export interface VerifyEpochKeyInput {
    GST_path_index: UBigInt[]
    GST_path_elements: UBigInt[]
    // Global state tree leaf: Identity & user state root
    identity_nullifier: UBigInt
    identity_trapdoor: UBigInt
    user_tree_root: UBigInt
    nonce: UBigInt
    epoch: UBigInt
}

export interface ProveReputationInput {
    epoch: UBigInt
    epoch_key_nonce: UBigInt

    // Global state tree leaf: Identity & user state root
    identity_nullifier: UBigInt
    identity_trapdoor: UBigInt
    user_tree_root: UBigInt
    // Global state tree
    GST_path_index: UBigInt[]
    GST_path_elements: UBigInt[]
    // Attester to prove reputation from
    attester_id: UBigInt
    // Attestation by the attester
    pos_rep: UBigInt
    neg_rep: UBigInt
    graffiti: UBigInt
    sign_up: UBigInt
    UST_path_elements: UBigInt[]
    // Reputation nullifier
    rep_nullifiers_amount: UBigInt
    start_rep_nonce: UBigInt
    // Prove the minimum reputation
    min_rep: UBigInt
    // Graffiti
    prove_graffiti: UBigInt
    graffiti_pre_image: UBigInt
}

export interface ProveUserSignUpInput {
    epoch: UBigInt
    identity_nullifier: UBigInt
    identity_trapdoor: UBigInt
    user_tree_root: UBigInt
    GST_path_index: UBigInt[]
    GST_path_elements: UBigInt[]
    attester_id: UBigInt
    pos_rep: UBigInt
    neg_rep: UBigInt
    graffiti: UBigInt
    sign_up: UBigInt
    UST_path_elements: UBigInt[]
}

export interface StartTransitionInput {
    epoch: UBigInt
    nonce: UBigInt

    // User state tree
    user_tree_root: UBigInt

    // Global state tree leaf: Identity & user state root
    identity_nullifier: UBigInt
    identity_trapdoor: UBigInt

    // Global state tree
    GST_path_elements: UBigInt[]
    GST_path_index: UBigInt[]
}

export interface ProcessAttestationsInput {
    epoch: UBigInt
    from_nonce: UBigInt
    to_nonce: UBigInt
    identity_nullifier: UBigInt

    intermediate_user_state_tree_roots: UBigInt[]
    // Inputs of old reputation records
    old_pos_reps: UBigInt[]
    old_neg_reps: UBigInt[]
    old_graffities: UBigInt[]
    old_sign_ups: UBigInt[]
    path_elements: UBigInt[][]

    // Inputs of the atttestations
    attester_ids: UBigInt[]
    pos_reps: UBigInt[]
    neg_reps: UBigInt[]
    graffities: UBigInt[]
    overwrite_graffities: UBigInt[]
    sign_ups: UBigInt[]

    // Selector is used to determined if the attestation should be processed
    selectors: UBigInt[]

    // Inputs of blinded user state and hash chain result that the circuit starts from
    hash_chain_starter: UBigInt
    input_blinded_user_state: UBigInt
}

export interface UserStateTransitionInput {
    epoch: UBigInt
    blinded_user_state: UBigInt[]
    intermediate_user_state_tree_roots: UBigInt[]
    start_epoch_key_nonce: UBigInt
    end_epoch_key_nonce: UBigInt

    // Global state tree leaf: Identity & user state root
    identity_nullifier: UBigInt
    identity_trapdoor: UBigInt

    // Global state tree
    GST_path_elements: UBigInt[]
    GST_path_index: UBigInt[]

    // Epoch key & epoch tree
    epk_path_elements: UBigInt[][]
    hash_chain_results: UBigInt[]
    blinded_hash_chain_results: UBigInt[]
    epoch_tree_root: UBigInt
}

export interface IncrementalMerkleTreeInput {
    leaf: UBigInt
    path_elements: UBigInt[]
    path_index: UBigInt[]
}

export interface IdentityCommitmentInput {
    identity_nullifier: UBigInt
    identity_trapdoor: UBigInt
}

export interface SparseMerkleTreeInput {
    leaf: UBigInt
    leaf_index: UBigInt
    path_elements: UBigInt[]
}

export interface ExistedEpochKeyInput {
    identity_nullifier: UBigInt
    epoch: UBigInt
    nonce: UBigInt
    hash_chain_result: UBigInt
    epoch_tree_root: UBigInt
    path_elements: UBigInt[]
}

export interface VerifyHashChainInput {
    hashes: UBigInt[]
    // Selector is used to determined if the hash should be included in the hash chain
    selectors: UBigInt[]
    result: UBigInt
}
export type CircuitInput =
    | VerifyEpochKeyInput
    | ProveReputationInput
    | ProveUserSignUpInput
    | StartTransitionInput
    | ProcessAttestationsInput
    | UserStateTransitionInput
    | IncrementalMerkleTreeInput
    | IdentityCommitmentInput
    | SparseMerkleTreeInput
    | ExistedEpochKeyInput
    | VerifyHashChainInput
