pragma circom 2.1.0;

// Output identity commitment and starting state tree leaf

include "./circomlib/circuits/bitify.circom";
include "./identity.circom";
include "./hasher.circom";

template Signup(FIELD_COUNT) {

   signal input attester_id;
   signal input epoch;
   signal input identity_secret;
   signal input chain_id;

   signal output commitment;
   signal output state_tree_leaf;
   signal output control;

   var ATTESTER_ID_BITS = 160;
   var EPOCH_BITS = 48;
   var CHAIN_ID_BITS = 36;

   commitment <== IdentityCommitment()(identity_secret);
 
   _ <== Num2Bits(EPOCH_BITS)(epoch);
   _ <== Num2Bits(ATTESTER_ID_BITS)(attester_id);
   _ <== Num2Bits(CHAIN_ID_BITS)(chain_id);

   signal data[FIELD_COUNT];
   for (var x = 0; x < FIELD_COUNT; x++) {
      data[x] <== 0;
   }
   (state_tree_leaf, control, _) <== StateTreeLeaf(FIELD_COUNT)(
      data,
      identity_secret, 
      attester_id, 
      epoch,
      chain_id
   );
}
