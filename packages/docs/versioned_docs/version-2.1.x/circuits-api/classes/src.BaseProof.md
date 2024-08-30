---
id: "src.BaseProof"
title: "Class: BaseProof"
sidebar_label: "BaseProof"
custom_edit_url: null
---

[src](../modules/src.md).BaseProof

We build proofs using a `BaseProof` class that optionally supports verification.
Proof data can be expressed in one of two formats:

1. `SnarkProof` objects for verification by `snarkjs`
2. `string[]` for contract verification.

The `BaseProof` class can be used to convert between the two formats.
This class should not be used directly, but should instead be inherited.

The base class for a proof that can be verified using a [`Prover`](https://developer.unirep.io/docs/circuits-api/interfaces/src.Prover).

## Hierarchy

- **`BaseProof`**

  ↳ [`EpochKeyProof`](src.EpochKeyProof.md)

  ↳ [`EpochKeyLiteProof`](src.EpochKeyLiteProof.md)

  ↳ [`ReputationProof`](src.ReputationProof.md)

  ↳ [`SignupProof`](src.SignupProof.md)

  ↳ [`UserStateTransitionProof`](src.UserStateTransitionProof.md)

  ↳ [`ScopeNullifierProof`](src.ScopeNullifierProof.md)

## Constructors

### constructor

• **new BaseProof**(`publicSignals`, `proof`, `prover?`)

Create a new instance of the class.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `publicSignals` | (`string` \| `bigint`)[] | The public signals of the proof that can be verified by the prover |
| `proof` | `Groth16Proof` \| (`string` \| `bigint`)[] | The proof that can be verified by the prover |
| `prover?` | [`Prover`](../interfaces/src.Prover.md) | The prover that can verify the public signals and the proof |

**`Example`**

```ts
import { BaseProof } from '@unirep/circuits'

class MyCustomProof extends BaseProof {
 constructor(publicSignals, proof, prover) {
  super(publicSignals, proof, prover)

  // Specify a circuit name for the Prover
  // This is typically a filename
  this.circuit = 'MyCustomProof'
 }
}
```

#### Defined in

[circuits/src/BaseProof.ts:63](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/BaseProof.ts#L63)

## Properties

### \_snarkProof

• `Readonly` **\_snarkProof**: `Groth16Proof`

The proof data in [`Groth16Proof`](https://www.npmjs.com/package/@types/snarkjs?activeTab=code) format. Use this when manually verifying with `snarkjs`.

#### Defined in

[circuits/src/BaseProof.ts:24](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/BaseProof.ts#L24)

___

### circuit

• `Protected` `Optional` **circuit**: [`Circuit`](../enums/src.Circuit.md)

The string name of the type of circuit this proof came from. For the `BaseProof` class this is undefined.

#### Defined in

[circuits/src/BaseProof.ts:28](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/BaseProof.ts#L28)

___

### proof

• **proof**: `bigint`[]

The proof data formatted as `string[]`. Use this property when interacting with smart contracts.

#### Defined in

[circuits/src/BaseProof.ts:37](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/BaseProof.ts#L37)

___

### prover

• `Optional` **prover**: [`Prover`](../interfaces/src.Prover.md)

The [`Prover`](https://developer.unirep.io/docs/circuits-api/interfaces/src.Prover) object.

#### Defined in

[circuits/src/BaseProof.ts:41](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/BaseProof.ts#L41)

___

### publicSignals

• `Readonly` **publicSignals**: `bigint`[]

The raw array of public signals for the proof.

#### Defined in

[circuits/src/BaseProof.ts:33](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/BaseProof.ts#L33)

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

#### Defined in

[circuits/src/BaseProof.ts:95](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/src/BaseProof.ts#L95)
