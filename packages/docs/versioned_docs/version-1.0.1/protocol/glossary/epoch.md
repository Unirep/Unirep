---
description: Definition of epoch in UniRep
---

# Epoch

* There is the notion of **epoch** in Unirep. Every `epochLength` blocks, one epoch ends and next epoch begins.
* The epoch starts with 1. After an [epoch transition](epoch-transition.md), in other words, after an amount of blocks and someone performs `epochTransition()` in the UniRep smart contract, the `currentEpoch` increases by 1.

:::info
See also

* [Epoch Key](epoch-key.md)
* [Epoch Transition](epoch-transition.md)
* [User State Transition](user-state-transition.md)
:::
