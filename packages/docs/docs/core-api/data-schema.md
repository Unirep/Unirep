---
title: Data Schema 
---

User-defined data schemas can be used when interfacing with the exposed `uint253` attestation data. This tool encodes and decodes attestation data, consolidating a user-defined attestation changes. 

## SchemaField
Type describing each field in the user-defined schema. Schema field type must be a `uint`
```ts
type SchemaField = {
    name: string // field name
    type: string // uint*
    updateBy: 'sum' | 'replace'
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