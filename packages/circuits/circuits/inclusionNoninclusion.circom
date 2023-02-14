pragma circom 2.0.0;

include "./circomlib/circuits/bitify.circom";
include "./exists.circom";
include "./sparseMerkleTree.circom";
include "./modulo.circom";
include "./bigComparators.circom";

/*~~~~~

Prove that an element either exists or does not exist in an
tree.

~~~~~~

The first and last elements of this tree must be 0 and the field
max value, respectively. This is _not_ checked here.

~~~~~

ASSUME

n is the number of non-zero, non-max, elements in the tree

leaves[0] = 0
leaves[n+1] = INT_MAX
leaves[1...n] = elements of the tree

// you shouldn't trust assumptions
n <= TREE_ARITY ** TREE_DEPTH - 2
*/


template ProveInclusionOrNoninclusion(TREE_DEPTH, TREE_ARITY) {

    signal input leaf;

    //~~ multiple levels of elements of the parent tree
    signal input parent_elements[TREE_DEPTH - 1][TREE_ARITY];
    signal input parent_indices[TREE_DEPTH - 1];

    //~~ the leaf and siblings for the inclusion proof
    signal input inclusion_leaf_index;
    signal input inclusion_elements[TREE_ARITY];

    //~~~~~ Supply two sequential leaves to prove non-inclusion
    signal input noninclusion_leaf[2];
    signal input noninclusion_leaf_index;
    signal input noninclusion_elements[2][TREE_ARITY];

    signal output inclusion;
    signal output noninclusion;
    signal output root;

    //~~~~~ Build the parent subtree

    component subtree = SMTRootCalc(TREE_DEPTH - 1, TREE_ARITY);

    for (var j = 0; j < (TREE_DEPTH - 1); j++) {
        subtree.path_indices[j] <== parent_indices[j];
        for (var k = 0; k < TREE_ARITY; k++) {
            subtree.path_elements[j][k] <== parent_elements[j][k];
        }
    }
    root <== subtree.root;

    /*~~~~~

    Now we have a subtree of the full tree. We can modularly prove if a set of leaves is the level below the subtree leaves.

    Without this optimization we need 3 * TREE_DEPTH x Poseidon(TREE_ARITY)
    With this optimization we need 2 + TREE_DEPTH x Poseidon(TREE_ARITY)
    */

    //~~~~~ Check that leaf exists in inclusion_elements
    component inclusion_leaf_mod = Modulo();
    inclusion_leaf_mod.divisor <== TREE_ARITY;
    inclusion_leaf_mod.dividend <== inclusion_leaf_index;

    component inclusion_leaf_exists = Exists(TREE_ARITY);

    inclusion_leaf_exists.value <== leaf;
    inclusion_leaf_exists.index <== inclusion_leaf_mod.remainder;
    for (var j = 0; j < TREE_ARITY; j++) {
        inclusion_leaf_exists.values[j] <== inclusion_elements[j];
    }

    //~~~~~ Calculate inclusion_elements parent

    component inclusion_parent_hasher = Poseidon(TREE_ARITY);
    for (var j = 0; j < TREE_ARITY; j++) {
        inclusion_parent_hasher.inputs[j] <== inclusion_elements[j];
    }

    //~~~~~ Check that inclusion_elements parent exists in parent tree

    component inclusion_parent_exists = Exists(TREE_ARITY);

    inclusion_parent_exists.value <== inclusion_parent_hasher.out;
    inclusion_parent_exists.index <== inclusion_leaf_mod.quotient;
    for (var j = 0; j < TREE_ARITY; j++) {
        inclusion_parent_exists.values[j] <== parent_elements[0][j];
    }

    //~~ (leaf_exists && parent_exists)
    inclusion <== inclusion_parent_exists.out * inclusion_leaf_exists.out;

    /*~~~~~

    Inclusion proof done, now we do non-inclusion.
    */

    component noninclusion_leaf_exists[2];
    component noninclusion_parent_exists[2];
    component noninclusion_parent_hasher[2];
    component noninclusion_leaf_mod[2];

    signal leaf_exists[2];

    for (var x = 0; x < 2; x++) {

        noninclusion_leaf_mod[x] = Modulo();
        noninclusion_leaf_mod[x].divisor <== TREE_ARITY;
        noninclusion_leaf_mod[x].dividend <== noninclusion_leaf_index + x;

        //~~~~~ Check that noninclusion_leaf exists in noninclusion_elements

        noninclusion_leaf_exists[x] = Exists(TREE_ARITY);

        noninclusion_leaf_exists[x].value <== noninclusion_leaf[x];
        noninclusion_leaf_exists[x].index <== noninclusion_leaf_mod[x].remainder;
        for (var j = 0; j < TREE_ARITY; j++) {
            noninclusion_leaf_exists[x].values[j] <== noninclusion_elements[x][j];
        }

        //~~~~~ Calculate noninclusion_elements parent

        noninclusion_parent_hasher[x] = Poseidon(TREE_ARITY);
        for (var j = 0; j < TREE_ARITY; j++) {
            noninclusion_parent_hasher[x].inputs[j] <== noninclusion_elements[x][j];
        }

        //~~~~~ Check that inclusion_elements parent exists in parent tree

        noninclusion_parent_exists[x] = Exists(TREE_ARITY);

        noninclusion_parent_exists[x].value <== noninclusion_parent_hasher[x].out;
        noninclusion_parent_exists[x].index <== noninclusion_leaf_mod[x].quotient;
        for (var j = 0; j < TREE_ARITY; j++) {
            noninclusion_parent_exists[x].values[j] <== parent_elements[0][j];
        }

        //~ (leaf_exists && parent_exists)
        leaf_exists[x] <== noninclusion_parent_exists[x].out * noninclusion_leaf_exists[x].out;
    }

    signal exists <== leaf_exists[0] * leaf_exists[1];

    //~~~ noninclusion_leaf[0] < leaf < noninclusion_leaf[1]

    component lt = BigLessThan();

    lt.in[0] <== noninclusion_leaf[0];
    lt.in[1] <== leaf;

    component gt = BigGreaterThan();
    gt.in[0] <== noninclusion_leaf[1];
    gt.in[1] <== leaf;

    signal gtlt <== lt.out * gt.out;

    noninclusion <== gtlt * exists;
}
