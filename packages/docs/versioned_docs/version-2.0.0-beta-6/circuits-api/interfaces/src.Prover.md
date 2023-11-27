---
id: "src.Prover"
title: "Interface: Prover"
sidebar_label: "Prover"
custom_edit_url: null
---

[src](../modules/src.md).Prover

The prover interface is used to write custom implementations for creating and verifying proofs.
This abstracts away the logic of loading the proving keys. For example, a prover implementation could load the keys from disk, from a remote url, etc.

:::info
See the [`defaultProver`](https://developer.unirep.io/docs/circuits-api/modules/provers_defaultProver) for a nodejs implementation. <br/>
See the [`webProver`](https://developer.unirep.io/docs/circuits-api/modules/provers_defaultProver) for a browser compatible implementation.
:::

## Properties

### genProofAndPublicSignals

• **genProofAndPublicSignals**: (`circuitName`: `string`, `inputs`: `any`) => `Promise`<{ `proof`: `any` ; `publicSignals`: `any`  }\>

#### Type declaration

▸ (`circuitName`, `inputs`): `Promise`<{ `proof`: `any` ; `publicSignals`: `any`  }\>

The function should return snark proof and snark public signals of given circuit and inputs

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `circuitName` | `string` | Name of the circuit, which can be chosen from `Circuit` |
| `inputs` | `any` | The user inputs of the circuit |

##### Returns

`Promise`<{ `proof`: `any` ; `publicSignals`: `any`  }\>

`proof` and `publicSignals` that can be verified by `Prover.verifyProof`

#### Defined in

[circuits/src/type.ts:95](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/type.ts#L95)

___

### getConfig

• `Optional` **getConfig**: () => [`CircuitConfig`](../classes/src.CircuitConfig.md)

#### Type declaration

▸ (): [`CircuitConfig`](../classes/src.CircuitConfig.md)

Get the current circuit config

##### Returns

[`CircuitConfig`](../classes/src.CircuitConfig.md)

#### Defined in

[circuits/src/type.ts:113](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/type.ts#L113)

___

### getVKey

• **getVKey**: (`circuitName`: `string`) => `Promise`<`any`\>

#### Type declaration

▸ (`circuitName`): `Promise`<`any`\>

Get vkey from default built folder `zksnarkBuild/`

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `circuitName` | `string` | Name of the circuit, which can be chosen from `Circuit` |

##### Returns

`Promise`<`any`\>

vkey of the circuit

#### Defined in

[circuits/src/type.ts:108](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/type.ts#L108)

___

### verifyProof

• **verifyProof**: (`circuitName`: `string`, `publicSignals`: `any`, `proof`: `any`) => `Promise`<`boolean`\>

#### Type declaration

▸ (`circuitName`, `publicSignals`, `proof`): `Promise`<`boolean`\>

The function returns true if the proof of the circuit is valid, false otherwise.

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `circuitName` | `string` | Name of the circuit, which can be chosen from `Circuit` |
| `publicSignals` | `any` | The public signals of the snark |
| `proof` | `any` | The proof of the snark |

##### Returns

`Promise`<`boolean`\>

True if the proof is valid, false otherwise

#### Defined in

[circuits/src/type.ts:83](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/type.ts#L83)
