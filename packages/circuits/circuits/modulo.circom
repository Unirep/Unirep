include "./circomlib/circuits/comparators.circom";

template Modulo() {
    signal input divisor;
    signal input dividend;
    signal output remainder;

    signal output quotient;

    // circom's best practices state that we should avoid using <-- unless
    // we know what we are doing. But this is the only way to perform the
    // modulo operation.
    quotient <-- dividend \ divisor;
    remainder <-- dividend % divisor;

    component remainder_lt;
    // Range check on remainder
    remainder_lt = LessThan(252);
    remainder_lt.in[0] <== remainder;
    remainder_lt.in[1] <== divisor;
    remainder_lt.out === 1;

    // Check equality
    dividend === divisor * quotient + remainder;
}
