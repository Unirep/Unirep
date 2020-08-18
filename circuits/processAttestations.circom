include "./hasherPoseidon.circom";
include "./verifyHashChain.circom";

template ProcessAttestations(NUM_ATTESTATIONS) {
    signal input epoch;
    signal input identity_nullifier;

    // Inputs of the atttestations
    signal input attester_ids[NUM_ATTESTATIONS];
    signal input pos_reps[NUM_ATTESTATIONS];
    signal input neg_reps[NUM_ATTESTATIONS];
    signal input graffities[NUM_ATTESTATIONS];
    signal input overwrite_graffitis[NUM_ATTESTATIONS];

    signal input selectors[NUM_ATTESTATIONS];
    signal input hash_chain_result;

    // Nullifiers of the attestations
    signal output nullifiers[NUM_ATTESTATIONS];


    component attestation_hashers[NUM_ATTESTATIONS];

    component nullifier_hashers[NUM_ATTESTATIONS];

    component hash_chain_verifier = VerifyHashChain(NUM_ATTESTATIONS);
    hash_chain_verifier.result <== hash_chain_result;

    for (var i = 0; i < NUM_ATTESTATIONS; i++) {
        // Compute hash of the attestation
        attestation_hashers[i] = Hasher5();
        attestation_hashers[i].in[0] <== attester_ids[i];
        attestation_hashers[i].in[1] <== pos_reps[i];
        attestation_hashers[i].in[2] <== neg_reps[i];
        attestation_hashers[i].in[3] <== graffities[i];
        attestation_hashers[i].in[4] <== overwrite_graffitis[i];
        hash_chain_verifier.in_rest[i] <== attestation_hashers[i].hash;
        hash_chain_verifier.selectors[i] <== selectors[i];

        // Compute nullifier of the attestation
        nullifier_hashers[i] = Hasher5();
        nullifier_hashers[i].in[0] <== identity_nullifier;
        nullifier_hashers[i].in[1] <== attester_ids[i];
        nullifier_hashers[i].in[2] <== epoch;
        nullifier_hashers[i].in[3] <== 0;
        nullifier_hashers[i].in[4] <== 0;
        nullifiers[i] <== nullifier_hashers[i].hash;
    }

    // Process attestations
    // TODO
}