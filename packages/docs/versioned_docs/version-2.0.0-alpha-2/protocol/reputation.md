---
description: Definition of reputation in UniRep
---

# Reputation

## Reputation

* The reputation in UniRep protocol includes
  * `posRep`: is the positive reputation given by the attester
  * `negRep`: is the negative reputation given by the attester
  * `graffiti`: is the message given by the attester
  * `timestamp`: is the timestamp the last graffiti was received
* The hash of the reputation is computed by the [Poseidon hash](https://www.poseidon-hash.info/) function.

```typescript
const hashReputation = hash(posRep, negRep, graffiti, timestamp)
```

:::info
Reputation is hashed like this when it is inserted into the epoch tree. See also:

* [Trees](trees.md)
* [User State Transition](user-state-transition.md)
:::
