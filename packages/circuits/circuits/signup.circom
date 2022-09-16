// Output identity commitment and starting state tree leaf

include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "./identityCommitment.circom";

template Signup() {

    signal output identity_commitment;
    signal output gst_leaf;

    signal input attester_id;
    signal input epoch;

    signal private input identity_nullifier;
    signal private input identity_trapdoor;

    component commitment_calc = IdentityCommitment();
    commitment_calc.identity_nullifier <== identity_nullifier;
    commitment_calc.identity_trapdoor <== identity_trapdoor;
    identity_commitment <== commitment_calc.out;

    component leaf_hasher = Poseidon(5);
    leaf_hasher.inputs[0] <== identity_nullifier;
    leaf_hasher.inputs[1] <== attester_id;
    leaf_hasher.inputs[2] <== epoch;
    leaf_hasher.inputs[3] <== 0; // posRep
    leaf_hasher.inputs[4] <== 0; // negRep

    gst_leaf <== leaf_hasher.out;
}
