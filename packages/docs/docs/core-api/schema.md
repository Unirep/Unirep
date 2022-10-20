---
title: schema
---

UniRep needs to persist data in order to construct state and make proofs. To do this we use a generic database wrapper called [anondb](https://github.com/vimwitch/anondb). This wrapper has support for desktop environment databases like SQLite, as well as the IndexedDB browser database.

`@unirep/core` ships a schema that should be used with the database. This schema can be extended by adding additional collections for application specific data storage.

```ts
import { schema } from '@unirep/core'
import { SQLiteConnector } from 'anondb/node'
import { IndexedDBConnector } from 'anondb/web'

{
  // in nodejs
  const db = new SQLiteConnector(schema, ':memory:')
}
{
  // in browser
  const db = new IndexedDBConnector(schema, 1)
}
```

## SynchronizerState

Used to store information about what blocks/transactions/events have been processed.

```ts
{
  attesterId: string,
  latestProcessedBlock: number,
  latestProcessedTransactionIndex: number,
  latestCompleteBlock: number
}
```

## Attestation

An attestation given to an epoch key.

```ts
{
  epoch?: number,
  epochKey?: string, // base 10
  index: string,
  attester?: string,
  attesterId?: string,
  posRep?: number,
  negRep?: number,
  graffiti?: string,
  timestamp?: number,
  hash: string
}
```

## StateTreeLeaf

A leaf from a state tree.

```ts
{
  epoch: number,
  hash: string,
  index: number,
  attesterId: string
}
```

## EpochTreeLeaf

A leaf from an epoch tree.

```ts
{
  epoch: number,
  hash: string,
  index: string,
  attesterId: string
}
```

## Epoch

An epoch entry.

```ts
{
  number: number,
  attesterId: string,
  sealed: boolean
}
```

## Nullifier

```ts
{
  epoch: number,
  attesterId: string,
  nullifier: string,
  transactionHash: string,
}
```

## UserSignUp

An object created when a user joins an attester.

```ts
{
  commitment: string,
  epoch: number,
  attesterId: string
}
```
