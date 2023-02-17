include "./circomlib/circuits/poseidon.circom";

template EpochTreeLeaf(FIELD_COUNT, R) {
  signal input epoch_key;
  signal input data[FIELD_COUNT];

  signal output out;

  component hasher[FIELD_COUNT];

  component epk_hasher = Poseidon(1);
  epk_hasher.inputs[0] <== epoch_key;

  var polysum = epk_hasher.out * R;

  for (var x = 0; x < FIELD_COUNT; x++) {
    hasher[x] = Poseidon(1);
    hasher[x].inputs[0] <== data[x];
    polysum += hasher[x].out * R**(x + 2);
  }

  out <== polysum;
}

template StateTreeLeaf(FIELD_COUNT, R) {
  signal input data[FIELD_COUNT];
  signal input identity_secret;
  signal input attester_id;
  signal input epoch;

  signal output out;

  component hasher[FIELD_COUNT];
  var polysum = 0;
  for (var x = 0; x < FIELD_COUNT; x++) {
    hasher[x] = Poseidon(1);
    hasher[x].inputs[0] <== data[x];
    polysum += hasher[x].out * R**(x + 1);
  }

  component final_hasher = Poseidon(4);
  final_hasher.inputs[0] <== identity_secret;
  final_hasher.inputs[1] <== attester_id;
  final_hasher.inputs[2] <== epoch;
  final_hasher.inputs[3] <== polysum;

  out <== final_hasher.out;
}
