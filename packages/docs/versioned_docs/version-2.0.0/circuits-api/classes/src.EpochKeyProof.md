---
id: "src.EpochKeyProof"
title: "Class: EpochKeyProof"
sidebar_label: "EpochKeyProof"
custom_edit_url: null
---

[src](../modules/src.md).EpochKeyProof

A class representing an [epoch key proof](https://developer.unirep.io/docs/circuits-api/classes/src.EpochKeyProof). Each of the following properties are public signals for the proof.

## Hierarchy

- [`BaseProof`](src.BaseProof.md)

  ↳ **`EpochKeyProof`**

## Constructors

### constructor

• **new EpochKeyProof**(`publicSignals`, `proof`, `prover?`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `publicSignals` | (`string` \| `bigint`)[] | The public signals of the epoch key proof that can be verified by the prover |
| `proof` | `SnarkProof` | The proof that can be verified by the prover |
| `prover?` | [`Prover`](../interfaces/src.Prover.md) | The prover that can verify the public signals and the proof |

**`Example`**

```ts
import { EpochKeyProof } from '@unirep/circuits'
const data = new EpochKeyProof(publicSignals, proof)
```

#### Overrides

[BaseProof](src.BaseProof.md).[constructor](src.BaseProof.md#constructor)

#### Defined in

[circuits/src/EpochKeyProof.ts:69](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/EpochKeyProof.ts#L69)

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

[circuits/src/EpochKeyProof.ts:49](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/EpochKeyProof.ts#L49)

___

### chainId

• **chainId**: `bigint`

The chain id for the proof.

#### Defined in

[circuits/src/EpochKeyProof.ts:57](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/EpochKeyProof.ts#L57)

___

### circuit

• `Protected` `Optional` **circuit**: [`Circuit`](../enums/src.Circuit.md)

The string name of the type of circuit this proof came from. For the `BaseProof` class this is undefined.

#### Inherited from

[BaseProof](src.BaseProof.md).[circuit](src.BaseProof.md#circuit)

#### Defined in

[circuits/src/BaseProof.ts:28](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/BaseProof.ts#L28)

___

### control

• **control**: `bigint`

The control field used for the proof. This field contains many signals binary encoded into a single 253 bit value. This value is automatically decoded into the other properties on this class.

#### Defined in

[circuits/src/EpochKeyProof.ts:32](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/EpochKeyProof.ts#L32)

___

### data

• **data**: `bigint`

The 32 byte data endorsed by the proof.

#### Defined in

[circuits/src/EpochKeyProof.ts:36](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/EpochKeyProof.ts#L36)

___

### epoch

• **epoch**: `bigint`

The epoch the proof was made within.

#### Defined in

[circuits/src/EpochKeyProof.ts:45](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/EpochKeyProof.ts#L45)

___

### epochKey

• **epochKey**: `bigint`

The epoch key being proved.

#### Defined in

[circuits/src/EpochKeyProof.ts:23](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/EpochKeyProof.ts#L23)

___

### idx

• `Readonly` **idx**: `Object`

The index of the data in the public signals

#### Type declaration

| Name | Type |
| :------ | :------ |
| `control` | `number` |
| `data` | `number` |
| `epochKey` | `number` |
| `stateTreeRoot` | `number` |

#### Defined in

[circuits/src/EpochKeyProof.ts:13](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/EpochKeyProof.ts#L13)

___

### nonce

• **nonce**: `bigint`

The nonce used to generate the epoch key. To determine if this value is set check that `revealNonce == 1`.

#### Defined in

[circuits/src/EpochKeyProof.ts:41](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/EpochKeyProof.ts#L41)

___

### proof

• **proof**: `bigint`[]

The proof data formatted as `string[]`. Use this property when interacting with smart contracts.

#### Inherited from

[BaseProof](src.BaseProof.md).[proof](src.BaseProof.md#proof)

#### Defined in

[circuits/src/BaseProof.ts:37](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/BaseProof.ts#L37)

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

[circuits/src/EpochKeyProof.ts:53](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/EpochKeyProof.ts#L53)

___

### stateTreeRoot

• **stateTreeRoot**: `bigint`

The state tree root the proof was made against.
This should be verified to exist onchain when verifying the proof.

#### Defined in

[circuits/src/EpochKeyProof.ts:28](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/EpochKeyProof.ts#L28)

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

▸ `Static` **buildControl**(`config`): `bigint`

Pack several variables into one `bigint` variable.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | [`EpochKeyControl`](../modules/src.md#epochkeycontrol) | The variables that will be packed. |

#### Returns

`bigint`

The control

**`Example`**

```ts
EpochKeyProof.buildControl({
  epoch,
  nonce,
  attesterId,
  revealNonce,
  chainId
})
```

#### Defined in

[circuits/src/EpochKeyProof.ts:104](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/EpochKeyProof.ts#L104)
