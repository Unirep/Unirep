export type UBigInt = bigint | BigInt | string | number

export interface VerifyEpochKeyInput {
    GST_path_index: UBigInt[]
    GST_path_elements: UBigInt[]
    // Global state tree leaf: Identity & user state root
    identity_nullifier: UBigInt
    identity_trapdoor: UBigInt
    user_tree_root: BigInt | UBigInt
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

export type CircuitInput = VerifyEpochKeyInput | ProveReputationInput | any
