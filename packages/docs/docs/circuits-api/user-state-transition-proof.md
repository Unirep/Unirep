---
title: UserStateTransitionProof
---

Inherits: [`BaseProof`](base-proof)

A class representing a [user state transition proof](circuits#user-state-transition-proof). Each of the following properties are public signals for the proof.

```ts
import { UserStateTransitionProof } from '@unirep/circuits'

const data = new UserStateTransitionProof(publicSignals, proof)
```

## historyTreeRoot

The [history tree](../protocol/trees.md#history-tree) root being proven against.

```ts
this.historyTreeRoot
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

## chainId

The chain id for the proof.

```ts
this.chainId
```

## epochKeys

The epoch keys that are output as public signals. These should be verified to not exist in the epoch tree.

```ts
this.epochKeys
```

## control

The control field used for the proof. This field contains many signals binary encoded into a single 253 bit value. This value is automatically decoded into the other properties on this class.

```ts
this.control
```

## buildControl

Build control from the following parameters:
- `toEpoch`: `bigint`
- `attesterId`: `bigint`

```ts
UserStateTransitionProof.buildControl({
    toEpoch,
    attesterId,
})
```
