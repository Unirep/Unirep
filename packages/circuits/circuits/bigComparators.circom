include "./circomlib/circuits/comparators.circom";
include "./circomlib/circuits/bitify.circom";
include "./circomlib/circuits/mux1.circom";
include "./modulo.circom";

//~~ support comparisons of numbers up to the field size

template UpperLessThan(n) {
    assert(n < 253);
    signal input in[2];
    signal output out;

    component bits[2];
    for (var x = 0; x < 2; x++) {
        bits[x] = Num2Bits(253);
        bits[x].in <== in[x];
    }

    component upper_bits[2];
    upper_bits[0] = Bits2Num(n);
    upper_bits[1] = Bits2Num(n);

    for (var x = 0; x < n; x++) {
        upper_bits[0].in[x] <== bits[0].out[x+(253-n)];
        upper_bits[1].in[x] <== bits[1].out[x+(253-n)];
    }

    component lt = LessThan(n);
    lt.in[0] <== upper_bits[0].out;
    lt.in[1] <== upper_bits[1].out;

    out <== lt.out;
}

template replFieldEqual(REPL_NONCE_BITS) {
    assert(REPL_NONCE_BITS < 253);
    signal input in[2];
    signal output out;

    component bits[2];
    var n = 253 - REPL_NONCE_BITS;
    for (var x = 0; x < 2; x++) {
        bits[x] = Num2Bits(253);
        bits[x].in <== in[x];
    }

    component repl_bits[2];
    repl_bits[0] = Bits2Num(n);
    repl_bits[1] = Bits2Num(n);

    for (var x = 0; x < n; x++) {
        repl_bits[0].in[x] <== bits[0].out[x];
        repl_bits[1].in[x] <== bits[1].out[x];
    }

    component eq = IsEqual();
    eq.in[0] <== repl_bits[0].out;
    eq.in[1] <== repl_bits[1].out;

    out <== eq.out;
}

template BigLessThan() {
    signal input in[2];
    signal output out;

    component high_lt;
    component low_lt;

    component bits[2];
    for (var x = 0; x < 2; x++) {
        bits[x] = Num2Bits_strict();
        bits[x].in <== in[x];
    }

    component high[2];
    component low[2];
    for (var x = 0; x < 2; x++) {
        high[x] = Bits2Num(127);
        low[x] = Bits2Num(127);
        for (var y = 0; y < 127; y++) {
            high[x].in[y] <== bits[x].out[y+127];
            low[x].in[y] <== bits[x].out[y];
        }
    }

    high_lt = LessThan(127);
    high_lt.in[0] <== high[0].out;
    high_lt.in[1] <== high[1].out;

    low_lt = LessThan(127);
    low_lt.in[0] <== low[0].out;
    low_lt.in[1] <== low[1].out;

    // if high[0] == high[1] then out = low_lt
    // else out = high_lt

    component is_high_eq = IsEqual();
    is_high_eq.in[0] <== high[0].out;
    is_high_eq.in[1] <== high[1].out;

    component mux = Mux1();
    mux.s <== is_high_eq.out;

    mux.c[0] <== high_lt.out;
    mux.c[1] <== low_lt.out;

    out <== mux.out;
}

template BigGreaterThan() {
    signal input in[2];
    signal output out;

    component lt = BigLessThan();

    lt.in[0] <== in[1];
    lt.in[1] <== in[0];
    lt.out ==> out;
}
