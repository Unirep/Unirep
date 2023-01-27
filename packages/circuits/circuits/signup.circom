pragma circom 2.1.3;

// Output identity commitment and starting state tree leaf

include "./circomlib/circuits/poseidon.circom";
include "./identity.circom";

template Signup() {

    signal output identity_commitment;
    signal output state_tree_leaf;

    signal input attester_id;
    signal input epoch;

    signal input identity_nullifier;
    signal input identity_trapdoor;

    component commitment_calc = IdentityCommitment();
    commitment_calc.nullifier <== identity_nullifier;
    commitment_calc.trapdoor <== identity_trapdoor;
    identity_commitment <== commitment_calc.out;

    component leaf_hasher = Poseidon(7);
    leaf_hasher.inputs[0] <== commitment_calc.secret;
    leaf_hasher.inputs[1] <== attester_id;
    leaf_hasher.inputs[2] <== epoch;
    leaf_hasher.inputs[3] <== 0; // posRep
    leaf_hasher.inputs[4] <== 0; // negRep
    leaf_hasher.inputs[5] <== 0; // graffiti
    leaf_hasher.inputs[6] <== 0; // timestamp

    state_tree_leaf <== leaf_hasher.out;
}
