---
description: Definition of epoch key in UniRep
---

# Epoch Key

* _Epoch keys_ are temporary personas which users use them to interact with others.
* Instead of giving attestations to an `identityCommitment`, a random-value-like `epochKey` is the **receiver** of an attestation.
* Epoch key is computed by

```typescript
hash(identityNullifier, attesterId, epoch, nonce) % 2^epochTreeDepth
```

where `nonce` and be any value between `0` and `numEpochKeyNoncePerEpoch - 1`, so that a user can have `numEpochKeyNoncePerEpoch` epoch keys per epoch.

* Only the user knows his `identityNullifier` so only he knows if he is receiving an attestation, others would see an attestation attesting to a random value.
* In the [epoch key proof](../circuits-api/circuits#epoch-key-proof) circuit a user can prove that they know the `epochKey` and can receive and process attestations given to this `epochKey`.

:::info
See also

* [Epoch](epoch.md)
* [User State Transition](user-state-transition.md)
* [Epoch Key Proof](../circuits-api/circuits.md#epoch-key-proof)
:::
