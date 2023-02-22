---
title: UserStateTransitionProof
---

Inherits: [`BaseProof`](base-proof)

A class representing a [user state transition proof](circuits#user-state-transition-proof). Each of the following properties are public signals for the proof.

```ts
import { UserStateTransitionProof } from '@unirep/circuits'

const data = new UserStateTransitionProof(publicSignals, proof)
```

## fromStateTreeRoot

The state tree root in the from epoch the proof was made for.

```ts
this.fromStateTreeRoot
```

## stateTreeLeaf

The new state tree leaf for the user.

```ts
this.stateTreeLeaf
```

## fromEpoch

The epoch the user is transitioning from.

```ts
this.fromEpoch
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

## epochTreeRoot

The epoch tree root from the old epoch.

```ts
this.epochTreeRoot
```
