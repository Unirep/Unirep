include "./circomlib/circuits/comparators.circom";
include "./circomlib/circuits/bitify.circom";

//~~ support comparisons of numbers up to the field size

// Extract `l` lower bits and `u` upper bits
template ExtractBits(l, u) {
    var MAX_SAFE_BITS = 253;
    assert(l + u <= MAX_SAFE_BITS);
    assert(l < MAX_SAFE_BITS);
    assert(u < MAX_SAFE_BITS);
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
    var MAX_SAFE_BITS = 253;
    assert(n < MAX_SAFE_BITS);
    signal input in[2];
    signal output out;
    
    out <== LowerLessThan(n)([in[1], in[0]]);
}

template LowerLessThan(n) {
    var MAX_SAFE_BITS = 253;
    assert(n < MAX_SAFE_BITS);
    signal input in[2];
    signal output out;
    signal extractor[2];

    for (var x = 0; x < 2; x++) {
        // since we only need output: lower here => using tuple
        (_,extractor[x]) <== ExtractBits(n, MAX_SAFE_BITS-n)(in[x]);
    }

    out <== LessThan(n)(extractor);
}