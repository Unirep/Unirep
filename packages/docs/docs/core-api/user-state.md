---
title: User State
---

The user state object is used to manage user state for an attester. The state is backed by an [anondb](https://github.com/vimwitch/anondb) instance.

```ts
import { UserState, schema } from '@unirep/core'
import { SQLiteConnector } from 'anondb/node'
import { defaultProver } from '@unirep/circuits/provers/defaultProver'

const db = new SQLiteConnector(schema, ':memory:')
const state = new UserState({
  db,
  prover: defaultProver, // a circuit prover
  unirepAddress: '0xaabbccaabbccaabbccaabbccaabbccaabbccaaaa',
  provider, // an ethers.js provider
  attesterId: ATTESTER_ADDRESS,
  _id: identity, // a user identity that will be used for making proofs
})
```

:::info
The `UserState` class is a subclass of [`Synchronizer`](./synchronizer).
:::

## constructor

```ts
constructor(config: {
    db: DB
    prover: Prover
    unirepContract: ethers.Contract
    _id: ZkIdentity
    attesterId: bigint
}) {
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

## getRep

Get the reputation balance for the user up to and including the provided epoch. By default reputation up to and including the current epoch is returned.

:::tip
If you want to make a proof of reputation make sure to use [`getProvableRep`](#getprovablerep) to show the user balance. Reputation can only be proven once it has been included in a state tree leaf. Learn more about reputation proofs [here](../circuits-api/circuits#prove-reputation-proof).
:::

```ts
state.getRep(toEpoch?: number): Promise<Reputation>
```

## getProvableRep

Get the reputation balance that can be proven by the user in a [reputation proof](../circuits-api/circuits#prove-reputation-proof). This is the balance up to, but not including, the epoch the user has transitioned into.

```ts
state.getProvableRep(): Promise<Reputation>
```

## getRepByEpochKey

Get the rep owed to an epoch key in a certain epoch.

```ts
state.getRepByEpochKey(epochKey: bigint, epoch: number): Promise<Reputation>
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
  epkNonce: number,
  minRep?: number
  graffitiPreImage?: bigint | string
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

## genAggregateEpochKeysProof

Generate a proof that can be used to update the epoch tree root on chain.

:::info

TODO: See the epoch tree section for more info

:::

:::warning

Users shouldn't be generating this proof.

:::

```ts
state.genAggregateEpochKeysProof(options: {
    epochKeys: bigint[],
    newBalances: Reputation[],
    hashchainIndex: bigint,
    epoch?: number
}): Promise<AggregateEpochKeysProof>
```
