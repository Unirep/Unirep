---
title: Circuits
---

A circuits enum is exported from the package.

```ts
enum Circuit {
  epochKey,
  proveReputation,
  userStateTransition,
  signup,
  epochKeyLite,
  buildOrderedTree
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
- `nonce`
- `epoch`
- `attester_id`
- `reveal_nonce`
- `data[FIELD_COUNT]`
- `state_tree_indexes[STATE_TREE_DEPTH]`
- `state_tree_elements[STATE_TREE_DEPTH]`
- `identity_secret`
- `sig_data` (public)

Outputs:
- `epoch_key`
- `state_tree_root`
- `control`

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
- `nonce`
- `epoch`
- `attester_id`
- `reveal_nonce`
- `sig_data` (public)
- `identity_secret`

Outputs:
- `epoch_key`
- `control`

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

Control field 1:
- 64 bits `min_rep`
- 64 bits `max_rep`
- 1 bit `prove_min_rep`
- 1 bit `prove_max_rep`
- 1 bit `prove_zero_rep`
- 1 bit `prove_graffiti`

Inputs:
- `identity_secret`
- `graffiti_pre_image` (public)
- `state_tree_indexes[STATE_TREE_DEPTH]`
- `state_tree_elements[STATE_TREE_DEPTH]`
- `data[FIELD_COUNT]`
- `nonce`
- `epoch`
- `attester_id`
- `reveal_nonce`
- `sig_data` (public)

Outputs:
- `epoch_key`
- `state_tree_root`
- `control[2]`

:::info
Control fields are use to encode many small values into a single field element. This reduces the number of public signals needed to operate a circuit.
:::

## User State Transition Proof

The user state transition proof allows a user to prove how much reputation they have at the end of an epoch and output a new state tree leaf. The proof calculates an inclusion proof for the state tree, and for each epoch key nonce an inclusion or noninclusion proof for the epoch tree. If neither inclusion nor noninclusion is proven for the epoch tree, the value `0` is output for the epoch tree root. The epoch tree root is `0` when no attestations are made in an epoch.

Once it has proved inclusion/noninclusion it sums the reputation values stored in the leaves. Then it takes the graffiti value with the highest timestamp and outputs a new state tree leaf for the next epoch.

This proof makes multiple inclusion proofs in the same tree path for inclusion/noninclusion. To do this efficiently we prove first the subtree, then for each inclusion/noninclusion we prove against the bottom of the subtree. This avoids having to do multiple full merkle proofs.

TODO: add a graphic for this

Inputs:
- `identity_secret`
- `from_epoch` (public)
- `to_epoch` (public)
- `attester_id` (public)
- `epoch_tree_root` (public)
- `state_tree_indexes[STATE_TREE_DEPTH]`
- `state_tree_elements[STATE_TREE_DEPTH]`
- `data[FIELD_COUNT]`
- `new_data[EPOCH_KEY_NONCE_PER_EPOCH][FIELD_COUNT]`
- `epoch_tree_elements[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_DEPTH - 1][EPOCH_TREE_ARITY]`
- `epoch_tree_indices[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_DEPTH - 1]`
- `noninclusion_leaf[EPOCH_KEY_NONCE_PER_EPOCH][2]`
- `noninclusion_leaf_index[EPOCH_KEY_NONCE_PER_EPOCH]`
- `noninclusion_elements[EPOCH_KEY_NONCE_PER_EPOCH][2][EPOCH_TREE_ARITY]`
- `inclusion_leaf_index[EPOCH_KEY_NONCE_PER_EPOCH]`
- `inclusion_elements[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_ARITY]`

Outputs:
- `state_tree_root`
- `state_tree_leaf`
- `transition_nullifier`
- `epoch_tree_root`

## Build Ordered Tree

The build ordered tree proof takes a list of leaf pre-images and asserts that the leaf hashes are sorted in ascending order. It then puts the leaves into a tree and outputs the root and a checksum using [polysum](../protocol/polysum).

Each leaf of the tree is computed using `Poseidon1` of each element combined using a polysum. If the first element of the pre-image is `0` or `1` the pre-image is ignore and the value `0` or `SNARK_SCALAR_FIELD - 1` is used for the leaf respectively.

We can prove non-inclusion in an ordered tree by proving that for an element `e` there exist two elements `a` and `b` next to each other in the tree where `a < e < b`.

Constants:
- `OMT_R`: The constant used for ordered merkle tree polysum checksum calculation.

Inputs:
- `sorted_leaf_preimages[TREE_ARITY**TREE_DEPTH][FIELD_COUNT + 1]`
- `leaf_r_values[TREE_ARITY**TREE_DEPTH]`

Outputs:
- `root`
- `checksum`
