include "./circomlib/circuits/poseidon.circom";

// attester_id, epoch, and nonce must be range checked
// outside of this component
template EpochKeyHasher() {
  signal input identity_secret;
  signal input attester_id;
  signal input epoch;
  signal input nonce;

  signal output out;

  component hasher = Poseidon(2);
  hasher.inputs[0] <== identity_secret;
  // 160 bit attester id, 48 bit epoch
  hasher.inputs[1] <== attester_id + 2**160*epoch + 2**208*nonce;

  out <== hasher.out;
}

template EpochTreeLeaf(FIELD_COUNT) {
  assert(FIELD_COUNT < 254);
  signal input epoch_key;
  signal input data[FIELD_COUNT];

  signal output out;

  component hasher[FIELD_COUNT];

  for (var x = 0; x < FIELD_COUNT; x++) {
    hasher[x] = Poseidon(2);
    if (x == 0) {
      hasher[x].inputs[0] <== epoch_key;
    } else {
      hasher[x].inputs[0] <== hasher[x-1].out;
    }
    hasher[x].inputs[1] <== data[x];
  }

  out <== hasher[FIELD_COUNT-1].out;
}

// attester_id and epoch must be range checked
// outside of this component
template StateTreeLeaf(FIELD_COUNT) {
  assert(FIELD_COUNT < 254);
  signal input data[FIELD_COUNT];
  signal input identity_secret;
  signal input attester_id;
  signal input epoch;

  signal output out;

  component hasher[FIELD_COUNT-1];

  for (var x = 0; x < FIELD_COUNT-1; x++) {
    hasher[x] = Poseidon(2);
    if (x == 0) {
      hasher[x].inputs[0] <== data[0];
    } else {
      hasher[x].inputs[0] <== hasher[x-1].out;
    }
    hasher[x].inputs[1] <== data[x+1];
  }

  component final_hasher = Poseidon(3);
  final_hasher.inputs[0] <== identity_secret;
  final_hasher.inputs[1] <== attester_id + 2**160*epoch;
  final_hasher.inputs[2] <== hasher[FIELD_COUNT-2].out;

  out <== final_hasher.out;
}
