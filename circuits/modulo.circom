include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/sign.circom";

template ModuloTreeDepth(TREE_DEPTH) {
    signal input dividend;
    signal output remainder;

    signal divisor <-- 2 ** TREE_DEPTH;
    signal quotient;

    // circom's best practices state that we should avoid using <-- unless
    // we know what we are doing. But this is the only way to perform the
    // modulo operation.
    quotient <-- dividend \ divisor;
    remainder <-- dividend % divisor;

    component remainder_lt;
    // Range check on remainder
    remainder_lt = LessEqThan(TREE_DEPTH);
    remainder_lt.in[0] <== remainder;
    remainder_lt.in[1] <== 2 ** TREE_DEPTH - 1;
    remainder_lt.out === 1;

    // Range check on quotient
    component quotient_lt;
    quotient_lt = LessEqThan(254 - TREE_DEPTH);
    quotient_lt.in[0] <== quotient;
    quotient_lt.in[1] <== 2 ** (254 - TREE_DEPTH) - 1;
    quotient_lt.out === 1;

    // Check equality
    dividend === divisor * quotient + remainder;

}