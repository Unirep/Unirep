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
  preventDoubleAction
}
```

Use it like so:

```ts
import { Circuit } from '@unirep/circuits'
```

## Signup Proof

The signup proof outputs a [state tree](../protocol/trees.md#state-tree) leaf and an [identity commitment](https://semaphore.appliedzkp.org/docs/glossary#identity-commitment) for the user. The state tree leaf will have zero values for all data fields.

Control field:
- 48 bits `epoch`
- 160 bits `attester_id`

Inputs:
- `attester_id`
- `epoch`
- `secret`

Outputs:
- `commitment`
- `state_tree_leaf`
- `control`

Interface: 
```js
// pragma circom 2.1.0;
// include "PATH/node_modules/@unirep/circuits/circuits/signup.circom"; 
(commitment, state_tree_leaf, control) <== Signup(FIELD_COUNT)(attester_id, epoch, secret);
```

:::info
Control fields are used to encode many small values into a single field element. This reduces the number of public signals needed to operate a circuit.
:::

## Epoch Key Proof

The epoch key proof allows a user to prove control of an epoch key in a certain epoch. This proof calculates two things: merkle inclusion of a state leaf against the current state root, and an epoch key. A data value can be included and endorsed by this proof.

The `nonce` used to calculate the epoch key may optionally be revealed. This can be used to prevent users from executing an action multiple times using different epoch keys.

Control field:
- 8 bits `nonce`
- 48 bits `epoch`
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

Interface: 
```js
// pragma circom 2.1.0;
// include "PATH/node_modules/@unirep/circuits/circuits/epochKey.circom"; 
(epoch_key, state_tree_root, control) <== EpochKey(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, FIELD_COUNT)(
  state_tree_indexes, 
  state_tree_elements, 
  identity_secret,
  reveal_nonce,
  attester_id,
  epoch,
  nonce,
  data,
  sig_data
);
```

:::info
Control fields are used to encode many small values into a single field element. This reduces the number of public signals needed to operate a circuit.
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
- 48 bits `epoch`
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

Interface: 
```js
// pragma circom 2.1.0;
// include "PATH/node_modules/@unirep/circuits/circuits/epochKeyLite.circom"; 
(control, epoch_key) <== EpochKeyLite(EPOCH_KEY_NONCE_PER_EPOCH)(
  identity_secret,
  reveal_nonce,
  attester_id,
  epoch,
  nonce,
  sig_data
);
```

:::info
Control fields are used to encode many small values into a single field element. This reduces the number of public signals needed to operate a circuit.
:::

## Prove Reputation Proof

The prove reputation proof allows a user to prove a reputation balance in the [state tree](../protocol/trees#state-tree). The user is not able to prove reputation received in the current epoch. The user can optionally prove some minimum amount of reputation, maximum amount of reputation, net zero reputation (e.g. `posRep == negRep`), and their graffiti.

In this proof, we assign `data[0] = posRep`, `data[1] = negRep`, `data[SUM_FIELD_COUNT] = graffiti`.

:::info
See [data in UniRep protocol](../protocol/data.md) for more information.
:::

:::danger
**Please avoid assigning the `min_rep = data[0] - data[1]` or `max_rep = data[1] - data[0]`.**<br/>
The proof could allow a user to accidentally publish their overall reputation (i.e. `data[0]-data[1]`). Depending on the circumstances (such as the length of the attestation history) this could reveal a user’s epoch key(s) as well.
:::

The `nonce` used to calculate the epoch key may optionally be revealed. This can be used to prevent users from executing an action multiple times using different epoch keys.

Control field 0:
- 8 bits `nonce`
- 48 bits `epoch`
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
- `graffiti` (public)
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

Interface: 
```js
// pragma circom 2.1.0;
// include "PATH/node_modules/@unirep/circuits/circuits/proveReputation.circom"; 
(epoch_key, state_tree_root, control) <== ProveReputation(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, SUM_FIELD_COUNT, FIELD_COUNT, REPL_NONCE_BITS)(
  identity_secret,
  state_tree_indexes,
  state_tree_elements,
  data,
  prove_graffiti,
  graffiti,
  reveal_nonce,
  attester_id,
  epoch,
  nonce,
  min_rep,
  max_rep,
  prove_min_rep,
  prove_max_rep,
  prove_zero_rep,
  sig_data
);
```

:::info
Control fields are used to encode many small values into a single field element. This reduces the number of public signals needed to operate a circuit.
:::

## User State Transition Proof

The user state transition proof allows a user to prove how much reputation they have at the end of an epoch and output a new state tree leaf. The proof calculates an inclusion proof for the state tree, and for each epoch key nonce an inclusion proof for the epoch tree. If the epoch key does not exist in the epoch tree it is instead output as a public signal. If the epoch key does exist in the tree a random value will be output instead. The verifier _must_ check that the output epoch keys are not included in the epoch tree.

Once it has proved inclusion it sums the reputation values stored in the leaves. Then it takes the replacement values with the highest timestamps and outputs a new state tree leaf for the next epoch.

<!-- TODO: add a graphic for this -->

Inputs:
- `identity_secret`
- `from_epoch`
- `to_epoch` (public)
- `attester_id` (public)
- `epoch_tree_root`
- `state_tree_indexes[STATE_TREE_DEPTH]`
- `state_tree_elements[STATE_TREE_DEPTH]`
- `data[FIELD_COUNT]`
- `new_data[EPOCH_KEY_NONCE_PER_EPOCH][FIELD_COUNT]`
- `epoch_tree_elements[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_DEPTH]`
- `epoch_tree_indices[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_DEPTH]`
- `history_tree_indices[HISTORY_TREE_DEPTH]`
- `history_tree_elements[HISTORY_TREE_DEPTH]`

Outputs:
- `history_tree_root`
- `state_tree_leaf`
- `epks[EPOCH_KEY_NONCE_PER_EPOCH]`

Interface: 
```js
// pragma circom 2.1.0;
// include "PATH/node_modules/@unirep/circuits/circuits/userStateTransition.circom"; 
(history_tree_root, state_tree_leaf, epks) <== UserStateTransition(
  STATE_TREE_DEPTH,
  EPOCH_TREE_DEPTH,
  HISTORY_TREE_DEPTH,
  EPOCH_KEY_NONCE_PER_EPOCH,
  FIELD_COUNT,
  SUM_FIELD_COUNT,
  REPL_NONCE_BITS
)(
  from_epoch,
  to_epoch,
  identity_secret,
  state_tree_indexes,
  state_tree_elements,
  history_tree_indices,
  history_tree_elements,
  attester_id,
  data,
  new_data,
  epoch_tree_root,
  epoch_tree_elements,
  epoch_tree_indices
);
```