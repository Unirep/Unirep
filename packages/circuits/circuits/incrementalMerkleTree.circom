// Refer to:
// https://github.com/peppersec/tornado-mixer/blob/master/circuits/merkleTree.circom
// https://github.com/appliedzkp/semaphore/blob/master/circuits/circom/semaphore-base.circom

include "../../../node_modules/circomlib/circuits/mux1.circom";
include "../../../node_modules/circomlib/circuits/poseidon.circom";

template MerkleTreeInclusionProof(n_levels) {
    signal input leaf;
    signal input path_index[n_levels];
    signal input path_elements[n_levels][1];
    signal output root;

    component hashers[n_levels];
    component mux[n_levels];

    signal levelHashes[n_levels + 1];
    levelHashes[0] <== leaf;

    for (var i = 0; i < n_levels; i++) {
        // Should be 0 or 1
        path_index[i] * (1 - path_index[i]) === 0;

        hashers[i] = Poseidon(2);
        mux[i] = MultiMux1(2);

        mux[i].c[0][0] <== levelHashes[i];
        mux[i].c[0][1] <== path_elements[i][0];

        mux[i].c[1][0] <== path_elements[i][0];
        mux[i].c[1][1] <== levelHashes[i];

        mux[i].s <== path_index[i];
        hashers[i].inputs[0]  <== mux[i].out[0];
        hashers[i].inputs[1]  <== mux[i].out[1];

        levelHashes[i + 1] <== hashers[i].out;
    }

    root <== levelHashes[n_levels];
}

template LeafExists(levels){
  // Ensures that a leaf exists within a merkletree with given `root`

  // levels is depth of tree
  signal input leaf;

  signal private input path_elements[levels][1];
  signal private input path_index[levels];

  signal input root;

  component merkletree = MerkleTreeInclusionProof(levels);
  merkletree.leaf <== leaf;
  for (var i = 0; i < levels; i++) {
    merkletree.path_index[i] <== path_index[i];
    merkletree.path_elements[i][0] <== path_elements[i][0];
  }

  root === merkletree.root;
}
