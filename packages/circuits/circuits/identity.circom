pragma circom 2.1.0;

include "./circomlib/circuits/poseidon.circom";

template IdentityCommitment() {
  signal input identity_secret;

  signal output commitment;

  commitment <== Poseidon(1)([identity_secret]);
}

