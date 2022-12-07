---
description: Definition of epoch key in UniRep
---

# Epoch Key

* _Epoch keys_ are temporary personas which users use them to interact with others.
* Instead of giving attestations to an `identityCommitment`, a random-value-like `epochKey` is the **receiver** of an attestation.
* Epoch key is computed by

```typescript
hash2([
    identityNullifier + nonce,
    epoch
]) % BigInt(2 ** epochTreeDepth)
```

:::caution
It would be better to be expressed as
```typescript
hash3([
    identityNullifier,
    nonce,
    epoch
]) % BigInt(2 ** epochTreeDepth)
```
But to save circuit constraints, we put `identityNullifier` and `nonce` in one input field.
:::

where `nonce` and be any value between `0` and `numEpochKeyNoncePerEpoch - 1`, so that a user can have `numEpochKeyNoncePerEpoch` epoch keys per epoch.

* Only the user knows his `identityNullifier` so only he knows if he is receiving an attestation, others would see an attestation attesting to a random value.
* In the [epoch key proof](../circuits/epoch-key-proof.md) circuit user can prove that he knows the `epochKey` and can rightfully receive and process the attestations attested to this `epochKey`.

:::info
See also

* [Epoch](epoch.md)
* [Epoch Transition](epoch-transition.md)
* [User State Transition](user-state-transition.md)
* [Epoch Key Proof](../circuits/epoch-key-proof.md)
:::
