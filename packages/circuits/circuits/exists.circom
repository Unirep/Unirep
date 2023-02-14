pragma circom 2.0.0;

//~~~~~ Check if a value exists in an array

template Exists(MAX_COUNT) {

    signal input value;
    signal input values[MAX_COUNT];

    //~ index of value in values
    signal input index;

    //~~~ 0 or 1
    signal output out;

    component value_equals[MAX_COUNT];
    component index_equals[MAX_COUNT];
    component ands[MAX_COUNT];

    /*~~~~~

    For all values check if the value and index are equal.

    */

    //~~ Must be 1 if element exists in the set
    var sum = 0;

    for (var x = 0; x < MAX_COUNT; x++) {

        value_equals[x] = IsEqual();
        value_equals[x].in[0] <== value;
        value_equals[x].in[1] <== values[x];

        index_equals[x] = IsEqual();
        index_equals[x].in[0] <== x;
        index_equals[x].in[1] <== index;

        ands[x] = AND();
        ands[x].a <== value_equals[x].out;
        ands[x].b <== index_equals[x].out;

        sum += ands[x].out;
    }

    component sum_equals = IsEqual();

    sum_equals.in[0] <== 1;
    sum_equals.in[1] <== sum;

    out <== sum_equals.out;
}
