---
title: Synchronizer
---

Used to retrieve and manage state information for a UniRep attester. Each instance is backed by an [anondb](https://github.com/vimwitch/anondb) instance.

```ts
import { Synchronizer, schema } from '@unirep/core'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

const state = new Synchronizer({
  prover: defaultProver, // a circuit prover
  unirepAddress: '0xaabbccaabbccaabbccaabbccaabbccaabbccaaaa',
  provider, // an ethers.js provider
})

// start the synchronizer deamon
await state.start()
await state.waitForSync()

// stop the synchronizer deamon
state.stop()
```

## constructor

```ts
constructor(config: {
    db?: DB
    attesterId?: bigint | bigint[]
    prover: Prover
    provider: ethers.providers.Provider
    unirepAddress: string
})
```

## attesterId

The default attester ID that is set when construction. 
If there is a list of attester IDs, then the first one will be the default attester ID. 
If no attester ID is given during construction, all attesters will be synchronized. And the default `attesterId` would be `BigInt(0)`.

:::caution
Should check which default attester Id is carefully while synchronizing more than one attester. The default attester ID could be changed through [setAttesterId](#setattesterid).
:::

```ts
synchronizer.attesterId: bigint
```

## setAttesterId

Change default [attesterId](#attesterid) to another attester ID. It will fail if an `attesterId` is not synchronized when construction.

```ts
synchronizer.setAttesterId(attesterId: string | bigint): void
```

## start

Start the synchronizer daemon.

```ts
synchronizer.start(): Promise<void>
```

## stop

Stop the synchronizer daemon.

```ts
synchronizer.stop(): void
```

## poll

Manually poll for new events. Returns a boolean indicating whether the synchronizer has synced to the head of the blockchain.

```ts
synchronizer.poll(): Promise<{ complete: boolean }>
```

## pollRate

How frequently the synchronizer will poll the blockchain for new events (specified in milliseconds). Default: `5000`

```ts
synchronizer.pollRate
```

## blockRate

How many blocks the synchronizer will query on each poll. Default: `100000`

```ts
synchronizer.blockRate
```

## waitForSync

Wait for the synchronizer to sync up to a certain block. By default this will wait until the current latest known block (according to the provider).

```ts
synchronizer.waitForSync(blockNumber?: number): Promise<void>
```

## calcCurrentEpoch

Calculate the current epoch determining the amount of time since the attester registration timestamp. This operation is synchronous and does not involve any database operations.

```ts
synchronizer.calcCurrentEpoch(attesterId?: bigint | string): number
```

## calcEpochRemainingTime

Calculate the amount of time remaining in the current epoch. This operation is synchronous and does not involve any database operations.

```ts
synchronizer.calcEpochRemainingTime(attesterId?: bigint | string): number
```

## readCurrentEpoch

Get the latest processed epoch from the database.

:::caution
This value may mismatch the onchain value depending on synchronization status.
:::

```ts
synchronizer.readCurrentEpoch(): Promise<{
  number: number,
  sealed: boolean
}>
```

## loadCurrentEpoch

Load the current epoch number from the blockchain.

:::tip
Use this function in test environments where the blockchain timestamp may not match the real timestamp (e.g. due to snapshot/revert patterns).
:::

```ts
synchronizer.loadCurrentEpoch(attesterId?: bigint | string): Promise<number>
```

## epochTreeRoot

Get the epoch tree root for a certain epoch.

```ts
synchronizer.epochTreeRoot(epoch: number, attesterId?: bigint | string): Promise<bigint>
```

## epochTreeProof

Build a merkle inclusion proof for the tree from a certain epoch.

```ts
synchronizer.epochTreeProof(epoch: number, leafIndex: bigint, attesterId?: bigint | string): Promise<bigint[]>
```

## nullifierExist

Determine if a nullifier exists. This can be a proof nullifier, user state transition nullifier, or any other kind of nullifier. All nullifiers are stored in a single mapping and expected to be globally unique.

```ts
synchronizer.nullifierExist(nullifier: any): Promise<boolean>
```

## genStateTree

Build the latest state tree for a certain epoch.

```ts
synchronizer.genStateTree(epoch: bigint, attesterId?: bigint | string): Promise<IncrementalMerkleTree>
```

## genEpochTree

Build the latest epoch tree for a certain epoch.

```ts
synchronizer.genEpochTree(epoch: bigint, attesterId?: bigint | string): Promise<IncrementalMerkleTree>
```

## genEpochTreePreimages

Get the pre-images for the leaves in an epoch tree.

```ts
synchronizer.genEpochTreePreimages(
  epoch: bigint | number,
  attesterId?: bigint | string
): Promise<bigint[][]>
```

## genSealedEpochProof

Generate the sealed epoch proof. See [`sealEpoch`](../contracts-api/unirep-sol.md#sealepoch)

```ts
synchronizer.genSealedEpochProof(
  options: {
    epoch?: bigint
    attesterId?: bigint
    preimages?: bigint[]
  } = {}
): Promise<BuildOrderedTree>
```

:::tip
This proof is large and best made with `rapidsnark`. This function should only be used for small trees.
:::


## stateTreeRootExists

Determine if a state root exists in a certain epoch.

```ts
synchronizer.stateTreeRootExists(root: bigint, epoch: bigint, attesterId?: bigint | string): Promise<boolean>
```

## epochTreeRootExists

Determine if an epoch tree root exists for a certain epoch.

```ts
synchronizer.epochTreeRootExists(root: bigint, epoch: bigint, attesterId?: bigint | string): Promise<boolean>
```

## numStateTreeLeaves

Get the number of state tree leaves in a certain epoch.

```ts
synchronizer.numStateTreeLeaves(epoch: number, attesterId?: bigint | string): Promise<number>
```