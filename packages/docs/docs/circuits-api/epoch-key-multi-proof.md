---
title: EpochKeyMultiProof
---

A class representing an [epoch key multi proof](circuits#epoch-key-multi-proof). Each of the following properties are public signals for the proof.

```ts
import { EpochKeyMultiProof } from '@unirep/circuits'

const data = new EpochKeyMultiProof(publicSignals, proof)
```

## epochKey

The two epoch keys being proved. The first entry is the full proof key, the second is the lite proof key.

:::caution
Only the full proof key should be used for attestations. Without a state tree inclusion proof attestations are not non-repudiable; users can choose not to accept the reputation.
:::

```ts
this.epochKey: BigNumberish[2]
```

## epoch

The two epochs being proved. The first entry is the full proof epoch, the second is the lite proof epoch.

```ts
this.epoch: BigNumberish[2]
```

## attesterId

The two attesterIds being proved. The first entry is the full proof attesterId, the second is the lite proof attesterId.

```ts
this.attesterId: BigNumberish[2]
```

## nonce

The two nonces being proved. The first entry is the full proof nonce, the second is the lite proof nonce. These are only set if the `revealNonce` is non-zero.

```ts
this.nonce: BigNumberish[2]
```

## revealNonce

The two revealNonces being proved. The first entry is the full proof revealNonce, the second is the lite proof revealNonce.

```ts
this.revealNonce: BigNumberish[2]
```

## data

The 32 byte data endorsed by the proof.

```ts
this.data: BigNumberish
```

## stateTreeRoot

The state tree root being proven for the first epoch key.

```ts
this.stateTreeRoot: BigNumberish
```

## control

The control fields used for the proof. Full proof then lite proof.

```ts
this.control: BigNumberish[2]
```

## encodeControl

Used to encode control inputs into control fields.

```ts
this.encodeControl(
  fullControl: { epoch: bigint, attesterId: bigint, nonce: bigint, revealNonce: bigint },
  liteControl: { epoch: bigint, attesterId: bigint, nonce: bigint, revealNonce: bigint },
): bigint[2]
```

## decodeControl

Used to decode control inputs into their components.

```ts
this.decodeControl(control: bigint[2]): {
  epoch: bigint,
  attesterId: bigint,
  nonce: bigint,
  revealNonce: bigint
}[2]
```
