---
title: Circuits
---

A circuits enum is exported from the package.

```ts
enum Circuit {
  verifyEpochKey,
  proveReputation,
  userStateTransition,
  signup,
  aggregateEpochKeys,
  epochKeyLite,
}
```

Use it like so:

```ts
import { Circuit } from '@unirep/circuits'
```

## Signup Proof

The signup proof outputs a state tree leaf and an identity commitment for the user. The state tree leaf will have zero values for positive and negative reputation.

Inputs:
- `attester_id` (public)
- `epoch` (public)
- `identity_nullifier`
- `identity_trapdoor`

Outputs:
- `identity_commitment`
- `state_tree_leaf`

## Epoch Key Proof

The epoch key proof allows a user to prove control of an epoch key in a certain epoch. This proof calculates two things: merkle inclusion of a state leaf against the current state root, and an epoch key. A data value can be included and endorsed by this proof.

The `nonce` used to calculate the epoch key may optionally be revealed. This can be used to prevent users from executing an action multiple times using different epoch keys.

Control field:
- 8 bits `nonce`
- 64 bits `epoch`
- 160 bits `attester_id`
- 1 bit `reveal_nonce`

Inputs:
- `control`
- `data` (public)
- `pos_rep`
- `neg_rep`
- `graffiti`
- `timestamp`
- `state_tree_indexes[STATE_TREE_DEPTH]`
- `state_tree_elements[STATE_TREE_DEPTH]`
- `identity_nullifier`

Outputs:
- `epoch_key`
- `state_tree_root`
- `control_output`

:::info
Control fields are use to encode many small values into a single field element. This reduces the number of public signals needed to operate a circuit.
:::

## Epoch Key Lite Proof

The epoch key lite proof allows a user to prove control of an epoch key. Unlike the epoch key proof, this proof does not perform a state tree inclusion. A data value can be included and endorsed by this proof.

The `nonce` used to calculate the epoch key may optionally be revealed. This can be used to prevent users from executing an action multiple times using different epoch keys.

:::tip
Don't use this proof for keys in the current epoch. If a user has not inserted a leaf into the current state tree they may choose not to accept reputation.

Instead this proof is more useful for proving control of keys from past epochs.
:::

Control field:
- 8 bits `nonce`
- 64 bits `epoch`
- 160 bits `attester_id`
- 1 bit `reveal_nonce`

Inputs:
- `control`
- `data` (public)
- `identity_nullifier`

Outputs:
- `epoch_key`
- `control_output`

:::info
Control fields are use to encode many small values into a single field element. This reduces the number of public signals needed to operate a circuit.
:::

## Prove Reputation Proof

The prove reputation proof allows a user to prove a reputation balance in the [state tree](../protocol/trees#state-tree). The user is not able to prove reputation received in the current epoch. The user can optionally prove some minimum amount of reputation, maximum amount of reputation, net zero reputation (e.g. `posRep == negRep`), and their graffiti pre-image.

The `nonce` used to calculate the epoch key may optionally be revealed. This can be used to prevent users from executing an action multiple times using different epoch keys.

Control field 0:
- 8 bits `nonce`
- 64 bits `epoch`
- 160 bits `attester_id`
- 1 bit `reveal_nonce`
- 1 bit `prove_graffiti`

Control field 1:
- 64 bits `min_rep`
- 64 bits `max_rep`
- 1 bit `prove_min_rep`
- 1 bit `prove_max_rep`
- 1 bit `prove_zero_rep`

Inputs:
- `control[2]`
- `graffiti_pre_image` (public)
- `state_tree_indexes[STATE_TREE_DEPTH]`
- `state_tree_elements[STATE_TREE_DEPTH]`
- `pos_rep`
- `neg_rep`
- `graffiti`
- `timestamp`
- `nonce`

Outputs:
- `epoch_key`
- `state_tree_root`

:::info
Control fields are use to encode many small values into a single field element. This reduces the number of public signals needed to operate a circuit.
:::

## User State Transition Proof

The user state transition proof allows a user to prove how much reputation they have at the end of an epoch and output a new state tree leaf. The proof calculates an inclusion proof for the state tree, and for each epoch key nonce an inclusion proof for the epoch tree.

Once it has proved inclusion it sums the reputation values stored in the leaves. Then it takes the graffiti value with the highest timestamp value and outputs a new state tree leaf for the next epoch.

Inputs:
- `from_epoch` (public)
- `to_epoch` (public)
- `attester_id` (public)
- `epoch_tree_root` (public)
- `identity_nullifier`
- `state_tree_indexes[STATE_TREE_DEPTH]`
- `state_tree_elements[STATE_TREE_DEPTH]`
- `pos_rep`
- `neg_rep`
- `graffiti`
- `timestamp`
- `new_pos_rep[EPOCH_KEY_NONCE_PER_EPOCH]`
- `new_neg_rep[EPOCH_KEY_NONCE_PER_EPOCH]`
- `new_graffiti[EPOCH_KEY_NONCE_PER_EPOCH]`
- `new_timestamp[EPOCH_KEY_NONCE_PER_EPOCH]`
- `epoch_tree_elements[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_DEPTH]`

Outputs:
- `state_tree_root`
- `state_tree_leaf`
- `transition_nullifier`

## Aggregate Epoch Keys

Only the root of the epoch tree is stored on chain. This proof allows multiple leaves to be added or updated in the tree using a single proof. This proof is used to update the epoch tree root onchain root.

Constants:
- `KEY_COUNT`: The max number of keys to update per proof.

Inputs:
- `start_root` (public)
- `epoch`
- `attester_id`
- `hashchain_index`
- `path_elements[KEY_COUNT][EPOCH_TREE_DEPTH]`
- `epoch_keys[KEY_COUNT]`
- `epoch_key_balances[KEY_COUNT][4]`
- `old_epoch_key_hashes[KEY_COUNT]`
- `epoch_key_count`

Outputs:
- `to_root`
- `hashchain`
