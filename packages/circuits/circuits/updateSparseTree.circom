include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/mux1.circom";
include "./sparseMerkleTree.circom";

template UpdateSparseTree(TREE_DEPTH) {
    signal output to_root;
    signal output new_leaf;

    signal input from_root;
    signal input leaf_index;
    signal input pos_rep;
    signal input neg_rep;

    signal input old_leaf;

    signal input leaf_elements[TREE_DEPTH];

    // if this is true output the from_root
    signal input should_ignore;

    // verify membership of old rep
    // calculate new root

    /** 1. Verify old_leaf membership in from_root **/

    component tree_membership = SMTInclusionProof(TREE_DEPTH);
    tree_membership.leaf_index <== leaf_index;
    tree_membership.leaf <== old_leaf;
    for (var i = 0; i < TREE_DEPTH; i++) {
        tree_membership.path_elements[i][0] <== leaf_elements[i];
    }
    from_root === tree_membership.root;

    /** End of check 1 **/

    /** 2. Calculate the to_root by inserting the new_leaf **/

    component leaf_hasher = Poseidon(2);
    leaf_hasher.inputs[0] <== pos_rep;
    leaf_hasher.inputs[1] <== neg_rep;
    new_leaf <== leaf_hasher.out;

    component new_tree = SMTInclusionProof(TREE_DEPTH);
    new_tree.leaf_index <== leaf_index;
    new_tree.leaf <== new_leaf;
    for (var i = 0; i < TREE_DEPTH; i++) {
        new_tree.path_elements[i][0] <== leaf_elements[i];
    }

    // if the ignore check is 0 we output new_tree.root
    // if it is 1 we output the from_root
    component should_not_ignore = IsZero();
    should_not_ignore.in <== should_ignore;

    component root_selector = Mux1();
    root_selector.c[0] <== from_root;
    root_selector.c[1] <== new_tree.root;
    root_selector.s <== should_not_ignore.out;

    to_root <== root_selector.out;

    /** End of check 2 **/
}
