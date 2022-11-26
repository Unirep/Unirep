---
title: ReputationProof
---

Inherits: [`BaseProof`](/docs/contracts-api/base-proof)

A class representing a reputation proof. Each of the following are accessible as properties on the object.

## epochKey

The epoch key that owns the reputation.

```ts
this.epochKey
```

## stateTreeRoot

The state tree root the user is a member of.

```ts
this.stateTreeRoot
```

## epoch

The epoch the user is proving membership in.

```ts
this.epoch
```

## attesterId

The attester id for the proof.

```ts
this.attesterId
```

## minRep

A minimum amount of net positive reputation the user controls. If this value is 0 the user has chosen not to prove a minimum reputation amount.

Example: Alice has 10 `posRep` and 5 `negRep`. Alice can prove a `minRep` of 2 because she has a net positive reputation of 5.

```ts
this.minRep
```

## proveGraffiti

Whether the user has chosen to prove a graffiti pre-image.

```ts
this.proveGraffiti
```

## graffitiPreImage

The graffiti pre-image controlled by the user. This value is only checked if `proveGraffiti` is truthy.

```ts
this.graffitiPreImage
```
