# Nullifiers

Nullifiers are used to prevent things from happening more than once. UniRep uses two different nullifiers:

## Epoch key nullifiers

* Prevent users from using an epoch key to perform the same [user state transition](user-state-transition.md) twice
* If an epoch key nullifier has been seen before, the second user state transition proof is dropped.
* Nullifier of an epoch key is computed by:

```typescript
hash(
    attesterId,
    fromEpoch,
    identityNullifier
)
```