---
description: The zero-knowledge circuit of user sign up proof in UniRep
---

# User Sign Up Proof

The user sign up proof is used to indicate if the user has a valid membership from an attester. Attesters can send a [reputation](../glossary/reputation.md) with a `signUp` flag to authenticate the user. Once the attester has signed the user up, the sign up flag will not be changed (in the current version).

In the current version, the user sign up proof is used to give users the reputation airdrop. Once the users are authenticated by an attester, the user can get the airdrop from the attester. Then the users also need epoch keys to receive reputation from the attester.

The idea of the user sign up proof (or called the airdrop proof) is to prevent the same user from obtaining airdrop twice in the same epoch. As a result, the airdrop proof output an epoch key a fix the nonce to `0`.

Therefore, the proof checks that

1. If the user has a sign-up flag from a given attester.
2. The user has [registered](../glossary/users-and-attesters#user) in UniRep and has performed the [user state transition](../glossary/user-state-transition.md) in the latest epoch. In other words, the user has a leaf in the global state tree.
3. If the sign up proof epoch matches the current epoch.
4. If the output epoch key is computed with the `nonce = 0`

## Public inputs

* `epoch`
* `attester_id`
* `sign_up`

## Public outputs

* `epoch_key`
* `GST_root`

## Private inputs

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

:::info
**NOTE:** No epoch key nonce is given.
:::

## Contraints

### 1. Check if user exists in the Global State Tree and verify epoch key

Check the constrains in epoch key proof.

:::info
See: [Epoch Key Proof circuit](epoch-key-proof.md)
:::

### 2. Check if the reputation given by the attester is in the user state tree

Check if `hash(pos_rep, neg_rep, graffiti, sign_up)` is one of the leaves in the user state tree of root `user_tree_root`.

:::info
See the whole circuit in [circuits/proveUserSignUp.circom](https://github.com/Unirep/Unirep/blob/v1.0.1/packages/circuits/circuits/proveUserSignUp.circom)
:::
