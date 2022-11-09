---
description: Definition of epoch in UniRep
---

# Epoch

Each attester can determine an epoch length, in seconds. User epoch keys are valid for 1 epoch.

## Epoch Transition

Epoch transitions happen automatically whenever an attester calls functions in the UniRep contract. The current epoch is defined by the function:

```solidity
(block.timestamp - attester.startTimestamp) / attester.epochLength;
```

This allows epochs to be updated automatically and precisely. When an epoch ends all epoch keys with owed balances must be committed by updating the epoch tree root.

:::info
See also

* [Epoch Key](epoch-key.md)
* [User State Transition](user-state-transition.md)
* [Aggregate Epoch Keys Proof](../circuits-api/circuits.md#aggregate-epoch-keys)
:::
