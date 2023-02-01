# Nullifiers

Nullifiers are used to prevent things from happening more than once. UniRep uses two different nullifiers:

## User State Transition Nullifier

* Prevent users from performing duplicate [user state transition](user-state-transition.md)
* UST Nullifier is computed by:

```typescript
hash(
    attesterId,
    fromEpoch,
    identitySecret
)
```
