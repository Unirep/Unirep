---
description: Definition of reputation in UniRep
---

# Reputation

Attesters define the reputation system for their application on top of the UniRep protocol.

Storing positive and negative reputation separately, we can represent net negative reputation values without using signed integers in contracts/circuits. E.g. if a user has -10 reputation, we can represent this using positive values only by saying they have 100 positive reputation and 110 negative reputation.

* Reputation in UniRep protocol includes:
  * `posRep` is the positive reputation given by the attester
  * `negRep` is the negative reputation given by the attester
  * `graffiti` is the message given by the attester
    * Attesters can choose how they use this data. E.g. a user can be given a username as graffiti.
  * `timestamp` is the timestamp the last graffiti was received
* A user can not prove reputation until they have performed a User State Transition for the epoch in which the reputation was received.
* The hash of the reputation is computed by the [Poseidon hash](https://www.poseidon-hash.info/) function.

```typescript
const hashReputation = hash(epochKey, posRep, negRep, graffiti, timestamp)
```

:::info
Reputation is hashed like this when it is inserted into the epoch tree. See also:

* [Trees](trees.md)
* [User State Transition](user-state-transition.md)
:::
