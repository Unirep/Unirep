pragma circom 2.0.0;

// Output identity commitment and starting state tree leaf

include "./circomlib/circuits/poseidon.circom";
include "./identity.circom";
include "./leafHasher.circom";

template Signup(FIELD_COUNT, EPK_R) {

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

    component leaf_hasher = StateTreeLeaf(FIELD_COUNT, EPK_R);
    leaf_hasher.identity_secret <== commitment_calc.secret;
    leaf_hasher.attester_id <== attester_id;
    leaf_hasher.epoch <== epoch;
    for (var x = 0; x < FIELD_COUNT; x++) {
      leaf_hasher.data[x] <== 0;
    }

    state_tree_leaf <== leaf_hasher.out;
}
