include "./circomlib/circuits/comparators.circom";
include "./circomlib/circuits/bitify.circom";
include "./circomlib/circuits/mux1.circom";
include "./modulo.circom";

//~~ Copy of template with assert(n <= 252) removed
//~~ support comparisons of numbers up to the field size

template BigLessThan() {
    // take the number mod 252
    // check the quotient and mod

    signal input in[2];
    signal output out;

    component mod[2];

    for (var x = 0; x < 2; x++) {
        mod[x] = Modulo();
        mod[x].divisor <== 2**252;
        mod[x].dividend <== in[x];
    }

    // check that
    // mod[0].quotient < mod[1].quotient && mod[0].remainder < mod[1].remainder

    // the max quotient is 4 = SNARK_SCALAR_FIELD / 2**252
    // so use 2 bits
    component quotient_lt = LessThan(2);
    quotient_lt.in[0] <== mod[0].quotient;
    quotient_lt.in[1] <== mod[1].quotient;

    component quotient_gt = GreaterThan(2);
    quotient_gt.in[0] <== mod[0].quotient;
    quotient_gt.in[1] <== mod[1].quotient;

    component quotient_gt_zero = IsZero();
    quotient_gt_zero.in <== quotient_gt.out;

    component remainder_lt = LessThan(252);
    remainder_lt.in[0] <== mod[0].remainder;
    remainder_lt.in[1] <== mod[1].remainder;

    component mux = Mux1();
    mux.s <== quotient_lt.out;

    mux.c[0] <== remainder_lt.out;
    mux.c[1] <== 1;

    out <== mux.out * quotient_gt_zero.out;
}

template BigGreaterThan() {
    signal input in[2];
    signal output out;

    component lt = BigLessThan();

    lt.in[0] <== in[1];
    lt.in[1] <== in[0];
    lt.out ==> out;
}
