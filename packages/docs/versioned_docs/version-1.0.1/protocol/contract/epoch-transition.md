---
description: How an epoch transition is performed in UniRep smart contract.
---

# Epoch transition

While the `block.timestamp - latestEpochTransitionTime >= config.epochLength`, users can perform user state transition to receive reputation and start using another epoch keys.

```solidity
function beginEpochTransition() external
```

{% hint style="info" %}
source: [Unirep.sol/beginEpochTransition](https://github.com/Unirep/Unirep/blob/0067a483e1766645bc9bbf881a3ccdb0b32b8a63/packages/contracts/contracts/Unirep.sol#L497)
{% endhint %}
