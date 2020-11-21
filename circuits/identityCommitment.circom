include "../node_modules/circomlib/circuits/babyjub.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/pedersen.circom";

template CalculateIdentityCommitment(IDENTITY_PK_SIZE_IN_BITS, NULLIFIER_TRAPDOOR_SIZE_IN_BITS) {

    signal input identity_pk_bits[IDENTITY_PK_SIZE_IN_BITS];
    signal input identity_nullifier[NULLIFIER_TRAPDOOR_SIZE_IN_BITS];
    signal input identity_trapdoor[NULLIFIER_TRAPDOOR_SIZE_IN_BITS];

    signal output out;

    // identity commitment is a pedersen hash of (identity_pk, identity_nullifier, identity_trapdoor), each element padded up to 256 bits
    component identity_commitment = Pedersen(3*256);
    for (var i = 0; i < 256; i++) {
        if (i < IDENTITY_PK_SIZE_IN_BITS) {
            identity_commitment.in[i] <== identity_pk_bits[i];
        } else {
            identity_commitment.in[i] <== 0;
        }

        if (i < NULLIFIER_TRAPDOOR_SIZE_IN_BITS) {
            identity_commitment.in[i + 256] <== identity_nullifier[i];
            identity_commitment.in[i + 2*256] <== identity_trapdoor[i];
        } else {
            identity_commitment.in[i + 256] <== 0;
            identity_commitment.in[i + 2*256] <== 0;
        }
    }

    out <== identity_commitment.out[0];
}

template IdentityCommitment() {

    signal private input identity_pk[2];
    signal private input identity_nullifier;
    signal private input identity_trapdoor;

    signal output out;

    var IDENTITY_PK_SIZE_IN_BITS = 254;
    var NULLIFIER_TRAPDOOR_SIZE_IN_BITS = 248;


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

    component identity_nullifier_bits = Num2Bits(NULLIFIER_TRAPDOOR_SIZE_IN_BITS);
    identity_nullifier_bits.in <== identity_nullifier;

    component identity_trapdoor_bits = Num2Bits(NULLIFIER_TRAPDOOR_SIZE_IN_BITS);
    identity_trapdoor_bits.in <== identity_trapdoor;

    component identity_pk_0_bits = Num2Bits_strict();
    identity_pk_0_bits.in <== dbl3.xout;

    // BEGIN identity commitment
    component identity_commitment = CalculateIdentityCommitment(IDENTITY_PK_SIZE_IN_BITS, NULLIFIER_TRAPDOOR_SIZE_IN_BITS);
    for (var i = 0; i < IDENTITY_PK_SIZE_IN_BITS; i++) {
        identity_commitment.identity_pk_bits[i] <== identity_pk_0_bits.out[i];
    }
    for (var i = 0; i < NULLIFIER_TRAPDOOR_SIZE_IN_BITS; i++) {
        identity_commitment.identity_nullifier[i] <== identity_nullifier_bits.out[i];
        identity_commitment.identity_trapdoor[i] <== identity_trapdoor_bits.out[i];
    }
    out <== identity_commitment.out;
    // END identity commitment
}