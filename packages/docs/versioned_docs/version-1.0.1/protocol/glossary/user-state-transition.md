---
description: Definition of user state transition in UniRep protocol.
---

# User State Transition

### Why users have to perform user state transition?

User state transition is used to&#x20;

* Make sure users process their attestations correctly including the bad reputation.
* Generate a new user state in a new epoch to prove the latest reputation.

After user performs user state transition, he can&#x20;

1. Prove the latest reputation status.
2. Generate new epoch key proofs to receive attestations in the latest epoch.

### Workflow of a user state transition

#### 1. User computes epoch key of the latest transition (or sign up) epoch

![Epoch keys are iterated computed in the circuits.](<../../.gitbook/assets/截圖 2022-07-21 下午3.40.29.png>)

#### 2. Update user state tree

![Step 1: update leaf index 3](../../.gitbook/assets/8.png)

![Step 2: update leaf index 1](../../.gitbook/assets/9.png)

#### 3. Check if epoch tree root matches computed hashchains and epoch keys

![](<../../.gitbook/assets/epoch tree (1).png>)

#### 4. Compute a new global state tree leaf

```typescript
const newLeaf = hash(idCommitment, userStateTreeRoot)
```

![How a new global state tree is computed.](<../../.gitbook/assets/截圖 2022-07-22 下午12.15.52.png>)

#### 5. Call unirep smart contract to insert a new global state tree leaf

User performs user state transition by calling [`updateUserStateRoot()`](https://github.com/Unirep/Unirep/blob/f3502e1a551f63ab44b73444b60ead8731d45167/packages/contracts/contracts/Unirep.sol#L559)``

* User will attach a [User State Transition Proof](../../circuits/user-state-transition-proof.md) when calling `updateUserStateRoot`. Others can make sure if the user state transition is correct by verifying the User State Transition Proof.
* Once the user performed user state transition, his user state will be inserted into the [global state tree](trees.md#global-state-tree) of the latest epoch.
* So if a user does not perform user state transition during an epoch, his user state will not be in the global state tree of that epoch.

{% hint style="info" %}
See also

* [Trees](trees.md)
* [Epoch Transition](epoch.md)
* [User State Transition Proof](../../circuits/user-state-transition-proof.md)
{% endhint %}
