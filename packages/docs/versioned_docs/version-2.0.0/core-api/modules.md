---
id: "modules"
title: "@unirep/core"
sidebar_label: "Exports"
sidebar_position: 0.5
custom_edit_url: null
---

## Classes

- [DataSchema](classes/DataSchema.md)
- [Synchronizer](classes/Synchronizer.md)
- [UserState](classes/UserState.md)

## Type Aliases

### Attestation

Ƭ **Attestation**: `Object`

Type to be used with a deployed Unirep contract object

#### Type declaration

| Name | Type |
| :------ | :------ |
| `change` | `bigint` |
| `fieldIndex` | `number` |

#### Defined in

[packages/core/src/DataSchema.ts:26](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/DataSchema.ts#L26)

___

### SchemaField

Ƭ **SchemaField**: `Object`

Type describing each field in the user-defined schema. Schema field type must be a `uint`.
:::caution
Replacement field must be `uint205`
:::

**`Example`**

```ts
const schema: SchemaField = {
  name: 'posRep', // field name
  type: 'uint64', // uint*
  updatedBy: 'sum', // either update by adding or replacing user data
}
```

#### Type declaration

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `type` | `string` |
| `updateBy` | ``"sum"`` \| ``"replace"`` |

#### Defined in

[packages/core/src/DataSchema.ts:17](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/DataSchema.ts#L17)

## Variables

### schema

• `Const` **schema**: `TableData`[]

UniRep needs to persist data in order to construct state and make proofs.
To do this we use a generic database wrapper called [anondb](https://github.com/vimwitch/anondb).
This wrapper has support for desktop environment databases like SQLite, as well as the IndexedDB browser database.

`@unirep/core` ships a schema that should be used with the database.
This schema can be extended by adding additional collections for application specific data storage.

**`See`**

http://developer.unirep.io/docs/core-api/schema

**`Example`**

```ts
import { schema } from '@unirep/core'
import { SQLiteConnector } from 'anondb/node'
import { IndexedDBConnector } from 'anondb/web'
// in nodejs
const db_mem = await SQLiteConnector.create(schema, ':memory:')
const db_storage = await SQLiteConnector.create(schema, 'db.sqlite')
// in browser
const db_browser = await IndexedDBConnector.create(schema)
```

#### Defined in

[packages/core/src/schema.ts:140](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/schema.ts#L140)
