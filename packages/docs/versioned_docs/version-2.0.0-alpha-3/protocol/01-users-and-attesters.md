# Users and Attesters

## Actors in Unirep

### User 👤

There are users who **receive reputation** and **prove received reputation**.

* Users sign up by calling `userSignUp` in Unirep contract with a signup proof.
* User's `identityCommitment` is revealed at this time and it will be recorded in the contract to prevent double signup.
* The identity commitment will not reveal the actual `identity` of the user but at the same time allow user to prove identity in the circuit.

### Attester 👑

There are attesters who **give attestations** to users and the attestations become the users' reputation. These attesters can be thought of as `applications`.

* Attesters sign up by calling `attesterSignUp` in Unirep contract.
* Attesters are given an `attesterId` that is their contract address.
* Attester information and attestation history are _public_ and so everyone can see what attester submits which attestation to the Unirep contract.
