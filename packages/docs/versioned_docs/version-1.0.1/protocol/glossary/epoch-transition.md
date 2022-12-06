---
description: Definition of epoch transition in UniRep
---

# Epoch Transition

* Epoch transition happens when someone calls [`beginEpochTransition()`](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/contracts/contracts/Unirep.sol#L480) and the current block is `epochLength` blocks more since last transitioned block.
* In `beginEpochTransition()`
  * An `EpochEnded` event is emitted and `currentEpoch` increases by 1.

<img src="/img/v1/epoch-increase.png" alt="currentEpoch is increased by one."/>

* After the `EpochEnded` event is emitted, all epoch keys attested during this epoch will have their [hash chain](reputation.md)s sealed
  * by _**sealed**_ it means that the hash chain is hashed again with `1`, e.g., 
    `hash(1, originalHashChain)`
  * if an epoch key received no attestation, it's hash chain would be `hash(1, 0)`

<img src="/img/v1/seal-epk.png" alt="currentEpoch is increased by one."/>

* After hash chain of the epoch keys are sealed, these epoch keys and their hash chain will be inserted into the [epoch tree](trees.md#epoch-tree) of this epoch
  * there's only one epoch tree for every epoch.

<img src="/img/v1/epoch-tree.png" alt=""/>

* There will be a new [global state tree](trees.md#global-state-tree) for each epoch.
* And after epoch transition, user needs to perform [user state transition](user-state-transition.md) to transition his user state into the latest epoch

:::info
See also

* [Epoch](epoch.md)
* [Reputation](reputation.md)
* [Trees](trees.md)
* [User State Transition](user-state-transition.md)
:::
