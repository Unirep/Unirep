include "./circomlib/circuits/poseidon.circom";
include "./circomlib/circuits/comparators.circom";

template BuildSortedTree(TREE_DEPTH) {
  signal output root;
  signal output checksum;

  // leaf and original index
  signal input leaves[2**TREE_DEPTH];
  signal input leaf_r[2**TREE_DEPTH];
  signal input R;

  /**
   * Step 1: Make sure leaf values are ascending
   * TODO: find a way to not use a LessThan component
   * can use value differences/subtraction for this?
   **/
  component lt_comp[2**TREE_DEPTH - 1];
  leaves[0] \ 2**252 === 0;
  for (var x = 1; x < 2**TREE_DEPTH; x++) {
    leaves[x] \ 2**252 === 0;
    lt_comp[x-1] = LessThan(252);
    lt_comp[x-1].in[0] <== leaves[x-1];
    lt_comp[x-1].in[1] <== leaves[x];
    lt_comp[x-1].out === 1;
  }

  /**
   * Step 2: Calculate the polynomial hash of the leaves
   **/
  signal terms[2**TREE_DEPTH];
  var polyhash = 0;
  component rpow[2**TREE_DEPTH];
  var seen[2**TREE_DEPTH];
  component iszero[2**TREE_DEPTH**2];
  for (var x = 0; x < 2**TREE_DEPTH; x++) {
    for (var y = 0; y < 2**TREE_DEPTH; y++) {
      var i = x*2**TREE_DEPTH+y;
      iszero[i] = IsZero();
      iszero[i].in <== y - leaf_r[x];
      seen[y] += iszero[i].out;
    }

    rpow[x] = Pow(2**TREE_DEPTH);
    rpow[x].degree <== leaf_r[x];
    rpow[x].base <== R;
    terms[x] <== leaves[x] * rpow[x].out;
    polyhash += terms[x];
  }
  checksum <== polyhash;

  // check that each index was seen exactly once
  for (var x = 0; x < 2**TREE_DEPTH; x++) {
    seen[x] === 1;
  }

  /**
   * Step 3: Calculate the tree root
   **/

  /*
        x
      x x x
   xxx xxx xxx
  */

  // The total number of hashes to calculate the root
  component hashers[2 ** TREE_DEPTH - 1];

  // The total number of hash outputs we need to store
  var total_hashes = 2 ** (TREE_DEPTH + 1) - 1;
  signal hashes[total_hashes];

  // first do the input leaves
  // index in hash arr = 2**(level-1) + index
  for (var level = TREE_DEPTH; level > 0; level--) {
    for (var index = 0; index < 2**level; index += 2) {

      // index in the hashes array where the parent goes
      var i = 2 ** (level - 1) - 1 + index \ 2;

      // can use the same indexing for hashers
      var hasher_index = i;
      hashers[hasher_index] = Poseidon(2);

      if (level == TREE_DEPTH) {
        hashers[hasher_index].inputs[0] <== leaves[index];
        hashers[hasher_index].inputs[1] <== leaves[index + 1];
        hashes[i] <== hashers[hasher_index].out;
      } else {
        // index of the child leaves in the array
        var t = 2 ** (level) - 1 + index;
        hashers[hasher_index].inputs[0] <== hashes[t];
        hashers[hasher_index].inputs[1] <== hashes[t + 1];
        hashes[i] <== hashers[hasher_index].out;
      }
    }
  }
  root <== hashes[0];
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
