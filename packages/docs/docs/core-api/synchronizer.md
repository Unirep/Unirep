---
title: Synchronizer
---

Used to retrieve and manage state information for a UniRep attester. Each instance is backed by an [anondb](https://github.com/vimwitch/anondb) instance.

```ts
import { Synchronizer, schema } from '@unirep/core'
import { SQLiteConnector } from 'anondb/node'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

const db = new SQLiteConnector(schema, ':memory:')
const state = new Synchronizer({
  db,
  prover: defaultProver, // a circuit prover
  unirepAddress: '0xaabbccaabbccaabbccaabbccaabbccaabbccaaaa',
  provider, // an ethers.js provider
  attesterId: ATTESTER_ADDRESS,
})
```

## constructor

```ts
constructor(config: {
    db: DB
    prover: Prover
    unirepContract: ethers.Contract
    attesterId: bigint
})
```

## start

Start the synchronizer daemon.

```ts
synchronizer.start(): Promise<void>
```

## stop

Stop the synchronizer daemon.

```ts
synchronizer.stop(): Promise<void>
```

## waitForSync

Wait for the synchronizer to sync up to a certain block. By default this will wait until the current latest known block (according to the provider).

```ts
synchronizer.waitForSync(blockNumber?: number): Promise<void>
```

## epochTreeRoot

Get the epoch tree root for a certain epoch.

```ts
synchronizer.epochTreeRoot(epoch: number): Promise<bigint>
```

## epochTreeProof

Build a merkle inclusion proof for the tree from a certain epoch.

```ts
synchronizer.epochTreeProof(epoch: number, leafIndex: bigint): Promise<bigint[]>
```

## nullifierExists

Determine if a nullifier exists. This can be a proof nullifier, user state transition nullifier, or any other kind of nullifier. All nullifiers are stored in a single mapping and expected to be globally unique.

```ts
synchronizer.nullifierExists(nullifier: bigint): Promise<boolean>
```

## genStateTree

Build the latest state tree for a certain epoch.

```ts
synchronizer.genStateTree(epoch: bigint): Promise<IncrementalMerkleTree>
```

## genEpochTree

Build the latest epoch tree for a certain epoch.

```ts
synchronizer.genEpochTree(epoch: bigint): Promise<SparseMerkleTree>
```

## stateRootExists

Determine if a state root exists in a certain epoch.

```ts
synchronizer.stateRootExists(root: bigint, epoch: bigint): Promise<boolean>
```

## epochTreeRootExists

Determine if an epoch tree root exists for a certain epoch.

```ts
synchronizer.epochTreeRootExists(root: bigint, epoch: bigint): Promise<boolean>
```

## getNumStateTreeLeaves

Get the number of state tree leaves in a certain epoch.

```ts
synchronizer.getNumStateTreeLeaves(epoch: number): Promise<number>
```

## getAttestations

Get all attestations to an epoch key.

```ts
state.getAttestations(epochKey: bigint): Promise<any[]>
```
