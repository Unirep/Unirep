---
id: "src.SignupProof"
title: "Class: SignupProof"
sidebar_label: "SignupProof"
custom_edit_url: null
---

[src](../modules/src.md).SignupProof

A class representing a [signup proof](https://developer.unirep.io/docs/circuits-api/classes/src.SignupProof). Each of the following properties are public signals for the proof.

## Hierarchy

- [`BaseProof`](src.BaseProof.md)

  ↳ **`SignupProof`**

## Constructors

### constructor

• **new SignupProof**(`publicSignals`, `proof`, `prover?`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `publicSignals` | (`string` \| `bigint`)[] | The public signals of the user sign up proof that can be verified by the prover |
| `proof` | `Groth16Proof` | The proof that can be verified by the prover |
| `prover?` | [`Prover`](../interfaces/src.Prover.md) | The prover that can verify the public signals and the proof |

**`Example`**

```ts
import { SignupProof } from '@unirep/circuits'
const data = new SignupProof(publicSignals, proof)
```

#### Overrides

[BaseProof](src.BaseProof.md).[constructor](src.BaseProof.md#constructor)

#### Defined in

[circuits/src/SignupProof.ts:57](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/SignupProof.ts#L57)

## Properties

### \_snarkProof

• `Readonly` **\_snarkProof**: `Groth16Proof`

The proof data in [`Groth16Proof`](https://www.npmjs.com/package/@types/snarkjs?activeTab=code) format. Use this when manually verifying with `snarkjs`.

#### Inherited from

[BaseProof](src.BaseProof.md).[_snarkProof](src.BaseProof.md#_snarkproof)

#### Defined in

[circuits/src/BaseProof.ts:24](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/BaseProof.ts#L24)

___

### attesterId

• **attesterId**: `bigint`

The attester id for the proof.

#### Defined in

[circuits/src/SignupProof.ts:37](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/SignupProof.ts#L37)

___

### chainId

• **chainId**: `bigint`

The chain id for the proof.

#### Defined in

[circuits/src/SignupProof.ts:45](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/SignupProof.ts#L45)

___

### circuit

• `Protected` `Optional` **circuit**: [`Circuit`](../enums/src.Circuit.md)

The string name of the type of circuit this proof came from. For the `BaseProof` class this is undefined.

#### Inherited from

[BaseProof](src.BaseProof.md).[circuit](src.BaseProof.md#circuit)

#### Defined in

[circuits/src/BaseProof.ts:28](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/BaseProof.ts#L28)

___

### control

• **control**: `bigint`

The control field used for the proof. This field contains many signals binary encoded into a single 253 bit value. This value is automatically decoded into the other properties on this class.

#### Defined in

[circuits/src/SignupProof.ts:32](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/SignupProof.ts#L32)

___

### epoch

• **epoch**: `bigint`

The epoch the proof was made within.

#### Defined in

[circuits/src/SignupProof.ts:41](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/SignupProof.ts#L41)

___

### identityCommitment

• **identityCommitment**: `bigint`

The [identity commitment](https://semaphore.pse.dev/docs/glossary#identity-commitment) for the user signing up.

#### Defined in

[circuits/src/SignupProof.ts:23](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/SignupProof.ts#L23)

___

### idx

• `Readonly` **idx**: `Object`

The index of the data in the public signals

#### Type declaration

| Name | Type |
| :------ | :------ |
| `control` | `number` |
| `identityCommitment` | `number` |
| `stateTreeLeaf` | `number` |

#### Defined in

[circuits/src/SignupProof.ts:13](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/SignupProof.ts#L13)

___

### proof

• **proof**: `bigint`[]

The proof data formatted as `string[]`. Use this property when interacting with smart contracts.

#### Inherited from

[BaseProof](src.BaseProof.md).[proof](src.BaseProof.md#proof)

#### Defined in

[circuits/src/BaseProof.ts:37](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/BaseProof.ts#L37)

___

### prover

• `Optional` **prover**: [`Prover`](../interfaces/src.Prover.md)

The [`Prover`](https://developer.unirep.io/docs/circuits-api/interfaces/src.Prover) object.

#### Inherited from

[BaseProof](src.BaseProof.md).[prover](src.BaseProof.md#prover)

#### Defined in

[circuits/src/BaseProof.ts:41](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/BaseProof.ts#L41)

___

### publicSignals

• `Readonly` **publicSignals**: `bigint`[]

The raw array of public signals for the proof.

#### Inherited from

[BaseProof](src.BaseProof.md).[publicSignals](src.BaseProof.md#publicsignals)

#### Defined in

[circuits/src/BaseProof.ts:33](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/BaseProof.ts#L33)

___

### stateTreeLeaf

• **stateTreeLeaf**: `bigint`

The new state tree leaf for the user. This leaf will contain values for [data](https://developer.unirep.io/docs/protocol/data.md).

#### Defined in

[circuits/src/SignupProof.ts:27](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/SignupProof.ts#L27)

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

[circuits/src/BaseProof.ts:95](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/BaseProof.ts#L95)

___

### buildControl

▸ `Static` **buildControl**(`config`): `bigint`

Pack several variables into one `bigint` variable.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | `any` | The variables that will be packed. |

#### Returns

`bigint`

The control

**`Example`**

```ts
SignupProof.buildControl({
 epoch,
 attesterId,
 chainId
})
```

#### Defined in

[circuits/src/SignupProof.ts:88](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/SignupProof.ts#L88)
