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
  const db_mem = await SQLiteConnector.create(schema, ':memory:')
  const db_storage = await SQLiteConnector.create(schema, 'db.sqlite')
}
{
  // in browser
  const db_browser = await IndexedDBConnector.create(schema)
}
```

## SynchronizerState

Used to store information about what blocks/transactions/events have been processed.

```ts
{
  attesterId: string,
  latestProcessedBlock: number
  latestProcessedTransactionIndex: number
  latestProcessedEventIndex: number
  latestCompleteBlock: number
}
```

## Attestation

An attestation given to an epoch key.

```ts
{
  epoch: number
  epochKey: string // base 10
  index: string
  attesterId: string
  fieldIndex: number
  change: string
  blockNumber: number
}
```

## StateTreeLeaf

A leaf from a state tree.

```ts
{
  epoch: number
  hash: string
  index: number
  attesterId: string
  blockNumber: number
}
```

## EpochTreeLeaf

A leaf from an epoch tree.

```ts
{
  id: string
  epoch: number
  hash: string
  index: string
  attesterId: string
  blockNumber: number
}
```

## HistoryTreeLeaf

A leaf from an attester history tree.

```ts
{
  id: string
  index: number
  attesterId: string
  leaf: string
}
```

## Epoch

An epoch entry.

```ts
{
  number: number
  attesterId: string
  sealed: boolean
}
```

## Nullifier

```ts
{
  epoch: number
  attesterId: string
  nullifier: string
  transactionHash: string
  blockNumber: number
}
```

## UserSignUp

An object created when a user joins an attester.

```ts
{
  commitment: string
  epoch: number
  attesterId: string
  blockNumber: number
}
```

## Attester

An object created when an attester registers with the UniRep instance.

```ts
{
  _id: string // the attester address
  startTimestamp: number
  epochLength: number
}
```
