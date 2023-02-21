---
description: Definition of epoch in UniRep
---

# Epoch
An epoch is a cycle in the UniRep system, each with an updated state tree and epoch tree. Each attester determines their own epoch length, in seconds. User epoch keys can receive attestations during 1 epoch. With each transition, the reputation balances of all users are finalized and carried over into the next epoch.

## Epoch Transition

Epoch transitions happen automatically whenever an attester calls functions in the UniRep contract. The current epoch is defined by the function:

```solidity
(block.timestamp - attester.startTimestamp) / attester.epochLength;
```

This allows epochs to be updated automatically and precisely. When an epoch ends, all epoch keys with owed balances must be committed by updating the epoch tree root.

:::info
See also

* [Trees](trees.md)
* [Epoch Key](epoch-key.md)
* [User State Transition](user-state-transition.md)
* [Build Ordered Tree Proof](../circuits-api/circuits.md#build-ordered-tree)
:::
