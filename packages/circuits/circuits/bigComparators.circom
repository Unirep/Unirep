include "./circomlib/circuits/comparators.circom";
include "./circomlib/circuits/bitify.circom";
include "./circomlib/circuits/mux1.circom";
include "./modulo.circom";

//~~ support comparisons of numbers up to the field size

// Extract `l` lower bits and `u` upper bits
template ExtractBits(l, u) {
    assert(l + u <= 253);
    assert(l < 253);
    assert(u < 253);
    signal input in;
    signal output upper;
    signal output lower;

    upper <-- in >> l;
    // lower should contain the lower bits
    lower <== in - upper * 2**l;

    // to satisfy compiler
    signal _v[l];
    signal _z[u];
    // verify lower/upper ranges
    _v <== Num2Bits(l)(lower);
    _z <== Num2Bits(u)(upper);
}

template LowerGreaterThan(n) {
    assert(n < 253);
    signal input in[2];
    signal output out;

    component lt = LowerLessThan(n);
    lt.in <== in;
    out <== IsZero()(lt.out);
}

template LowerLessThan(n) {
    assert(n < 253);
    signal input in[2];
    signal output out;

    component extractor[2];

    for (var x = 0; x < 2; x++) {
        extractor[x] = ExtractBits(n, 253-n);
        extractor[x].in <== in[x];
    }

    component lt = LessThan(n);
    lt.in[0] <== extractor[0].lower;
    lt.in[1] <== extractor[1].lower;

    out <== lt.out;
}

template replFieldEqual(REPL_NONCE_BITS) {
    assert(REPL_NONCE_BITS < 253);
    signal input in[2];
    signal output out;

    component extractor[2];

    for (var x = 0; x < 2; x++) {
        extractor[x] = ExtractBits(REPL_NONCE_BITS, 253-REPL_NONCE_BITS);
        extractor[x].in <== in[x];
    }

    component eq = IsEqual();
    eq.in[0] <== extractor[0].upper;
    eq.in[1] <== extractor[1].upper;

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
