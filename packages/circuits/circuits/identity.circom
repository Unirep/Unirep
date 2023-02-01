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

  signal output secret;
  signal output out;

  component _secret = IdentitySecret();
  _secret.nullifier <== nullifier;
  _secret.trapdoor <== trapdoor;

  secret <== _secret.out;

  component hasher = Poseidon(1);
  hasher.inputs[0] <== _secret.out;

  out <== hasher.out;
}
