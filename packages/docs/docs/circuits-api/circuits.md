---
title: Circuits
---

A circuits enum is exported from the package.

```ts
enum Circuit {
  epochKey,
  reputation,
  userStateTransition,
  signup,
  epochKeyLite,
  scopeNullifier
}
```

Use it like so:

```ts
import { Circuit } from '@unirep/circuits'
```

## Signup Proof

The signup proof outputs a [state tree](../protocol/trees.md#state-tree) leaf and an [identity commitment](https://semaphore.pse.dev/docs/glossary#identity-commitment) for the user. The state tree leaf will have zero values for all data fields.

Control field:

| chain id | epoch | attester id |
| :--: | :--: | :--: |
| 36 bits | 48 bits | 160 bits |

Inputs:
- `attester_id`
- `epoch`
- `identity_secret`
- `chain_id`

Outputs:
- `commitment`
- `state_tree_leaf`
- `control`

Interface: 
```js
// pragma circom 2.1.0;
// include "PATH/node_modules/@unirep/circuits/circuits/signup.circom"; 
(commitment, state_tree_leaf, control) <== 
  Signup(FIELD_COUNT)(
    attester_id, 
    epoch, 
    identity_secret, 
    chain_id
  );
```

:::info
Control fields are used to encode many small values into a single field element. This reduces the number of public signals needed to operate a circuit.
:::

## Epoch Key Proof

The epoch key proof allows a user to prove control of an epoch key in a certain epoch. This proof calculates tree things: 
1. Merkle inclusion of a state leaf against the current state root
2. An epoch key
3. A data value can be included and endorsed by this proof.

The `nonce` used to calculate the epoch key may optionally be revealed. This can be used to prevent users from executing an action multiple times using different epoch keys.

Control field:

| chain id| reveal nonce | attester id | epoch | nonce |
| :--: | :--: | :--: | :--: | :--: |
| 36 bits| 1 bits| 160 bits | 48 bits | 8 bits |

Inputs:
- `state_tree_indices[STATE_TREE_DEPTH]`
- `state_tree_elements[STATE_TREE_DEPTH]`
- `identity_secret`
- `reveal_nonce`
- `attester_id`
- `epoch`
- `nonce`
- `data[FIELD_COUNT]`
- `sig_data` (public)
- `chain_id`

Outputs:
- `epoch_key`
- `state_tree_root`
- `control`

Interface: 
```js
// pragma circom 2.1.0;
// include "PATH/node_modules/@unirep/circuits/circuits/epochKey.circom"; 
(epoch_key, state_tree_root, control) <== EpochKey(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, FIELD_COUNT)(
  state_tree_indices, 
  state_tree_elements, 
  identity_secret,
  reveal_nonce,
  attester_id,
  epoch,
  nonce,
  data,
  sig_data,
  chain_id
);
```

:::info
Control fields are used to encode many small values into a single field element. This reduces the number of public signals needed to operate a circuit.
:::

## Epoch Key Lite Proof

The epoch key lite proof allows a user to prove control of an epoch key. Unlike the epoch key proof, this proof *does not perform a state tree inclusion*. A data value can be included and endorsed by this proof.

The `nonce` used to calculate the epoch key may optionally be revealed. This can be used to prevent users from executing an action multiple times using different epoch keys.

:::tip
Don't use this proof for keys in the current epoch. If a user has not inserted a leaf into the current state tree they may choose not to accept reputation.

Instead this proof is more useful for proving control of keys from past epochs.
:::

Control field:

| chain id| reveal nonce | attester id | epoch | nonce |
| :--: | :--: | :--: | :--: | :--: |
| 36 bits| 1 bits| 160 bits | 48 bits | 8 bits |

Inputs:
- `identity_secret`
- `reveal_nonce`
- `attester_id`
- `epoch`
- `nonce`
- `sig_data` (public)
- `chain_id`


Outputs:
- `control`
- `epoch_key`

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
  sig_data,
  chain_id
);
```

:::info
Control fields are used to encode many small values into a single field element. This reduces the number of public signals needed to operate a circuit.
:::

## Reputation Proof

The prove reputation proof allows a user to prove a reputation balance in the [state tree](../protocol/trees#state-tree). The user is not able to prove reputation received in the current epoch. The user can optionally prove some minimum amount of reputation, maximum amount of reputation, net zero reputation (e.g. `posRep == negRep`), and their graffiti.

In this proof, we assign 
- `data[0] = posRep`
- `data[1] = negRep`
- `data[SUM_FIELD_COUNT] = graffiti`.

:::info
See [data in UniRep protocol](../protocol/data.md) for more information.
:::

:::danger
**Please avoid assigning the `min_rep = data[0] - data[1]` or `max_rep = data[1] - data[0]`.**<br/>
The proof could allow a user to accidentally publish their overall reputation (i.e. `data[0]-data[1]`). Depending on the circumstances (such as the length of the attestation history) this could reveal a user’s epoch key(s) as well.
:::

The `nonce` used to calculate the epoch key may optionally be revealed. This can be used to prevent users from executing an action multiple times using different epoch keys.

Control field 0:

| chain id| reveal nonce | attester id | epoch | nonce |
| :--: | :--: | :--: | :--: | :--: |
| 36 bits| 1 bits| 160 bits | 48 bits | 8 bits |

Control field 1:

| prove graffiti | prove zero rep| prove max rep | prove min rep | max rep | min rep |
| :--: | :--: | :--: | :--: | :--: | :--: |
| 1 bit | 1 bit| 1 bit | 1 bit | 64 bits | 64 bits |

Inputs:
- `identity_secret`
- `state_tree_indices[STATE_TREE_DEPTH]`
- `state_tree_elements[STATE_TREE_DEPTH]`
- `data[FIELD_COUNT]`
- `prove_graffiti`
- `graffiti` (public)
- `reveal_nonce`
- `attester_id`
- `epoch`
- `nonce`
- `chain_id`
- `min_rep`
- `max_rep`
- `prove_min_rep`
- `prove_max_rep`
- `prove_zero_rep`
- `sig_data` (public)

Outputs:
- `epoch_key`
- `state_tree_root`
- `control[2]`

Interface: 
```js
// pragma circom 2.1.0;
// include "PATH/node_modules/@unirep/circuits/circuits/reputation.circom"; 
(epoch_key, state_tree_root, control) <== Reputation(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, SUM_FIELD_COUNT, FIELD_COUNT, REPL_NONCE_BITS)(
  identity_secret,
  state_tree_indices,
  state_tree_elements,
  data,
  prove_graffiti,
  graffiti,
  reveal_nonce,
  attester_id,
  epoch,
  nonce,
  chain_id,
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

Control field:

| to epoch | attester id | 
| :--: | :--: | 
| 48 bits| 160 bits | 


Inputs:
- `from_epoch`
- `to_epoch`
- `identity_secret`
- `state_tree_indices[STATE_TREE_DEPTH]`
- `state_tree_elements[STATE_TREE_DEPTH]`
- `history_tree_indices[HISTORY_TREE_DEPTH]`
- `history_tree_elements[HISTORY_TREE_DEPTH]`
- `attester_id`
- `data[FIELD_COUNT]`
- `new_data[EPOCH_KEY_NONCE_PER_EPOCH][FIELD_COUNT]`
- `epoch_tree_root`
- `epoch_tree_elements[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_DEPTH]`
- `epoch_tree_indices[EPOCH_KEY_NONCE_PER_EPOCH][EPOCH_TREE_DEPTH]`
- `chain_id`

Outputs:
- `history_tree_root`
- `state_tree_leaf`
- `epks[EPOCH_KEY_NONCE_PER_EPOCH]`
- `control`

Interface: 
```js
// pragma circom 2.1.0;
// include "PATH/node_modules/@unirep/circuits/circuits/userStateTransition.circom"; 
(history_tree_root, state_tree_leaf, epks, control) <== UserStateTransition(
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
  state_tree_indices,
  state_tree_elements,
  history_tree_indices,
  history_tree_elements,
  attester_id,
  data,
  new_data,
  epoch_tree_root,
  epoch_tree_elements,
  epoch_tree_indices,
  chain_id
);
```

## Scope Nullifier Proof

The scope nullifier proof will prevents users from doing the same action within a scope again. It checks if the user has already signed up in a UniRep attester and outputs a scope nullifier.
The nullifier will be computed by `hash(scope, secret)`

Control field:

| chain id| reveal nonce | attester id | epoch | nonce |
| :--: | :--: | :--: | :--: | :--: |
| 36 bits| 1 bits| 160 bits | 48 bits | 8 bits |

Inputs:
- `state_tree_indices[STATE_TREE_DEPTH]`
- `state_tree_elements[STATE_TREE_DEPTH]`
- `reveal_nonce`
- `attester_id`
- `epoch`
- `nonce`
- `sig_data` (public)
- `identity_secret`
- `scope` (public)
- `data[FIELD_COUNT]`
- `chain_id`

Outputs:
- `epoch_key`
- `state_tree_root`
- `control`
- `nullifier`

Interface: 
```js
// pragma circom 2.1.0;
// include "PATH/node_modules/@unirep/circuits/circuits/scopeNullifier.circom"; 
(epoch_key, state_tree_root, control, nullifier) <== ScopeNullifier(STATE_TREE_DEPTH, EPOCH_KEY_NONCE_PER_EPOCH, FIELD_COUNT)(
  state_tree_indices, 
  state_tree_elements,
  reveal_nonce, 
  attester_id,
  epoch,
  nonce,
  sig_data,
  identity_secret,
  scope,
  data,
  chain_id
);
```

:::info
Control fields are used to encode many small values into a single field element. This reduces the number of public signals needed to operate a circuit.
:::