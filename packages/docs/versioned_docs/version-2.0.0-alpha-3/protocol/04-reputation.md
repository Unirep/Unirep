---
description: Definition of reputation in UniRep
---

# Reputation

Attesters define the reputation system for their application on top of the UniRep reputation standard.

* TODO: describe purpose of using + and - rep values
* Reputation in UniRep protocol includes:
  * `posRep` is the positive reputation given by the attester
  * `negRep` is the negative reputation given by the attester
  * `graffiti` is the message given by the attester
  * `timestamp` is the timestamp the last graffiti was received
* A user can not prove reputation until they have performed a User State Tranistion for the epoch in which the reputaion was received.
* The hash of the reputation is computed by the [Poseidon hash](https://www.poseidon-hash.info/) function.

```typescript
const hashReputation = hash(posRep, negRep, graffiti, timestamp)
```

:::info
Reputation is hashed like this when it is inserted into the epoch tree. See also:

* [Trees](06-trees.md)
* [User State Transition](05-user-state-transition.md)
:::
