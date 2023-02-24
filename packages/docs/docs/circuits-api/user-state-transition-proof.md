---
title: UserStateTransitionProof
---

Inherits: [`BaseProof`](base-proof)

A class representing a [user state transition proof](circuits#user-state-transition-proof). Each of the following properties are public signals for the proof.

```ts
import { UserStateTransitionProof } from '@unirep/circuits'

const data = new UserStateTransitionProof(publicSignals, proof)
```

## stateTreeLeaf

The new state tree leaf for the user.

```ts
this.stateTreeLeaf
```

## toEpoch

The epoch the user is transitioning to.

```ts
this.toEpoch
```

## attesterId

The attester id for the proof.

```ts
this.attesterId
```

## historyTreeRoot

A history tree root the user is transitioning with.

```ts
this.historyTreeRoot
```

## transitionNullifier

A globally unique user state transition nullifier. Used to prevent double UST.

```ts
this.transitionNullifier
```
