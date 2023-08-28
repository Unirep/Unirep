pragma circom 2.1.0;

// Refer to:
// https://github.com/peppersec/tornado-mixer/blob/master/circuits/merkleTree.circom
// https://github.com/appliedzkp/semaphore/blob/master/circuits/circom/semaphore-base.circom

include "./circomlib/circuits/mux1.circom";
include "./circomlib/circuits/poseidon.circom";
include "./circomlib/circuits/comparators.circom";

template MerkleTreeInclusionProof(n_levels) {
    assert(n_levels < 254);
    signal input leaf;
    signal input path_index[n_levels];
    signal input path_elements[n_levels];
    signal output root;

    signal levelHashes[n_levels + 1];
    levelHashes[0] <== leaf;

    // don't allow inclusion proof for 0 leaf
    signal leaf_zero <== IsZero()(leaf);
    leaf_zero === 0;

    signal mux[n_levels][2];
    signal hashers[n_levels];
    var merklePath[2][2];
    for (var i = 0; i < n_levels; i++) {
        // Should be 0 or 1
        path_index[i] * (1 - path_index[i]) === 0;

        merklePath[0][0] = levelHashes[i];
        merklePath[0][1] = path_elements[i];
        merklePath[1][0] = path_elements[i];
        merklePath[1][1] = levelHashes[i];
        
        mux[i] <== MultiMux1(2)(merklePath, path_index[i]);
        hashers[i] <== Poseidon(2)(mux[i]);

        levelHashes[i + 1] <== hashers[i];
    }

    root <== levelHashes[n_levels];
}
