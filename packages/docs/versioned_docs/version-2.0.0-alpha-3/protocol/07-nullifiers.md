# Nullifiers

Nullifiers are used to prevent things from happening more than once. UniRep uses two different nullifiers:

## Epoch key nullifiers

* Ensure a user's epoch keys are unique from any previous epoch
* Prevent users from performing double [user state transitions](05-user-state-transition.md).
* If an epoch key nullifier has been seen before, the second user state transition proof is dropped.
* Nullifier of an epoch key is computed by:

```typescript
hash(
    attesterId,
    fromEpoch,
    identityNullifier
)
```

## Reputation nullifiers

* Prevent users from double spending reputation
* If a reputation nullifier has been seen before, the second reputation proof will not be valid.
* Nullifier of a reputation spent is computed by:

```typescript
hash(
    REPUTATION_NULLIFIER_DOMAIN,
    identityNullifier,
    epoch,
    nonce,
    attesterId
)
```

* The `nonce` can only be within `0` to `posRep-negRep-1` with the given attesterID.
