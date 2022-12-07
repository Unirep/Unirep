# Nullifiers

* Nullifiers are used to prevent things from happening more than once
* UniRep uses two different nullifiers

## Epoch key nullifiers

* Epoch key nullifiers are used to prevent users from using the same epoch key twice and prevent users from double [user state transition](user-state-transition.md).
* If an epoch key nullifier is seen before, then drop the second user state transition proof.
* Nullifier of an epoch key is computed by

```typescript
hash2([
    epoch, 
    identityNullifier + nonce
])
```

:::caution
It would be better to be expressed as
```typescript
hash3([
    epoch,
    identityNullifier,
    nonce
]) % BigInt(2 ** epochTreeDepth)
```
But to save circuit constraints, we put `identityNullifier` and `nonce` in one input field. <br/>
**NOTE:** It is similar but not the same as [epoch key](epoch-key.md).
:::

## Reputation nullifiers

* Reputation nullifiers are used to prevent users from double spending the reputation if an action requires users to spend reputation.
* If a reputation nullifier is seen before, then the second reputation proof is recognized invalid.
* Nullifier of a reputation spent is computed by

```typescript
hash4([
    identityNullifier, 
    epoch, 
    nonce, 
    attesterId
])
```

* The `nonce` can only be within `0` to `posRep-negRep-1` with the given attesterID.