---
title: ScopeNullifierProof
---

Inherits: [`BaseProof`](base-proof)

A class representing an [scope nullifier proof](circuits#scope-nullifier-proof). Each of the following properties are public signals for the proof.

```ts
import { ScopeNullifierProof } from '@unirep/circuits'

const data = new ScopeNullifierProof(publicSignals, proof)
```

## epochKey

The epoch key being proved.

```ts
this.epochKey
```

## stateTreeRoot

The state tree root the proof was made against. This should be verified to exist onchain when verifying the proof.

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

## sigData

The 32 byte data endorsed by the proof.

```ts
this.sigData
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

## chainId

The chain id for the proof.

```ts
this.chainId
```

## scope

The scope for the proof, which indicates the user will take action on which event/scope.

```ts
this.scope
```

## nullifier

The nullifier for the proof, which is computed by `hash(scope, secret)` in circuit

```ts
this.nullifier
```

## control

The control field used for the proof. This field contains many signals binary encoded into a single 253 bit value. This value is automatically decoded into the other properties on this class.

```ts
this.control
```

## buildControl

Build control from the following parameters:
- `nonce`: `bigint`
- `epoch`: `bigint`
- `attesterId`: `bigint`
- `revealNonce`: `bigint`
- `chainId`: `bigint`

```ts
ScopeNullifierProof.buildControl({
    nonce,
    epoch,
    attesterId,
    revealNonce,
    chainId
})
```
