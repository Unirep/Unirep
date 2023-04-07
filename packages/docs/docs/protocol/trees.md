---
description: The tree structures that are used in UniRep protocol.
---

# Trees

Each attester has a single epoch and state tree that is progressively overwritten each epoch.

## **State tree**

* The state tree stores the updated user state after a user signs up and after a [user state transition](user-state-transition.md) is performed.
* This is an **incremental merkle tree**, with its leaves storing users' `identitySecret`s and starting data, e.g.
  * a state tree leaf: `hash(identitySecret, attesterId, epoch, H(data))`
  * The default state tree leaf is `0`

:::info
**NOTE:** this is an incremental merkle tree so leaves are inserted from left (leaf index 0) to right, one by one, instead of inserted directly into the specified leaf index.

**NOTE:** since state tree leaf is the hash of `identitySecret` and other values, observers are not able to determine which user has inserted leaves into the tree.
:::

## **Epoch tree**

* An epoch tree is used to **track the data received by epoch keys**. Non-repudiability is enforced at the circuit and smart contract level.

* This is an **incremental merkle tree**, with its leaves storing the hash of epoch key and data received, e.g.,
  * leaf value: `H(epochKey, H(data[0]), H(data[1]), ... H(data[n]))`

The epoch tree exists onchain and is overwritten each epoch. Only the tree root is stored.

:::info
See also: [Data](data.md)
:::

## **History tree**

* The history tree tracks valid combinations of state tree roots and epoch tree roots. When an epoch ends an entry is added.

* This is an **incremental merkle tree** with it's leaves storing the hash of a state tree root and epoch tree root
  * leaf value: `H(stateTreeRoot, epochTreeRoot)`

The history tree exists onchain. Each attester has their own history tree.
