---
description: Definition of epoch key in UniRep
---

# Epoch Key

* Unique epoch keys are generated for each user in each epoch.
* They are the users' temporary personas, allowing anonymous interaction with others.
* Instead of giving attestations to an `identityCommitment`, an ever-changing, random-value-like `epochKey` is the **receiver** of an attestation.
* An epoch key is computed by:

```typescript
hash(identityNullifier, attesterId, epoch, nonce) % 2^epochTreeDepth
```

where `nonce` can be any value between `0` and `numEpochKeyNoncePerEpoch - 1`, so that a user can have `numEpochKeyNoncePerEpoch` epoch keys per epoch.

* Only a user knows their `identityNullifier`, so only they know if they have received an attestation; others see an attestation given to a random value.
* In the [epoch key proof](../circuits-api/circuits#epoch-key-proof) circuit, a user can prove that they own an `epochKey`, and so are able to receive and process attestations given to that `epochKey`.

:::info
See also

* [Epoch](epoch.md)
* [User State Transition](user-state-transition.md)
* [Epoch Key Proof](../circuits-api/circuits.md#epoch-key-proof)
:::
