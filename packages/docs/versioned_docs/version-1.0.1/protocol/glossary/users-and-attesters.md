# Users and Attesters

## Actors in Unirep

### User 👤

There are users who **receive reputation** and **prove received reputation**.

* Users sign up by calling `userSignUp` in Unirep contract
* User's <font color="green">`identityCommitment`</font> is revealed at this time and it will be recorded in the contract to prevent double signup.
* The identity commitment will not reveal the actual <font color="red">`identity`</font> of the user but at the same time allow user to prove identity in the circuit.

### Attester 👑

There are attesters who **give attestations** to users and the attestations become the users' reputation.

* Attesters sign up by calling `attesterSignUp` in Unirep contract.
* Attesters would be given `attesterId` by the order they sign up, `attesterId` begins with `1`.
* Attester information and attestation history are _public_ and so everyone can see which attester submits which attestation to the Unirep contract.
