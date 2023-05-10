---
title: Data Schema 
---

User-defined data schemas can be used when interfacing with the exposed `uint253` attestation data. This tool encodes and decodes attestation data, consolidating a user-defined attestation changes. 

## SchemaField
Schema field type must be `uint`
```ts
{
    name: string // field name
    type: string // uint*
    updateBy: 'sum' | 'replace'
}
```

## Attestation 
To be used with a deployed `unirepContract` object
```ts
{
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
```ts
buildAttestation(change: { name: string; val: bigint }): Attestation 
```
## buildAttestations
Build multiple `Attestation` objects trying to combine attestation changes when possible.
```ts
buildAttestations(changes: { name: string; val: bigint }[]): Attestation[]
```
## parseData
Parse encoded schema, producing a dictionary of user-defined field names and attestation value
```ts
    parseData(data: bigint[]): any
```