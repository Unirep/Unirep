include "./circomlib/circuits/comparators.circom";
include "./circomlib/circuits/bitify.circom";

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
    lt.in[0] <== in[1];
    lt.in[1] <== in[0];
    out <== lt.out;
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