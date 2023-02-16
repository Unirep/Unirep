include "./circomlib/circuits/poseidon.circom";
include "./circomlib/circuits/comparators.circom";
include "./circomlib/circuits/bitify.circom";
include "./circomlib/circuits/gates.circom";
include "./circomlib/circuits/mux1.circom";
include "./bigComparators.circom";

template BuildOrderedTree(TREE_DEPTH, TREE_ARITY, R, R2) {
  signal output root;
  signal output checksum;

  // leaf and original index
  signal input sorted_leaf_preimages[TREE_ARITY**TREE_DEPTH][5];
  // signal input sorted_leaves[TREE_ARITY**TREE_DEPTH];
  signal input leaf_r_values[TREE_ARITY**TREE_DEPTH];

  /**
   * Step 0: hash the leaves to prevent a chosen input attack
   **/
  component sorted_leaf_hashers[TREE_ARITY**TREE_DEPTH];
  component sorted_leaf_iszero[TREE_ARITY**TREE_DEPTH];
  component sorted_leaf_isone[TREE_ARITY**TREE_DEPTH];
  component sorted_leaf_ors[TREE_ARITY**TREE_DEPTH];
  component sorted_leaf_mux[TREE_ARITY**TREE_DEPTH];
  signal sorted_leaves[TREE_ARITY**TREE_DEPTH];
  for (var x = 0; x < TREE_ARITY**TREE_DEPTH; x++) {
    sorted_leaf_isone[x] = IsEqual();
    sorted_leaf_isone[x].in[0] <== sorted_leaf_preimages[x][0];
    sorted_leaf_isone[x].in[1] <== 1;

    sorted_leaf_iszero[x] = IsZero();
    // check if the epoch key is 0
    sorted_leaf_iszero[x].in <== sorted_leaf_preimages[x][0];

    sorted_leaf_hashers[x] = Poseidon(5);
    for (var y = 0; y < 5; y++) {
      sorted_leaf_hashers[x].inputs[y] <== sorted_leaf_preimages[x][y];
    }

    // If the leaf preimage is 0, we insert a 0
    // If it's 1 we insert SNARK_SCALAR_FIELD-1
    // Otherwise we take the hash

    sorted_leaf_ors[x] = OR();
    sorted_leaf_ors[x].a <== sorted_leaf_iszero[x].out;
    sorted_leaf_ors[x].b <== sorted_leaf_isone[x].out;

    sorted_leaf_mux[x] = Mux1();
    sorted_leaf_mux[x].s <== sorted_leaf_ors[x].out;
    sorted_leaf_mux[x].c[0] <== sorted_leaf_hashers[x].out;
    sorted_leaf_mux[x].c[1] <== sorted_leaf_isone[x].out*-1;
    sorted_leaves[x] <== sorted_leaf_mux[x].out;
  }

  /**
   * Step 1: Make sure leaf values are ascending
   * TODO: find a way to not use a LessThan component
   * can use value differences/subtraction for this?
   **/
  component lt_comp[TREE_ARITY**TREE_DEPTH];
  component gt_comp[TREE_ARITY**TREE_DEPTH];
  component leaf_mux[TREE_ARITY**TREE_DEPTH];
  component leaf_max[TREE_ARITY**TREE_DEPTH];
  component leaf_zero[TREE_ARITY**TREE_DEPTH];
  component leaf_ors[TREE_ARITY**TREE_DEPTH];
  //~~~ first leaf must be 0
  sorted_leaves[0] === 0;
  for (var x = 0; x < TREE_ARITY**TREE_DEPTH; x++) {
    leaf_max[x] = IsEqual();
    leaf_max[x].in[0] <== -1;
    leaf_max[x].in[1] <== sorted_leaves[x];

    leaf_zero[x] = IsZero();
    leaf_zero[x].in <== sorted_leaves[x];

    leaf_ors[x] = OR();
    leaf_ors[x].a <== leaf_max[x].out;
    leaf_ors[x].b <== leaf_zero[x].out;
  }
  for (var x = 1; x < TREE_ARITY**TREE_DEPTH; x++) {
    // sorted_leaves[x] \ 2**252 === 0;
    lt_comp[x] = BigLessThan();
    lt_comp[x].in[0] <== sorted_leaves[x-1];
    lt_comp[x].in[1] <== sorted_leaves[x];

    // If the leaf is zero require that the previous leaf was
    // SNARK_SCALAR_FIELD-1 or 0

    leaf_mux[x] = Mux1();
    leaf_mux[x].s <== leaf_zero[x].out;

    leaf_mux[x].c[0] <== lt_comp[x].out;
    leaf_mux[x].c[1] <== leaf_ors[x-1].out;

    leaf_mux[x].out === 1;
  }

  /**
   * Step 2: Calculate the polynomial hash of the leaves
   **/

  signal terms[TREE_ARITY**TREE_DEPTH];
  var polyhash = 0;
  for (var x = 0; x < TREE_ARITY**TREE_DEPTH; x++) {
    terms[x] <== sorted_leaves[x] * leaf_r_values[x];
    polyhash += terms[x];
  }
  checksum <== polyhash;

  var r_sum = 0;
  component r_hasher[TREE_ARITY**TREE_DEPTH];
  signal r_sum_inter[TREE_ARITY**TREE_DEPTH];
  for (var x = 0; x < TREE_ARITY**TREE_DEPTH; x++) {
    r_hasher[x] = Poseidon(1);
    r_hasher[x].inputs[0] <== leaf_r_values[x];
    r_sum_inter[x] <== r_hasher[x].out * leaf_r_values[x];
    r_sum += r_sum_inter[x];
  }

  var r_checksum = 0;
  component r_hasher_check[TREE_ARITY**TREE_DEPTH];
  signal r_checksum_inter[TREE_ARITY**TREE_DEPTH];
  for (var x = 0; x < TREE_ARITY**TREE_DEPTH; x++) {
    r_hasher_check[x] = Poseidon(1);
    r_hasher_check[x].inputs[0] <== R**x;
    r_checksum_inter[x] <== r_hasher_check[x].out * R**x;
    r_checksum += r_checksum_inter[x];
  }

  r_sum === r_checksum;

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
