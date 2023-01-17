include "./circomlib/circuits/poseidon.circom";
include "./circomlib/circuits/comparators.circom";
include "./circomlib/circuits/bitify.circom";

template CoefficientFrom(R_V) {

  //~~ generate a coefficient for a R**x value
  //~~ used when fingerprinting the R**x set itself

  // TODO: check that this is safe

  //~~ we get a new random number by applying a rotation
  //~~ and a multiplication with a constant random
  // https://en.wikipedia.org/wiki/Algebra_of_random_variables#Elementary_symbolic_algebra_of_random_variables

  signal input value;

  signal output out;

  //~~ Do a circular rotation
  signal first <-- value & (2**128 - 1);
  signal second <-- (value \ 2**128) & (2**128 - 1);

  signal inter <== first + second * 2**128;

  value === inter;

  var rotated = second + first * 2**128;
  out <== R_V * rotated;
}

template BuildOrderedTree(TREE_DEPTH, TREE_ARITY, R, R_V) {
  signal output root;
  signal output checksum;

  // leaf and original index
  signal input sorted_leaves[TREE_ARITY**TREE_DEPTH];
  signal input leaf_r_values[TREE_ARITY**TREE_DEPTH];

  /**
   * Step 1: Make sure leaf values are ascending
   * TODO: find a way to not use a LessThan component
   * can use value differences/subtraction for this?
   **/
  component lt_comp[TREE_ARITY**TREE_DEPTH - 1];
  sorted_leaves[0] \ 2**252 === 0;
  for (var x = 1; x < TREE_ARITY**TREE_DEPTH; x++) {
    sorted_leaves[x] \ 2**252 === 0;
    lt_comp[x-1] = LessThan(252);
    lt_comp[x-1].in[0] <== sorted_leaves[x-1];
    lt_comp[x-1].in[1] <== sorted_leaves[x];
    lt_comp[x-1].out === 1;
  }

  /**
   * Step 2: Calculate the polynomial hash of the leaves
   **/

  //~~ generate R_V value by applying some number of rounds
  //~~ each round is xor + bit rotation

  signal terms[TREE_ARITY**TREE_DEPTH];
  var polyhash = 0;
  for (var x = 0; x < TREE_ARITY**TREE_DEPTH; x++) {
    terms[x] <== sorted_leaves[x] * leaf_r_values[x];
    polyhash += terms[x];
  }
  checksum <== polyhash;

  var actual_sum = 0;
  component actual_coeff[TREE_ARITY**TREE_DEPTH];
  signal actual_inter[TREE_ARITY**TREE_DEPTH];
  for (var x = 0; x < TREE_ARITY**TREE_DEPTH; x++) {
    actual_coeff[x] = CoefficientFrom(R_V);
    actual_coeff[x].value <== leaf_r_values[x];
    actual_inter[x] <== actual_coeff[x].out * leaf_r_values[x];
    actual_sum += actual_inter[x];
  }

  var expected_sum = 0;
  component expected_coeff[TREE_ARITY**TREE_DEPTH];
  signal expected_inter[TREE_ARITY**TREE_DEPTH];
  for (var x = 0; x < TREE_ARITY**TREE_DEPTH; x++) {
    expected_coeff[x] = CoefficientFrom(R_V);
    expected_coeff[x].value <== R**x;
    expected_inter[x] <== expected_coeff[x].out * R ** x;
    expected_sum += expected_inter[x];
  }
  expected_sum === actual_sum;

  /**
   * Step 3: Calculate the tree root
   **/

  /*
        x
      x x x
   xxx xxx xxx
  */
  // 3^0 + 3^1 + 3^2 + 3^3
  /*
        x
      x   x
     x x x x
  */

  // The total number of hashes to calculate the root
  // This will get reduced to a constant by the compiler
  var total_hashers = 0;
  for (var x = 0; x < TREE_DEPTH; x++) {
    total_hashers += TREE_ARITY ** x;
  }
  component hashers[total_hashers];

  var total_values = 0;
  for (var x = 0; x < TREE_DEPTH + 1; x++) {
    total_values += TREE_ARITY ** x;
  }

  // The total number of hash outputs we need to store
  signal values[total_values];

  // first do the input leaves
  // index in hash arr = TREE_ARITY**(level-1) + index
  for (var level = TREE_DEPTH; level > 0; level--) {
    for (var index = 0; index < TREE_ARITY**level; index += TREE_ARITY) {

      // index in the hashes array where the parent goes
      var _i = 0;
      for (var z = 0; z < level - 1; z++) {
        _i += TREE_ARITY ** z;
      }
      var i = _i + index \ TREE_ARITY;

      // can use the same indexing for hashers
      var hasher_index = i;
      hashers[hasher_index] = Poseidon(TREE_ARITY);

      if (level == TREE_DEPTH) {
        for (var z = 0; z < TREE_ARITY; z++) {
          hashers[hasher_index].inputs[z] <== sorted_leaves[index + z];
        }
        values[i] <== hashers[hasher_index].out;
      } else {
        // index of the child leaves in the array
        var t = _i + TREE_ARITY ** (level - 1) + index;
        for (var z = 0; z < TREE_ARITY; z++) {
          hashers[hasher_index].inputs[z] <== values[t + z];
        }
        values[i] <== hashers[hasher_index].out;
      }
    }
  }
  root <== values[0];
}

template PowC(MAX_DEGREE, C) {
  signal input degree;
  signal output out;

  degree \ MAX_DEGREE === 0;

  component iszero[MAX_DEGREE];

  var pow = 0;
  iszero[0] = IsZero();
  iszero[0].in <== degree;
  pow += iszero[0].out;

  for (var x = 1; x < MAX_DEGREE; x++) {
    iszero[x] = IsZero();
    iszero[x].in <== x - degree;
    pow += iszero[x].out * C ** x;
  }
  out <== pow;
}

template Pow(MAX_DEGREE) {
  signal input degree;
  signal input base;
  signal output out;

  degree \ MAX_DEGREE === 0;

  component iszero[MAX_DEGREE];
  signal i[MAX_DEGREE];
  signal b[MAX_DEGREE];

  iszero[0] = IsZero();
  iszero[0].in <== degree;
  i[0] <== 1;
  b[0] <== base - (base - 1) * iszero[0].out;

  for (var x = 1; x < MAX_DEGREE; x++) {
    iszero[x] = IsZero();
    iszero[x].in <== x - degree;
    i[x] <== i[x - 1] * b[x - 1];
    b[x] <== b[x - 1] - (b[x - 1] - 1) * iszero[x].out;
  }
  out <== i[MAX_DEGREE-1];
}
