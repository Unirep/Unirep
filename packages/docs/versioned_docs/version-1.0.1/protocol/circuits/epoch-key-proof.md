---
description: The zero-knowledge circuit of epoch key proof in UniRep
---

# Epoch Key Proof

[Epoch key](../glossary/epoch-key.md) is computed by

```typescript
hash2([
    identityNullifier + nonce,
    epoch
]) % BigInt(2 ** epochTreeDepth)
```

The epoch key proof in UniRep is used to prove that

1. The epoch key is in the epoch that user claims.
2. The epoch key nonce is between `0` and `numEpochKeyNoncePerEpoch - 1`.
3. The owner of the epoch key has [registered](../glossary/users-and-attesters#user) in UniRep and has performed the [user state transition](../glossary/user-state-transition.md) in the latest epoch. In other words, the user has a leaf in the global state tree.

## Public inputs

* `epoch`: the claimed epoch that the epoch key is in

## Public outputs

* `epoch_key`: the claimed epoch key
* `GST_root`: the global state tree root that the user has a leaf in

## Private inputs

* `nonce`: the nonce of epoch key. It should be in range `[0, numEpochKeyNoncePerEpoch)`
* `identity_nullifier`: the identity that the semaphore protocol uses, and it is also used to generate an epoch key.
* `identity_trapdoor`: the identity trapdoor key that the semaphore protocol uses. The hash output of `identity_nullifier`, and `identity_trapdoor` is the `identity_commitment` and it is used to generate a global state tree leaf by

```typescript
const GST_leaf = hash(identity_commitment, UST_root)
```

* `user_tree_root`: the user state tree root. It is used to compute the global state tree leaf
* `GST_path_index`: the path index routes from leaf to root in the global state tree. It should be either `0` or `1` to indicate if the element is in the right sibling or the left sibling.
* `GST_path_elements`: The sibling node that should be hashed with current path element to get the root.

## Contraints

### 1. Check if user exists in the Global State Tree

Check if `hash(identity_commitment, UST_root)` is one of the leaves in the global state tree of root `GST_root`.

### 2. Check nonce validity

Check if `nonce < EPOCH_KEY_NUM_PER_EPOCH`

### 3. Check epoch key is computed correctly

Check if `epoch_key = hash2([identityNullifier + nonce, epoch]) % BigInt(2 ** epochTreeDepth)`

:::info
See the whole circuit in [circuits/verifyEpochKey.circom](https://github.com/Unirep/Unirep/blob/v1.0.1/packages/circuits/circuits/verifyEpochKey.circom)
:::
