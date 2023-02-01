include "./circomlib/circuits/poseidon.circom";

template IdentitySecret() {
  signal input nullifier;
  signal input trapdoor;

  signal output out;

  component hasher = Poseidon(2);
  hasher.inputs[0] <== nullifier;
  hasher.inputs[1] <== trapdoor;

  out <== hasher.out;
}

template IdentityCommitment() {
  signal input nullifier;
  signal input trapdoor;

  signal output out;

  component secret = IdentitySecret();
  secret.nullifier <== nullifier;
  secret.trapdoor <== trapdoor;

  component hasher = Poseidon(1);
  hasher.inputs[0] <== secret.out;

  out <== hasher.out;
}
