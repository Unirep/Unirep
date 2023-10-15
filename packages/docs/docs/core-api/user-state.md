---
title: User State
---

The user state object is used to manage user state for an attester. The state is backed by an [anondb](https://github.com/vimwitch/anondb) instance.

```ts
import { UserState } from '@unirep/core'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'
import { Identity } from '@semaphore-protocol/identity'

const id = new Identity()
const state = new UserState({
  prover: defaultProver, // a circuit prover
  unirepAddress: '0xaabbccaabbccaabbccaabbccaabbccaabbccaaaa',
  provider, // an ethers.js provider
  id,
})

// or, initialize with an existing synchronizer object
const state = new UserState({
  synchronizer,
  id
})

// start the synchoronizer deamon
await state.start()
await state.waitForSync()

// stop the synchronizer deamon
state.stop()
```


## constructor

Can be constructed using an existing synchronizer, or by initializing a new synchronizer.

```ts
constructor(
  config: {
    synchronizer?: Synchronizer
    db?: DB
    attesterId?: bigint | bigint[]
    unirepAddress?: string
    provider?: ethers.providers.Provider
    id: Identity
    prover: Prover
  }
)
```

## commitment

The [Semaphore](https://semaphore.pse.dev/) identity commitment of the user.

```ts
state.commitment: bigint
```

## id

The [Semaphore](https://semaphore.pse.dev/) identity of the user.

```ts
state.id: Identity
```

## sync

The underlying synchronizer object.

```ts
state.sync: Synchronizer
```

## prover

The prover object.

```ts
state.prover: Prover
```

## chainId

The current chain ID of UniRep contract.

```ts
state.chainId: number
```

## start

Convenience accessor for synchronizer [`start`](./synchronizer.md#start).

```ts
state.start(): Promise<void>
```

## waitForSync

Convenience accessor for synchronizer [`waitForSync`](./synchronizer.md#waitforsync).

```ts
state.waitForSync(blockNumber?: number): Promise<void>
```

## stop

Convenience accessor for synchronizer [`stop`](./synchronizer.md#stop).

```ts
state.stop(): void
```

## hasSignedUp

Query the current database if the [Semaphore](https://semaphore.pse.dev/) identity commitment is stored.

```ts
state.hasSignedUp(attesterId?: bigint | string): Promise<boolean>
```

## latestTransitionedEpoch

Query the current database for a user's signup event or latest user state transition [nullifier](../protocol/nullifiers.md).

```ts
state.latestTransitionedEpoch(attesterId?: bigint | string): Promise<number>
```

## latestStateTreeLeafIndex

Get the latest state tree leaf index for either the latest transitioned epoch, or the epoch specified.

```ts
state.latestStateTreeLeafIndex(epoch?: number, attesterId?: bigint | string): Promise<number>
```

## getEpochKeys

Get epoch keys for the current user, for an epoch. If a `nonce` value is supplied the return value will be a single epoch key. Otherwise an array of all epoch keys will be returned.

If no `epoch` is supplied the current epoch will be used (as determined by [`calcCurrentEpoch`](synchronizer#calcCurrentEpoch)).

```ts
state.getEpochKeys(epoch?: number, nonce?: number, attesterId?: bigint | string): bigint | bigint[]
```

## parseReplData

This function is used to parse replacement data field to be `index` and `data`. See [replacement data field](../protocol/data.md#replacement-field)

```ts
state.parseReplData(replData: bigint): <{data: bigint, nonce: bigint}>
```

## getData

Get the data for a user up to and including the provided epoch. By default data up to and including the current epoch is returned.

:::tip
If you want to make a proof of data make sure to use [`getProvableData`](#getprovabledata). Data can only be proven once it has been included in a state tree leaf. Learn more about reputation proofs [here](../circuits-api/circuits#reputation-proof).
:::

```ts
state.getData(toEpoch?: number, attesterId?: bigint | string): Promise<bigint[]>
```

## getProvableData

Get the data that can be proven by the user using a state tree leaf. This is the data up to, but not including, the epoch the user has transitioned into.

```ts
state.getProvableData(attesterId?: bigint | string): Promise<bigint[]>
```

## getDataByEpochKey

Get the pending changes to the data owned by an epoch key.

```ts
state.getDataByEpochKey(
  epochKey: bigint | string, 
  epoch: number, 
  attesterId?: bigint | string
): Promise<bigint[]>
```

## getEpochKeyIndex

Get the index of epoch key among all attestations.

```ts
state.getEpochKeyIndex(
  epoch: number, 
  epochKey: bigint | string, 
  attesterId?: bigint | string
): Promise<number>
```

## genUserStateTransitionProof

Generate a user state transition proof. Returns a [`UserStateTransitionProof`](../circuits-api/user-state-transition-proof).

```ts
state.genUserStateTransitionProof(options?: {
  toEpoch?: number
  attesterId?: bigint | string
}): Promise<UserStateTransitionProof>
```

## genProveReputationProof

Generate a proof of reputation. Returns a [`ReputationProof`](../circuits-api/reputation-proof).

:::danger
**Please avoid assigning the `minRep = data[0] - data[1]` or `maxRep = data[1] - data[0]`.**<br/>
The proof could allow a user to accidentally publish their overall reputation (i.e. `data[0]-data[1]`). Depending on the circumstances (such as the length of the attestation history) this could reveal a user’s epoch key(s) as well.
:::

```ts
state.genProveReputationProof(options: {
  epkNonce?: number
  minRep?: number
  maxRep?: number
  graffiti?: bigint | string
  proveZeroRep?: boolean
  revealNonce?: boolean
  data?: bigint | string
  attesterId?: bigint | string
}): Promise<ReputationProof>
```

## genUserSignUpProof

Generate a proof that can be used to signup. Returns a [`SignupProof`](../circuits-api/signup-proof).

```ts
state.genUserSignUpProof(options: {
  epoch?: number
  attesterId?: bigint | string
}): Promise<SignupProof>
```

## genEpochKeyProof

Generate a proof that a user controls an epoch key in a certain epoch. Optionally provide a data value to sign. Returns an [`EpochKeyProof`](../circuits-api/epoch-key-proof).

```ts
state.genEpochKeyProof(options: {
  revealNonce?: boolean,
  nonce?: number,
  epoch?: number,
  data?: bigint,
  attesterId?: bigint | string
}): Promise<EpochKeyProof>
```

## genEpochKeyLiteProof

Generate a proof that a user controls an epoch key in a certain epoch. Optionally provide a data value to sign. Returns an [`EpochKeyLiteProof`](../circuits-api/epoch-key-lite-proof). This proof **will not include a merkle tree proof** which makes the proof size smaller than an [`EpochKeyProof`](../circuits-api/epoch-key-proof). It can be used to prove a seen and valid epoch key.

```ts
state.genEpochKeyLiteProof(options: {
  revealNonce?: boolean,
  nonce?: number,
  epoch?: number,
  data?: bigint,
  attesterId?: bigint | string
}): Promise<EpochKeyLiteProof>
```
