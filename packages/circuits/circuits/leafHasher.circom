include "./circomlib/circuits/poseidon.circom";

template EpochTreeLeaf(FIELD_COUNT) {
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

template StateTreeLeaf(FIELD_COUNT) {
  signal input data[FIELD_COUNT];
  signal input identity_secret;
  signal input attester_id;
  signal input epoch;

  signal output out;

  component hasher[FIELD_COUNT];

  for (var x = 0; x < FIELD_COUNT; x++) {
    hasher[x] = Poseidon(2);
    if (x == 0) {
      hasher[x].inputs[0] <== 0;
    } else {
      hasher[x].inputs[0] <== hasher[x-1].out;
    }
    hasher[x].inputs[1] <== data[x];
  }

  component final_hasher = Poseidon(4);
  final_hasher.inputs[0] <== identity_secret;
  final_hasher.inputs[1] <== attester_id;
  final_hasher.inputs[2] <== epoch;
  final_hasher.inputs[3] <== hasher[FIELD_COUNT-1].out;

  out <== final_hasher.out;
}
