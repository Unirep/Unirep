include "../node_modules/circomlib/circuits/comparators.circom";
include "./hasherPoseidon.circom";
include "./verifyHashChain.circom";

template ProcessAttestations(nullifier_tree_depth, NUM_ATTESTATIONS) {
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

    signal quotient[NUM_ATTESTATIONS];
    component quot_lt[NUM_ATTESTATIONS];
    signal nullifierHashModed[NUM_ATTESTATIONS];
    component nul_lt[NUM_ATTESTATIONS];

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

        // Mod nullifier hash
        // circom's best practices state that we should avoid using <-- unless
        // we know what we are doing. But this is the only way to perform the
        // modulo operation.
        quotient[i] <-- nullifier_hashers[i].hash \ (2 ** nullifier_tree_depth);
        nullifierHashModed[i] <-- nullifier_hashers[i].hash % (2 ** nullifier_tree_depth);
        // Range check on nullifier
        nul_lt[i] = LessEqThan(nullifier_tree_depth);
        nul_lt[i].in[0] <== nullifierHashModed[i];
        nul_lt[i].in[1] <== 2 ** nullifier_tree_depth - 1;
        nul_lt[i].out === 1;
        // Range check on quotient[i]
        quot_lt[i] = LessEqThan(254 - nullifier_tree_depth);
        quot_lt[i].in[0] <== quotient[i];
        quot_lt[i].in[1] <== 2 ** (254 - nullifier_tree_depth) - 1;
        quot_lt[i].out === 1;
        // Check equality
        nullifier_hashers[i].hash === quotient[i] * (2 ** nullifier_tree_depth) + nullifierHashModed[i];
        nullifiers[i] <== nullifierHashModed[i];
    }

    // Process attestations
    // TODO
}