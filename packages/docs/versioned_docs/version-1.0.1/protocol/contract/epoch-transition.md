---
description: How an epoch transition is performed in UniRep smart contract.
---

# Epoch transition

While the `block.timestamp - latestEpochTransitionTime >= config.epochLength`, anyone can perform an [epoch transition](../glossary/epoch-transition.md).

```solidity title=contracts/Unirep.sol
function beginEpochTransition() external
```

:::info
source: [Unirep.sol/beginEpochTransition](https://github.com/Unirep/Unirep/blob/5ef3fa8ed70761e0d128fe054bcdb6c72be2f7a1/packages/contracts/contracts/Unirep.sol#L480)
:::
