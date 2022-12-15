include "./circomlib/circuits/poseidon.circom";

template CalculateSecret() {
    signal input identity_nullifier;
    signal input identity_trapdoor;

    signal output out;

    component poseidon = Poseidon(2);

    poseidon.inputs[0] <== identity_nullifier;
    poseidon.inputs[1] <== identity_trapdoor;

    out <== poseidon.out;
}

template CalculateIdentityCommitment() {
    signal input secret;

    signal output out;

    component poseidon = Poseidon(1);

    poseidon.inputs[0] <== secret;

    out <== poseidon.out;
}

template IdentityCommitment() {

    signal input identity_nullifier;
    signal input identity_trapdoor;

    signal output out;

    // BEGIN secret
    component calculateSecret = CalculateSecret();
    calculateSecret.identity_nullifier <== identity_nullifier;
    calculateSecret.identity_trapdoor <== identity_trapdoor;

    signal secret;
    secret <== calculateSecret.out;
    // END identity commitment

    // BEGIN identity commitment
    component calculateIdentityCommitment = CalculateIdentityCommitment();
    calculateIdentityCommitment.secret <== secret;
    out <== calculateIdentityCommitment.out;
    // END identity commitment
}
