---
title: User State
---

The user state object is used to manage user state for an attester. The state is backed by an [anondb](https://github.com/vimwitch/anondb) instance.

```ts
import { UserState, schema } from '@unirep/core'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

const state = new UserState({
  prover: defaultProver, // a circuit prover
  unirepAddress: '0xaabbccaabbccaabbccaabbccaabbccaabbccaaaa',
  provider, // an ethers.js provider
}, identity)

// or, initialize with an existing synchronizer object

const state = new UserState(synchronizer, identity)
```


## constructor

Can be constructed using an existing synchronizer, or by initializing a new synchronizer.

```ts
constructor(config: Synchronizer | {
    db?: DB
    attesterId: bigint
    unirepAddress: string
    prover: Prover
    provider: ethers.Provider
    _id?: ZkIdentity
}, id?: ZkIdentity) {
```

## sync

The underlying synchronizer object.

```ts
state.sync: Synchronizer
```

## waitForSync

Convenience accessor for synchronizer `waitForSync`.

```ts
state.waitForSync(blockNumber?: number): Promise<void>
```

## hasSignedUp

```ts
state.hasSignedUp(): Promise<boolean>
```

## latestTransitionedEpoch


```ts
state.latestTransitionedEpoch(): Promise<number>
```

## latestStateTreeLeafIndex

Get the latest state tree leaf index for either the latest transitioned epoch, or the epoch specified.

```ts
state.latestStateTreeLeafIndex(epoch?: number): Promise<number>
```

## getEpochKeys

Get epoch keys for the current user, for an epoch. If a `nonce` value is supplied the return value will be a single epoch key. Otherwise an array of all epoch keys will be returned.

If no `epoch` is supplied the current epoch will be used (as determined by [`calcCurrentEpoch`](synchronizer#calcCurrentEpoch)).

```ts
state.getEpochKeys(epoch?: number, nonce?: number): bigint | bigint[]
```

## getData

Get the data for a user up to and including the provided epoch. By default data up to and including the current epoch is returned.

:::tip
If you want to make a proof of data make sure to use [`getProvableData`](#getprovabledata). Data can only be proven once it has been included in a state tree leaf. Learn more about reputation proofs [here](../circuits-api/circuits#prove-reputation-proof).
:::

```ts
state.getData(toEpoch?: number): Promise<bigint[]>
```

## getProvableData

Get the data that can be proven by the user using a state tree leaf. This is the data up to, but not including, the epoch the user has transitioned into.

```ts
state.getProvableData(): Promise<bigint[]>
```

## getDataByEpochKey

Get the pending changes to the data owned by an epoch key.

```ts
state.getDataByEpochKey(epochKey: bigint, epoch: number): Promise<bigint[]>
```

## genUserStateTransitionProof

Generate a user state transition proof. Returns a [`UserStateTransitionProof`](../circuits-api/user-state-transition-proof).

```ts
state.genUserStateTransitionProof(options?: {
  toEpoch?: bigint | number
}): Promise<UserStateTransitionProof>
```

## genProveReputationProof

Generate a proof of reputation. Returns a [`ReputationProof`](../circuits-api/reputation-proof).

```ts
state.genProveReputationProof(options: {
  epkNonce?: number
  minRep?: number
  maxRep?: number
  graffitiPreImage?: bigint | string
  proveZeroRep?: boolean
  revealNonce?: boolean
  data?: bigint | string
}): Promise<ReputationProof>
```

## genUserSignUpProof

Generate a proof that can be used to signup. Returns a [`SignupProof`](../circuits-api/signup-proof).

```ts
state.genUserSignUpProof(options: {
  epoch?: bigint | number
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
}): Promise<EpochKeyProof>
```

## genEpochKeyLiteProof

Generate a proof that a user controls an epoch key in a certain epoch. Optionally provide a data value to sign. Returns an [`EpochKeyLiteProof`](../circuits-api/epoch-key-lite-proof). This proof will not include a merkle tree proof which makes the proof size smaller than an [`EpochKeyProof`](../circuits-api/epoch-key-proof). It can be used to prove a seen and valid epoch key.

```ts
state.genEpochKeyLiteProof(options: {
  revealNonce?: boolean,
  nonce?: number,
  epoch?: number,
  data?: bigint,
}): Promise<EpochKeyLiteProof>
```
