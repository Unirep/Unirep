---
title: EpochKeyProof
---

Inherits: [`BaseProof`](base-proof)

A class representing an epoch key proof. Each of the following properties are public signals for the proof.

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
