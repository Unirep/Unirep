pragma circom 2.1.0;

// Output identity commitment and starting state tree leaf

include "./circomlib/circuits/bitify.circom";
include "./identity.circom";
include "./hasher.circom";

template Signup(FIELD_COUNT) {

    signal output identity_commitment;
    signal output state_tree_leaf;
    signal output control;

    signal input attester_id;
    signal input epoch;

    signal input identity_nullifier;
    signal input identity_trapdoor;

    signal identity_secret;

    (identity_secret, identity_commitment) <== IdentityCommitment()(
      identity_nullifier,
      identity_trapdoor);
 
    _ <== Num2Bits(48)(epoch);
    _ <== Num2Bits(160)(attester_id);

    signal data[FIELD_COUNT];
    for (var x = 0; x < FIELD_COUNT; x++) {
       data[x] <== 0;
    }
    (state_tree_leaf, control, _) <== StateTreeLeaf(FIELD_COUNT)(
      data,
      identity_secret, 
      attester_id, 
      epoch);
}

