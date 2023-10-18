---
id: "src.ReputationProof"
title: "Class: ReputationProof"
sidebar_label: "ReputationProof"
custom_edit_url: null
---

[src](../modules/src.md).ReputationProof

The reputation proof structure that helps to query the public signals

## Hierarchy

- [`BaseProof`](src.BaseProof.md)

  ↳ **`ReputationProof`**

## Constructors

### constructor

• **new ReputationProof**(`publicSignals`, `proof`, `prover?`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `publicSignals` | (`string` \| `bigint`)[] | The public signals of the reputation proof that can be verified by the prover |
| `proof` | `SnarkProof` | The proof that can be verified by the prover |
| `prover?` | [`Prover`](../interfaces/src.Prover.md) | The prover that can verify the public signals and the proof |

**`Example`**

```ts
import { ReputationProof } from '@unirep/circuits'
const data = new ReputationProof(publicSignals, proof)
```

#### Overrides

[BaseProof](src.BaseProof.md).[constructor](src.BaseProof.md#constructor)

#### Defined in

[circuits/src/ReputationProof.ts:114](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/ReputationProof.ts#L114)

## Properties

### \_snarkProof

• `Readonly` **\_snarkProof**: `SnarkProof`

The proof data in [`SnarkProof`](https://developer.unirep.io/docs/utils-api/interfaces/SnarkProof.md) format. Use this when manually verifying with `snarkjs`.

#### Inherited from

[BaseProof](src.BaseProof.md).[_snarkProof](src.BaseProof.md#_snarkproof)

#### Defined in

[circuits/src/BaseProof.ts:24](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/BaseProof.ts#L24)

___

### attesterId

• **attesterId**: `bigint`

The attester id for the proof.

#### Defined in

[circuits/src/ReputationProof.ts:67](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/ReputationProof.ts#L67)

___

### chainId

• **chainId**: `bigint`

The chain id for the proof.

#### Defined in

[circuits/src/ReputationProof.ts:75](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/ReputationProof.ts#L75)

___

### circuit

• `Protected` `Optional` **circuit**: [`Circuit`](../enums/src.Circuit.md)

The string name of the type of circuit this proof came from. For the `BaseProof` class this is undefined.

#### Inherited from

[BaseProof](src.BaseProof.md).[circuit](src.BaseProof.md#circuit)

#### Defined in

[circuits/src/BaseProof.ts:28](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/BaseProof.ts#L28)

___

### control0

• **control0**: `bigint`

The control field used for the proof. This field contains many signals binary encoded into a single 253 bit value. This value is automatically decoded into the other properties on this class.
See the [circuit documentation](https://developer.unirep.io/docs/circuits-api/circuits) for more information.

#### Defined in

[circuits/src/ReputationProof.ts:39](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/ReputationProof.ts#L39)

___

### control1

• **control1**: `bigint`

The control field used for the proof. This field contains many signals binary encoded into a single 253 bit value. This value is automatically decoded into the other properties on this class.
See the [circuit documentation](https://developer.unirep.io/docs/circuits-api/circuits) for more information.

#### Defined in

[circuits/src/ReputationProof.ts:44](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/ReputationProof.ts#L44)

___

### data

• **data**: `bigint`

The signature data included for the proof.

#### Defined in

[circuits/src/ReputationProof.ts:53](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/ReputationProof.ts#L53)

___

### epoch

• **epoch**: `bigint`

The epoch the proof was made within.

#### Defined in

[circuits/src/ReputationProof.ts:63](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/ReputationProof.ts#L63)

___

### epochKey

• **epochKey**: `bigint`

The epoch key that owns the reputation.

#### Defined in

[circuits/src/ReputationProof.ts:30](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/ReputationProof.ts#L30)

___

### graffiti

• **graffiti**: `bigint`

The graffiti controlled by the user, which is defined by `data[SUM_FIELD_COUNT] % (2 ** REPL_NONCE_BITS)` in the circuits. This value is only checked if `proveGraffiti` is non-zero.

#### Defined in

[circuits/src/ReputationProof.ts:49](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/ReputationProof.ts#L49)

___

### idx

• `Readonly` **idx**: `Object`

The index of the data in the public signals

#### Type declaration

| Name | Type |
| :------ | :------ |
| `control0` | `number` |
| `control1` | `number` |
| `data` | `number` |
| `epochKey` | `number` |
| `graffiti` | `number` |
| `stateTreeRoot` | `number` |

#### Defined in

[circuits/src/ReputationProof.ts:18](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/ReputationProof.ts#L18)

___

### maxRep

• **maxRep**: `bigint`

A maximum amount of net positive reputation the user controls. This value is only used if `proveMaxRep` is non-zero.
Example: Bob has 10 `posRep` and 5 `negRep`. Bob can prove a `maxRep` of 7 because he has a net positive reputation of 5.

#### Defined in

[circuits/src/ReputationProof.ts:86](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/ReputationProof.ts#L86)

___

### minRep

• **minRep**: `bigint`

A minimum amount of net positive reputation the user controls. This value is only used if `proveMinRep` is non-zero.
Example: Alice has 10 `posRep` and 5 `negRep`. Alice can prove a `minRep` of 2 because she has a net positive reputation of 5.

#### Defined in

[circuits/src/ReputationProof.ts:81](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/ReputationProof.ts#L81)

___

### nonce

• **nonce**: `bigint`

The nonce used to generate the epoch key. To determine if this value is set check that `revealNonce == 1`.

#### Defined in

[circuits/src/ReputationProof.ts:59](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/ReputationProof.ts#L59)

___

### proof

• **proof**: `bigint`[]

The proof data formatted as `string[]`. Use this property when interacting with smart contracts.

#### Inherited from

[BaseProof](src.BaseProof.md).[proof](src.BaseProof.md#proof)

#### Defined in

[circuits/src/BaseProof.ts:37](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/BaseProof.ts#L37)

___

### proveGraffiti

• **proveGraffiti**: `bigint`

Whether the user has chosen to prove a graffiti. If this value is non-zero the user graffiti will be proven.

#### Defined in

[circuits/src/ReputationProof.ts:102](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/ReputationProof.ts#L102)

___

### proveMaxRep

• **proveMaxRep**: `bigint`

Whether or not to enforce the provided `maxRep` value. If this value is non-zero the `maxRep` will be proven.

#### Defined in

[circuits/src/ReputationProof.ts:94](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/ReputationProof.ts#L94)

___

### proveMinRep

• **proveMinRep**: `bigint`

Whether or not to enforce the provided `minRep` value. If this value is non-zero the `minRep` will be proven.

#### Defined in

[circuits/src/ReputationProof.ts:90](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/ReputationProof.ts#L90)

___

### proveZeroRep

• **proveZeroRep**: `bigint`

Whether or not to prove the user has a net 0 reputation balance. If this value is non-zero the user `posRep` and `negRep` must be equal.

#### Defined in

[circuits/src/ReputationProof.ts:98](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/ReputationProof.ts#L98)

___

### prover

• `Optional` **prover**: [`Prover`](../interfaces/src.Prover.md)

The [`Prover`](https://developer.unirep.io/docs/circuits-api/interfaces/src.Prover) object.

#### Inherited from

[BaseProof](src.BaseProof.md).[prover](src.BaseProof.md#prover)

#### Defined in

[circuits/src/BaseProof.ts:41](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/BaseProof.ts#L41)

___

### publicSignals

• `Readonly` **publicSignals**: `bigint`[]

The raw array of public signals for the proof.

#### Inherited from

[BaseProof](src.BaseProof.md).[publicSignals](src.BaseProof.md#publicsignals)

#### Defined in

[circuits/src/BaseProof.ts:33](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/BaseProof.ts#L33)

___

### revealNonce

• **revealNonce**: `bigint`

A number indicating whether the epoch key nonce was revealed in the proof. This value will be either `1` or `0`.

#### Defined in

[circuits/src/ReputationProof.ts:71](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/ReputationProof.ts#L71)

___

### stateTreeRoot

• **stateTreeRoot**: `bigint`

The state tree root the user is a member of.

#### Defined in

[circuits/src/ReputationProof.ts:34](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/ReputationProof.ts#L34)

## Methods

### verify

▸ **verify**(): `Promise`<`boolean`\>

A function to verify the proof with the supplied `Prover`.
The `prover` property must be set either in the constructor or manually, otherwise this will throw.

#### Returns

`Promise`<`boolean`\>

True if the proof is valid, false otherwise

**`Example`**

```ts
const isValid: boolean = await proof.verify()
```

#### Inherited from

[BaseProof](src.BaseProof.md).[verify](src.BaseProof.md#verify)

#### Defined in

[circuits/src/BaseProof.ts:95](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/BaseProof.ts#L95)

___

### buildControl

▸ `Static` **buildControl**(`config`): `bigint`[]

Pack several variables into one `bigint` variable.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | `any` | The variables that will be packed. |

#### Returns

`bigint`[]

The controls

**`Example`**

```ts
ReputationProof.buildControl({
 attesterId,
 epoch,
 nonce,
 revealNonce,
 chainId,
 proveGraffiti,
 minRep,
 maxRep,
 proveMinRep,
 proveMaxRep,
 proveZeroRep,
})
```

#### Defined in

[circuits/src/ReputationProof.ts:171](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/ReputationProof.ts#L171)
