include "./circomlib/circuits/comparators.circom";

/**
 *
 **/
template OMTNoninclusionProof(TREE_DEPTH, TREE_ARITY) {

  // The leaf we're proving isn't in the tree
  signal input leaf;

  signal input sibling_leaves[2];
  signal input path_elements[2][TREE_DEPTH][TREE_ARITY];
  signal input sibling_index;

  signal output root;

  // check that sibling_leaves[0] < leaf < siblint_leaves[1]

  component lt = LessThan(252);
  lt.in[0] <== sibling_leaves[0];
  lt.in[1] <== leaf;
  lt.out === 1;

  component gt = GreaterThan(252);
  gt.in[0] <== sibling_leaves[1];
  gt.in[1] <== leaf;
  gt.out === 1;

  // Check that the root for both sibling_leaves match

  component inclusion[2];

  inclusion[0] = SMTLeafExists(TREE_DEPTH, TREE_ARITY);
  inclusion[0].leaf <== sibling_leaves[0];
  inclusion[0].leaf_index <== sibling_index;

  for (var x = 0; x < TREE_DEPTH; x++) {
    for (var y = 0; y < TREE_ARITY; y++) {
      inclusion[0].path_elements[x] <== path_elements[0][x][y];
    }
  }

  inclusion[1] = SMTLeafExists(TREE_DEPTH, TREE_ARITY);
  inclusion[1].leaf <== sibling_leaves[1];
  inclusion[1].leaf_index <== sibling_index + 1;

  for (var x = 0; x < TREE_DEPTH; x++) {
    for (var y = 0; y < TREE_ARITY; y++) {
      inclusion[1].path_elements[x] <== path_elements[1][x][y];
    }
  }

  inclusion[0].root === inclusion[1].root;

  // output the root

  root <== inclusion[0].root;
}
