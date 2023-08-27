pragma circom 2.1.0;

include "./circomlib/circuits/poseidon.circom";

template IdentitySecret() {
  signal input nullifier;
  signal input trapdoor;

  signal output out;

  out <== Poseidon(2)([nullifier, trapdoor]);
}

template IdentityCommitment() {
  signal input nullifier;
  signal input trapdoor;

  signal output secret;
  signal output out;

  secret <== IdentitySecret()(nullifier, trapdoor);
  out <== Poseidon(1)([secret]);
}

