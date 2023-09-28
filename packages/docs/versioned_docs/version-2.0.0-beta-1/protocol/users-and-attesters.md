# Users and Attesters

## Actors in UniRep

### Users 👤
**receive data** from attesters and are able to **prove received data**.

* Attesters sign up users by calling `userSignUp` on the UniRep contract with a signup proof.
* A user's `identityCommitment` is revealed at this time and recorded in the contract to prevent double signup.
* A user can later prove their identity to the protocol by re-creating the `identity commitment` with the secret values known only to the user.

### Attesters 👑
can be thought of as `applications`. Attesters define their own data systems and are able to **give attestations** to users, which are combined to become the users' data.

* Attesters sign up by calling `attesterSignUp` on the UniRep contract.
* Attesters are given an `attesterId` that is their contract address.
* Attester information and attestation history are _public_; everyone can see each attestation and which attester submitted it to the UniRep contract.
