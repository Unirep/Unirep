include "./circomlib/circuits/poseidon.circom";

// attester_id, epoch, and nonce must be range checked
// outside of this component
template EpochKeyHasher() {
  signal input identity_secret;
  signal input attester_id;
  signal input epoch;
  signal input nonce;

  signal output out;
  out <== Poseidon(2)([identity_secret, attester_id + 2**160*epoch + 2**208*nonce]);
}

template EpochTreeLeaf(FIELD_COUNT) {
  signal input epoch_key;
  signal input data[FIELD_COUNT];

  signal output out;

  signal hasher[FIELD_COUNT];

  for (var x = 0; x < FIELD_COUNT; x++) {
    if (x == 0) {
      hasher[0] <== Poseidon(2)([epoch_key, data[0]]);
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

  signal output out;
  signal output control;
  signal output data_hash;

  signal hasher[FIELD_COUNT-1];

  for (var x = 0; x < FIELD_COUNT-1; x++) {
    if (x == 0) {
      hasher[0] <== Poseidon(2)([data[0], data[x+1]]);
    } else {
      hasher[x] <== Poseidon(2)([hasher[x-1], data[x+1]]);
    }
  }

  control <== attester_id + 2**160*epoch;
  data_hash <== hasher[FIELD_COUNT-2];
  signal interm <== Poseidon(2)([identity_secret, control]);
  out <== Poseidon(2)([interm, data_hash]);
}
