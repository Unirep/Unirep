---
title: User Schema
---

UniRep needs to persist data in order to construct state and make proofs. To do this we use a generic database wrapper called [anondb](https://github.com/vimwitch/anondb). This wrapper has support for desktop environment databases like SQLite, as well as the IndexedDB browser database.

`@unirep/core` ships a schema that should be used with the database. The user schema extends from a synchronizer schema, which securely stores private user data, including personal information and the latest transitioned epoch.

```ts
import { userSchema } from '@unirep/core'
import { SQLiteConnector } from 'anondb/node'
import { IndexedDBConnector } from 'anondb/web'

{
  // in nodejs
  const db_mem = await SQLiteConnector.create(userSchema, ':memory:')
  const db_storage = await SQLiteConnector.create(userSchema, 'db.sqlite')
}
{
  // in browser
  const db_browser = await IndexedDBConnector.create(userSchema)
}
```

## UserState

Used to store information about what user's data have been processed.

```ts
{
  attesterId: string,
  latestTransitionedEpoch: number
  latestTransitionedIndex: number
  data: Object
}
```

where the data object is parsed using the following code:
```ts
const parsedData = JSON.parse(
  `{${data.map((v, i) => `"${i}": "${v}"`).join(',')}}`
)
```

Then the data can then be retrieved with:

```ts
for (let i = 0; i < data.length; i++) {
  data[i] = BigInt(savedData.data[`${i}`])
}
```

