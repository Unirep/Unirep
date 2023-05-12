---
title: Data Schema 
---

The `DataSchema` class abstracts UniRep data into a JavaScript object. This class can be used to encode and decode attestation data, and build attestations that are ready to be submitted to the UniRep smart contract.

```ts
import { Attestation, DataSchema, SchemaField } from '@unirep/core'

const schema: SchemaField[] = [
    {
        name: 'posRep',
        type: 'uint64',
        updateBy: 'sum',
    },
    {
        name: 'negRep',
        type: 'uint64',
        updateBy: 'sum',
    },
    {
        name: 'graffiti',
        type: 'uint205', // replacement fields must be `uint205`
        updateBy: 'replace',
    },
    {
        name: 'postCount',
        type: 'uint49',
        updateBy: 'sum',
    },
    {
        name: 'commentCount',
        type: 'uint49',
        updateBy: 'sum',
    },
    {
        name: 'voteCount',
        type: 'uint49',
        updateBy: 'sum',
    },
]

const d = new DataSchema(schema)

// 10 will be added to the 'posRep' field in the user data
const sumChange = { name: 'posRep', val: BigInt(10) }
const sumAttestation: Attestation = d.buildAttestation(sumChange)

// 20 will replace the current value in the 'graffiti' field in user data
const replacementChange = { name: 'graffiti', val: BigInt(20) }
const replacementAttestation: Attestation =
    d.buildAttestation(replacementChange)

// Multiple attestations can build using `buildAttestations()`
const changes = [
    { name: 'posRep', val: BigInt(10) },
    { name: 'negRep', val: BigInt(10) },
    { name: 'negRep', val: BigInt(20) },
    { name: 'graffiti', val: BigInt(30) },
]

//Returns two `Attestation` objects: 'posRep' and 'negRep' attestations are combined into one attestation
const attestations: Attestation[] = d.buildAttestations(changes)

// JS literal representing emitted data from a UniRep contract
const data = [
  553402322211286548490n,
  0n,
  0n,
  0n,
  205688069665150755269371147819668813122841983204197482918576158n,
  0n
]

/*
Result: 
parsedData = {
  posRep: 10n,
  negRep: 30n,
  graffiti: 30n,
  postCount: 0n,
  commentCount: 0n,
  voteCount: 0n
}
*/
const parsedData = d.parseData(data)
```

## SchemaField
Type describing each field in the user-defined schema. Schema field type must be a `uint`
```ts
type SchemaField = {
    name: string // field name
    type: string // uint*
    updateBy: 'sum' | 'replace' // either update by adding or replacing user data
}
```

## Attestation 
Type to be used with a deployed `unirepContract` object
```ts
type Attestation = {
    fieldIndex: number
    change: bigint
}
```
## parseSchema
Verify a user-defined data schema
```ts
dataSchema.parseSchema(schema: SchemaField[]): 
{
    ...schema: SchemaField, // exploded `SchemaField` fields
    dataIndex: number, 
    offset: number, // bit offset in attester change
    bits: number // bits allocated
}
```
## buildAttestation
Build an `Attestation` object to be used for a UniRep contract
```ts
dataSchema.buildAttestation(change: { name: string; val: bigint }): Attestation 
```
## buildAttestations
Build multiple `Attestation` objects trying to combine attestation changes when possible.
```ts
dataSchema.buildAttestations(changes: { name: string; val: bigint }[]): Attestation[]
```
## parseData
Parse encoded schema, producing a dictionary of user-defined field names and attestation value
```ts
dataSchema.parseData(data: bigint[]): any
```