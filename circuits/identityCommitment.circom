include "../node_modules/circomlib/circuits/babyjub.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

template CalculateIdentityCommitment() {

    signal input identity_pk;
    signal input identity_nullifier;
    signal input identity_trapdoor;

    signal output out;

    // identity commitment is a pedersen hash of (identity_pk, identity_nullifier, identity_trapdoor), each element padded up to 256 bits
    component identity_commitment = Poseidon(3);
    identity_commitment.inputs[0] <== identity_pk;
    identity_commitment.inputs[1] <== identity_nullifier;
    identity_commitment.inputs[2] <== identity_trapdoor;

    out <== identity_commitment.out;
}

template IdentityCommitment() {

    signal private input identity_pk[2];
    signal private input identity_nullifier;
    signal private input identity_trapdoor;

    signal output out;

    // get a prime subgroup element derived from identity_pk
    component dbl1 = BabyDbl();
    dbl1.x <== identity_pk[0];
    dbl1.y <== identity_pk[1];
    component dbl2 = BabyDbl();
    dbl2.x <== dbl1.xout;
    dbl2.y <== dbl1.yout;
    component dbl3 = BabyDbl();
    dbl3.x <== dbl2.xout;
    dbl3.y <== dbl2.yout;

    // BEGIN identity commitment
    component identity_commitment = CalculateIdentityCommitment();
    identity_commitment.identity_pk <== dbl3.xout;
    identity_commitment.identity_nullifier <== identity_nullifier;
    identity_commitment.identity_trapdoor <== identity_trapdoor;
    out <== identity_commitment.out;
    // END identity commitment
}