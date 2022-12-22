# Users and Attesters

## Actors in Unirep

### Users 👤
**receive reputation** from attesters and are able to **prove received reputation**.

* Users sign up by calling `userSignUp` on the Unirep contract with a signup proof.
* A user's `identityCommitment` is revealed at this time and recorded in the contract to prevent double signup.
* A user can later prove their identity to the protocol by re-creating the `identity commitment` with the secret values known only to the user.

### Attesters 👑
can be thought of as `applications`. Attesters define their own reputation systems and are able to **give attestations** to users, which are combined to become the users' reputation.

* Attesters sign up by calling `attesterSignUp` on the Unirep contract.
* Attesters are given an `attesterId` that is their contract address.
* Attester information and attestation history are _public_; everyone can see each attestation and which attester submitted it to the Unirep contract.
