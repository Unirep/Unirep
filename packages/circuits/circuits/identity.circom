pragma circom 2.1.0;

include "./circomlib/circuits/poseidon.circom";

template IdentityCommitment() {
  signal input secret;

  signal output identity_commitment;

  identity_commitment <== Poseidon(1)([secret]);
}

