---
description: The tree structures that are used in UniRep protocol.
---

# Trees

Each attester has a separate version of each tree for each epoch.

## **State tree**

* A state tree stores the updated user state after a user signs up and after a [user state transition](user-state-transition.md) is performed.
* This is an **incremental merkle tree**, with its leaves storing users' `identitySecret`s and starting reputation, e.g.
  * a state tree leaf: `hash(identitySecret, attesterId, epoch, posRep, negRep, graffiti, timestamp)`
  * The default leaf is `0`

:::info
**NOTE:** this is an incremental merkle tree so leaves are inserted from left (leaf index 0) to right, one by one, instead of inserted directly into the specified leaf index.

**NOTE:** since state tree leaf is the hash of `identitySecret` and other values, observers are not able to determine which user has inserted leaves into the tree.
:::

## **Epoch tree**

* An epoch tree is used to **track the reputation received by epoch keys**. Non-repudiability is enforced at the circuit and smart contract level.

* This is an **ordered merkle tree**, with its leaves storing the hash of epoch key and reputation received, e.g.,
  * leaf value: Polysum of `[H(epochKey), H(data[0]), H(data[1]), ... H(data[n]))` using [`EPK_R`](../utils-api/constants#epk_r)

The ordered merkle tree is constructed in ZK at the end of each epoch. For more info see the [ordered merkle tree proof](../circuits-api/circuits#build-ordered-tree).

:::info
See also: [Reputation](reputation.md)
:::
