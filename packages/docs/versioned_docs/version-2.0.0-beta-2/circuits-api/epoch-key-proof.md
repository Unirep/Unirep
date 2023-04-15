---
title: EpochKeyProof
---

Inherits: [`BaseProof`](base-proof)

A class representing an [epoch key proof](circuits#epoch-key-proof). Each of the following properties are public signals for the proof.

```ts
import { EpochKeyProof } from '@unirep/circuits'

const data = new EpochKeyProof(publicSignals, proof)
```

## epochKey

The epoch key being proved.

```ts
this.epochKey
```

## stateTreeRoot

The state tree root the proof was made against. This should be verified to exist onchain. When verifying the proof.

```ts
this.stateTreeRoot
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

## data

The 32 byte data endorsed by the proof.

```ts
this.data
```

## revealNonce

A number indicating whether the epoch key nonce was revealed in the proof. This value will be either `1` or `0`.

```ts
this.revealNonce
```

## nonce

The nonce used to generate the epoch key. To determine if this value is set check that `revealNonce == 1`.

```ts
this.nonce
```

## control

The control field used for the proof. This field contains many signals binary encoded into a single 256 bit value. This value is automatically decoded into the other properties on this class.

```ts
this.control
```
