include "./circomlib/circuits/poseidon.circom";
include "./circomlib/circuits/comparators.circom";
include "./circomlib/circuits/bitify.circom";
include "./circomlib/circuits/gates.circom";
include "./circomlib/circuits/mux1.circom";

template BuildOrderedTree(TREE_DEPTH, TREE_ARITY, R) {
  signal output root;
  signal output checksum;

  // leaf and original index
  signal input sorted_leaves[TREE_ARITY**TREE_DEPTH];
  signal input leaf_r_values[TREE_ARITY**TREE_DEPTH];

  // number of leaves in the working tree, including
  // the 0 leaf and (SNARK_SCALAR_FIELD - 1)
  signal input leaf_count;

  /**
   * Step 1: Make sure leaf values are ascending
   * TODO: find a way to not use a LessThan component
   * can use value differences/subtraction for this?
   **/
  component lt_comp[TREE_ARITY**TREE_DEPTH - 1];
  component leaf_zero[TREE_ARITY**TREE_DEPTH - 1];
  component gt_comp[TREE_ARITY**TREE_DEPTH - 1];
  component leaf_mux[TREE_ARITY**TREE_DEPTH - 1];
  //~~~ first leaf must be 0
  sorted_leaves[0] === 0;
  //~~ working section of the tree must start with 0 and end with
  //~~ SNARK_SCALAR_CONSTANT - 1
  //~~ the last value being SNARK_SCALAR_CONSTANT -1 is enforced
  //~~ at the smart contract level
  for (var x = 1; x < TREE_ARITY**TREE_DEPTH; x++) {
    // sorted_leaves[x] \ 2**252 === 0;
    lt_comp[x-1] = LessThan(252);
    lt_comp[x-1].in[0] <== sorted_leaves[x-1];
    lt_comp[x-1].in[1] <== sorted_leaves[x];

    //~~ if x > leaf_count, require(leaf === 0)

    leaf_zero[x-1] = IsZero();
    leaf_zero[x-1].in <== sorted_leaves[x];

    //~~~ supports up to 32k leaves
    gt_comp[x-1] = GreaterEqThan(15);
    gt_comp[x-1].in[0] <== x;
    gt_comp[x-1].in[1] <== leaf_count;

    // if gt_comp
    //   then leaf_zero == true
    // else
    //   then lt_comp == true
    leaf_mux[x-1] = Mux1();
    leaf_mux[x-1].s <== gt_comp[x-1].out;

    leaf_mux[x-1].c[0] <== lt_comp[x-1].out;
    leaf_mux[x-1].c[1] <== leaf_zero[x-1].out;

    leaf_mux[x-1].out === 1;
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
