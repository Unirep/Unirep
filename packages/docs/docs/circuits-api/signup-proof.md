---
title: SignupProof
---

Inherits: [`BaseProof`](base-proof)

A class representing a [signup proof](circuits#signup-proof). Each of the following properties are public signals for the proof.

```ts
import { SignupProof } from '@unirep/circuits'

const data = new SignupProof(publicSignals, proof)
```

## identityCommitment

The identity commitment for the user signing up.

```ts
this.identityCommitment
```

## stateTreeLeaf

The new state tree leaf for the user. This leaf will contain zero values for `posRep`, `negRep`, and `graffiti`.

```ts
this.stateTreeLeaf
```

## epoch

The epoch the proof was made within.

```ts
this.epoch
```

## attesterId

The attester id for the proof.

```ts
this.attesterId
```

## control

The control field used for the proof. This field contains many signals binary encoded into a single 256 bit value. This value is automatically decoded into the other properties on this class.

```ts
this.control
```