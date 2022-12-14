# Nullifiers

* Nullifiers are used to prevent things from happening more than once
* UniRep uses two different nullifiers

## Epoch key nullifiers

* Epoch key nullifiers are used to prevent users from using the same epoch key twice and prevent users from double [user state transition](user-state-transition.md).
* If an epoch key nullifier is seen before, then drop the second user state transition proof.
* Nullifier of an epoch key is computed by

```typescript
hash(
    attesterId,
    fromEpoch,
    identityNullifier
)
```