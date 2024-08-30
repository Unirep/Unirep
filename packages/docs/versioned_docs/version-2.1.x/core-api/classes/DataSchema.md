---
id: "DataSchema"
title: "Class: DataSchema"
sidebar_label: "DataSchema"
sidebar_position: 0
custom_edit_url: null
---

The `DataSchema` class abstracts UniRep data into a JavaScript object.
This class can be used to encode and decode attestation data,
and build attestations that are ready to be submitted to the UniRep smart contract.

**`Example`**

```ts
import { Attestation, DataSchema, SchemaField } from '@unirep/core'

const schema: SchemaField[] = [
  {name: 'posRep', type: 'uint64', updateBy: 'sum',},
  {name: 'negRep', type: 'uint64', updateBy: 'sum',},
  {name: 'graffiti', type: 'uint205', updateBy: 'replace',},
  {name: 'postCount', type: 'uint49', updateBy: 'sum',},
  {name: 'commentCount', type: 'uint49', updateBy: 'sum',},
  {name: 'voteCount', type: 'uint49', updateBy: 'sum',},
]

const d = new DataSchema(schema)
```

## Constructors

### constructor

• **new DataSchema**(`schema`, `config?`)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `schema` | [`SchemaField`](../modules.md#schemafield)[] | `undefined` |
| `config` | `CircuitConfig` | `CircuitConfig.default` |

#### Defined in

[packages/core/src/DataSchema.ts:55](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/DataSchema.ts#L55)

## Properties

### config

• **config**: `CircuitConfig`

#### Defined in

[packages/core/src/DataSchema.ts:53](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/DataSchema.ts#L53)

___

### schema

• **schema**: `any`[]

#### Defined in

[packages/core/src/DataSchema.ts:52](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/DataSchema.ts#L52)

## Methods

### buildAttestation

▸ **buildAttestation**(`change`): [`Attestation`](../modules.md#attestation)

Build an `Attestation` object to be used for a UniRep contract

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `change` | `Object` | The data change. If it is `sum` field, the data will be changed by addition. If it is `replacement` field, the data will be changed by replacement. |
| `change.name` | `string` | - |
| `change.val` | `bigint` | - |

#### Returns

[`Attestation`](../modules.md#attestation)

The attestation object will be submitted to the Unirep contract.

**`Example`**

**Sum field**
```ts
// 10 will be added to the 'posRep' field in the user data
const sumChange = { name: 'posRep', val: BigInt(10) }
const sumAttestation: Attestation = d.buildAttestation(sumChange)
```

**Replacement field**
```ts
// 20 will replace the current value in the 'graffiti' field in user data
const replacementChange = { name: 'graffiti', val: BigInt(20) }
const replacementAttestation: Attestation = d.buildAttestation(replacementChange)
```

#### Defined in

[packages/core/src/DataSchema.ts:168](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/DataSchema.ts#L168)

___

### buildAttestations

▸ **buildAttestations**(`changes`): [`Attestation`](../modules.md#attestation)[]

Build multiple `Attestation` objects to be used for a UniRep contract

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `changes` | { `name`: `string` ; `val`: `bigint`  }[] | The array of data change. |

#### Returns

[`Attestation`](../modules.md#attestation)[]

The array of attestations will be submitted to the Unirep contract.

**`Example`**

```ts
// Multiple attestations can be built using `buildAttestations()`
const changes = [
  { name: 'posRep', val: BigInt(10) },
  { name: 'negRep', val: BigInt(10) },
  { name: 'negRep', val: BigInt(20) },
  { name: 'graffiti', val: BigInt(30) },
]

//Returns two `Attestation` objects: 'posRep' and 'negRep' attestations are combined into one attestation
const attestations: Attestation[] = d.buildAttestations(changes)
```

#### Defined in

[packages/core/src/DataSchema.ts:209](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/DataSchema.ts#L209)

___

### parseData

▸ **parseData**(`data`): `any`

Parse encoded schema, producing a dictionary of user-defined field names and attestation values

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `data` | `bigint`[] | The raw data appended to the Unirep contract. |

#### Returns

`any`

The names of the data and its values.

**`Example`**

```ts
// JS literal representing emitted data from a UniRep contract
const data = [
  553402322211286548490n,
  0n,
  0n,
  0n,
  205688069665150755269371147819668813122841983204197482918576158n,
  0n
]

const parsedData = d.parseData(data)
// Result:
// parsedData = {
//   posRep: 10n,
//   negRep: 30n,
//   graffiti: 30n,
//   postCount: 0n,
//   commentCount: 0n,
//   voteCount: 0n
// }
```

#### Defined in

[packages/core/src/DataSchema.ts:276](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/DataSchema.ts#L276)

___

### parseSchema

▸ **parseSchema**(`schema`): `any`[]

Verify a user-defined data schema

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `schema` | [`SchemaField`](../modules.md#schemafield)[] | The array of `SchemaField` |

#### Returns

`any`[]

```ts
{
  ...schema: SchemaField, // exploded `SchemaField` fields
  dataIndex: number,
  offset: number, // bit offset in attester change
  bits: number // bits allocated
}
```

#### Defined in

[packages/core/src/DataSchema.ts:73](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/DataSchema.ts#L73)
