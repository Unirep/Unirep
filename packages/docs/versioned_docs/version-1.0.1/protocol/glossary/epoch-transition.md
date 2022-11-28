---
description: Definition of epoch transition in UniRep
---

# Epoch Transition

* Epoch transition happens when someone calls [`beginEpochTransition()`](https://github.com/Unirep/Unirep/blob/f3502e1a551f63ab44b73444b60ead8731d45167/packages/contracts/contracts/Unirep.sol#L468) and the current block is `epochLength` blocks more since last transitioned block.
* In `beginEpochTransition()`
  * An `EpochEnded` event is emitted and `currentEpoch` increases by 1.

![currentEpoch is increased by one.](<../../.gitbook/assets/截圖 2022-07-22 上午11.58.55.png>)

* After the `EpochEnded` event is emitted, all epoch keys attested during this epoch will have their [hash chain](reputation.md) sealed
  * by _**sealed**_ it means that the hash chain is hashed again with `1`, e.g., \
    `hash(1, originalHashChain)`
  * if an epoch key received no attestation, it's hash chain would be `hash(1, 0)`

![](<../../.gitbook/assets/截圖 2022-07-22 上午11.59.45.png>)

* After hash chain of the epoch keys are sealed, these epoch keys and their hash chain will be inserted into the [epoch tree](trees.md#epoch-tree) of this epoch
  * there's only one epoch tree for every epoch.

![](<../../.gitbook/assets/epoch tree (1).png>)

* There will be a new [global state tree](trees.md#global-state-tree) for each epoch.
* And after epoch transition, user needs to perform [user state transition](user-state-transition.md) to transition his user state into the latest epoch

{% hint style="info" %}
See also

* [Epoch](epoch.md)
* [Reputation](reputation.md)
* [Trees](trees.md)
* [User State Transition](user-state-transition.md)
{% endhint %}
