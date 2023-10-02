include "./circomlib/circuits/poseidon.circom";

// attester_id, epoch, and nonce must be range checked
// outside of this component
template EpochKeyHasher() {
  var NONCE_BITS = 8;
  var ATTESTER_ID_BITS = 160;
  var EPOCH_BITS = 48;

  signal input identity_secret;
  signal input attester_id;
  signal input epoch;
  signal input nonce;
  signal input chain_id;

  signal output out;

  /**
  * NOTE: Range of these values should be constrained before using the template
  * e.g.
  * _ <== Num2Bits(ATTESTER_ID_BITS)(attester_id);
  *
  * control structure
  * 160 bits attester id
  * 48 bits epoch
  * 8 bits nonce
  * 36 bit chain id
  **/
  var acc_bits = 0;
  var acc_data = attester_id;
  acc_bits += ATTESTER_ID_BITS;

  acc_data += epoch * 2 ** acc_bits;
  acc_bits += EPOCH_BITS;

  acc_data += nonce * 2 ** acc_bits;
  acc_bits += NONCE_BITS;

  acc_data += chain_id * 2 ** acc_bits;

  out <== Poseidon(2)([identity_secret, acc_data]);
}

template EpochTreeLeaf(FIELD_COUNT) {
  signal input epoch_key;
  signal input data[FIELD_COUNT];

  signal output out;

  signal hasher[FIELD_COUNT];

  for (var x = 0; x < FIELD_COUNT; x++) {
    if (x == 0) {
      hasher[x] <== Poseidon(2)([epoch_key, data[x]]);
    } else {
      hasher[x] <== Poseidon(2)([hasher[x-1], data[x]]);
    }
  }

  out <== hasher[FIELD_COUNT-1];
}

// attester_id and epoch must be range checked
// outside of this component
template StateTreeLeaf(FIELD_COUNT) {
  signal input data[FIELD_COUNT];
  signal input identity_secret;
  signal input attester_id;
  signal input epoch;
  signal input chain_id;

  signal output out;
  signal output control;
  signal output data_hash;

  var ATTESTER_ID_BITS = 160;
  var EPOCH_BITS = 48;

  signal hasher[FIELD_COUNT-1];

  for (var x = 0; x < FIELD_COUNT-1; x++) {
    if (x == 0) {
      hasher[x] <== Poseidon(2)([data[x], data[x+1]]);
    } else {
      hasher[x] <== Poseidon(2)([hasher[x-1], data[x+1]]);
    }
  }

  /**
  * NOTE: Range of these values should be constrained before using the template
  * e.g.
  * _ <== Num2Bits(ATTESTER_ID_BITS)(attester_id);
  *
  * control structure
  * 160 bits attester id
  * 48 bits epoch
  * 36 bit chain id
  **/
  var acc_bits = 0;
  var acc_data = attester_id;
  acc_bits += ATTESTER_ID_BITS;

  acc_data += epoch * 2 ** acc_bits;
  acc_bits += EPOCH_BITS;

  acc_data += chain_id * 2 ** acc_bits;
  control <== acc_data;
  data_hash <== hasher[FIELD_COUNT-2];
  signal leaf_identity_hash <== Poseidon(2)([identity_secret, control]);
  out <== Poseidon(2)([leaf_identity_hash, data_hash]);
}
