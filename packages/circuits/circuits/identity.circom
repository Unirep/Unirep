pragma circom 2.1.0;

include "./circomlib/circuits/poseidon.circom";

template IdentitySecret() {
  signal input secret;

  signal output out;

  out <== Poseidon(1)([secret]);
}

template IdentityCommitment() {
  signal input secret;

  signal output identity_secret;
  signal output identity_commitment;

  identity_secret <== IdentitySecret()(secret);
  identity_commitment <== Poseidon(1)([identity_secret]);
}

