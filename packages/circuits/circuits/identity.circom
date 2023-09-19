pragma circom 2.1.0;

include "./circomlib/circuits/poseidon.circom";

template IdentityCommitment() {
  signal input secret;

  signal output commitment;

  commitment <== Poseidon(1)([secret]);
}

