---
description: The zero-knowledge circuit of reputation proof in UniRep
---

# Reputation Proof

Users can use a reputation proof to claim that how the reputation is from a given attester. There are following things that user can choose to prove:

1.  The `pos_rep - neg_rep` given by the attester is more than the claimed `min_rep` i.e.

    ```
    (pos_rep - neg_rep) > min_rep
    ```
2.  The `graffiti_preimage` of a `graffiti` i.e.

    ```
    hash(graffiti_preimage) == graffiti
    ```
3.  The [reputation nullifiers](../protocol/glossary/nullifiers.md#reputation-nullifiers) are computed correctly i.e.

    ```
    // for all nonces
    nonce >= 0
    nonce < pos_rep - neg_rep
    reputation_nullifiers = hash5(
        REPUTATION_NULLIFIER_DOMAIN, 
        identity_nullifier, 
        epoch, 
        nonce, 
        attesterId
    )
    ```

The circuit also checks if the user has [registered](https://unirep.gitbook.io/unirep/protocol/glossary/users-and-attesters#user) and performed [user state transition](../protocol/glossary/user-state-transition.md) in the claimed epoch.

## Public inputs

* `epoch`
* `epoch_key`
* `GST_root`
* `attester_id`
* `rep_nullifiers_amount`
* `min_rep`
* `prove_graffiti`
* `graffiti_pre_image`

## Public outputs

* `rep_nullifiers`

## Private inputs

* `epoch_key_nonce`
* `identity_nullifier`
* `identity_trapdoor`
* `user_tree_root`
* `GST_path_index`
* `GST_path_elements`
* `pos_rep`
* `neg_rep`
* `graffiti`
* `sign_up`
* `UST_path_elements`
* `selectors`
* `rep_nonce`

## Contraints

### 1. Check if user exists in the Global State Tree and verify epoch key

Check the constrains in epoch key proof.

{% hint style="info" %}
See: [Epoch Key Proof circuit](epoch-key-proof.md)
{% endhint %}

### 2. Check if the reputation given by the attester is in the user state tree

Check if `hash(pos_rep, neg_rep, graffiti, sign_up)` is one of the leaves in the user state tree of root `user_tree_root`.

### 3. Check if reputation nullifiers are valid

Check if `rep_nonce[i] < pos_rep - neg_rep` for all output `rep_nullifiers[i]`.

Check if&#x20;

```javascript
rep_nullifier[i] = hash(
    REPUTATION_NULLIFIER_DOMAIN = 2, 
    identity_nullifier, 
    epoch, 
    rep_nonce[i], 
    attester_id
)
```

{% hint style="info" %}
See: [Reputation nullifiers](../protocol/glossary/nullifiers.md#reputation-nullifiers)
{% endhint %}

### 4. Check if user has reputation greater than `min_rep`

Check if&#x20;

1. `min_rep > 0`&#x20;
2. `pos_rep - neg_rep >= 0`
3. `pos_rep - neg_rep >= min_rep`

### 5. Check pre-image of graffiti

Check if `hash(graffiti_pre_image) == graffiti`.

{% hint style="info" %}
See the whole circuit in [circuits/proveReputation.circom](https://github.com/Unirep/Unirep/blob/main/packages/circuits/circuits/proveReputation.circom)
{% endhint %}
