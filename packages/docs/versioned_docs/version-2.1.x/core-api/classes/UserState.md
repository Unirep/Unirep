---
id: "UserState"
title: "Class: UserState"
sidebar_label: "UserState"
sidebar_position: 0
custom_edit_url: null
---

The user state object is used to manage user state for an attester.
The state is backed by an [anondb](https://github.com/vimwitch/anondb) instance.

**`Example`**

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
  id,
  prover: defaultProver, // a circuit prover
})

// start the synchoronizer deamon
await state.start()
await state.waitForSync()

// stop the synchronizer deamon
state.stop()
```

## Constructors

### constructor

• **new UserState**(`config`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `Object` |
| `config.attesterId?` | `bigint` \| `bigint`[] |
| `config.db?` | `DB` |
| `config.id` | `default` |
| `config.prover` | `Prover` |
| `config.provider?` | `Provider` |
| `config.synchronizer?` | [`Synchronizer`](Synchronizer.md) |
| `config.unirepAddress?` | `string` |

#### Defined in

[packages/core/src/UserState.ts:107](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L107)

## Properties

### \_chainId

• `Private` **\_chainId**: `number`

#### Defined in

[packages/core/src/UserState.ts:62](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L62)

___

### \_db

• `Private` **\_db**: `DB`

#### Defined in

[packages/core/src/UserState.ts:63](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L63)

___

### \_id

• `Private` **\_id**: `default`

#### Defined in

[packages/core/src/UserState.ts:60](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L60)

___

### \_prover

• `Private` **\_prover**: `Prover`

#### Defined in

[packages/core/src/UserState.ts:59](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L59)

___

### \_sync

• `Private` **\_sync**: [`Synchronizer`](Synchronizer.md)

#### Defined in

[packages/core/src/UserState.ts:61](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L61)

## Accessors

### chainId

• `get` **chainId**(): `number`

The current chain ID of UniRep contract.

#### Returns

`number`

#### Defined in

[packages/core/src/UserState.ts:96](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L96)

___

### commitment

• `get` **commitment**(): `bigint`

The [Semaphore](https://semaphore.pse.dev/) identity commitment of the user.

#### Returns

`bigint`

#### Defined in

[packages/core/src/UserState.ts:68](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L68)

___

### db

• `get` **db**(): `DB`

Read the database object.

#### Returns

`DB`

#### Defined in

[packages/core/src/UserState.ts:103](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L103)

___

### id

• `get` **id**(): `default`

The [Semaphore](https://semaphore.pse.dev/) identity of the user.

#### Returns

`default`

#### Defined in

[packages/core/src/UserState.ts:75](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L75)

___

### prover

• `get` **prover**(): `Prover`

The prover object.

#### Returns

`Prover`

#### Defined in

[packages/core/src/UserState.ts:89](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L89)

___

### sync

• `get` **sync**(): [`Synchronizer`](Synchronizer.md)

The underlying synchronizer object.

#### Returns

[`Synchronizer`](Synchronizer.md)

#### Defined in

[packages/core/src/UserState.ts:82](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L82)

## Methods

### \_checkBit

▸ `Private` **_checkBit**(`input`, `bit`): `void`

Check if the input exceeds the maximum bit

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | `bigint` | The input value |
| `bit` | `number` | The bit number |

#### Returns

`void`

#### Defined in

[packages/core/src/UserState.ts:660](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L660)

___

### \_checkChainId

▸ `Private` **_checkChainId**(): `Promise`<`void`\>

Check if a chain ID is set. If a chain ID is not set, it queries the provider and sets chain ID.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/src/UserState.ts:647](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L647)

___

### \_checkEpkNonce

▸ `Private` **_checkEpkNonce**(`epochKeyNonce`): `void`

Check if epoch key nonce is valid. Throws an error if the epoch key nonce is invalid.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `epochKeyNonce` | `number` | The input epoch key nonce to be checked. |

#### Returns

`void`

#### Defined in

[packages/core/src/UserState.ts:624](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L624)

___

### \_checkSync

▸ `Private` **_checkSync**(): `void`

Check if a synchronizer is set. Throws an error if a synchronizer is not set.

#### Returns

`void`

#### Defined in

[packages/core/src/UserState.ts:638](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L638)

___

### \_updateData

▸ `Private` **_updateData**(`data`, `latestTransitionedEpoch`, `attesterId`): `Promise`<`void`\>

Update user state data.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `data` | `bigint`[] | The latest transitioned data. |
| `latestTransitionedEpoch` | `number` | The latest found transitioned epoch. |
| `attesterId` | `string` | The attester ID. |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/src/UserState.ts:376](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L376)

___

### genEpochKeyLiteProof

▸ **genEpochKeyLiteProof**(`options?`): `Promise`<`EpochKeyLiteProof`\>

Generate a proof that a user controls an epoch key in a certain epoch.
Optionally provide a data value to sign.
Returns an [`EpochKeyLiteProof`](https://developer.unirep.io/docs/circuits-api/classes/src.EpochKeyLiteProof.md).

This proof **will not include a merkle tree proof** which makes the proof size smaller than an [`EpochKeyProof`](https://developer.unirep.io/docs/circuits-api/classes/src.EpochKeyProof.md).
It can be used to prove a seen and valid epoch key.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `options` | `Object` | - |
| `options.attesterId?` | `string` \| `bigint` | Indicates for which attester the proof will be used. Default: `this.attesterId` |
| `options.data?` | `bigint` | Indicates if user wants to endorse a 253-bits data. Default: `0`. |
| `options.epoch?` | `number` | The specified epoch. Default: current epoch. |
| `options.nonce?` | `number` | The specified epoch key nonce. Default: `0`. |
| `options.revealNonce?` | `boolean` | Indicates if user wants to reveal epoch key nonce. Default: `false`. |

#### Returns

`Promise`<`EpochKeyLiteProof`\>

The epoch key lite proof of type `EpochKeyLiteProof`.

**`Example`**

```ts
const { publicSignals, proof } = await userState.genEpochKeyLiteProof({
  nonce: 1
})
```

#### Defined in

[packages/core/src/UserState.ts:1026](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L1026)

___

### genEpochKeyProof

▸ **genEpochKeyProof**(`options?`): `Promise`<`EpochKeyProof`\>

Generate a proof that a user controls an epoch key in a certain epoch.
Optionally provide a data value to sign.
Returns an [`EpochKeyProof`](https://developer.unirep.io/docs/circuits-api/classes/src.EpochKeyProof.md).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `options` | `Object` | - |
| `options.attesterId?` | `string` \| `bigint` | Indicates for which attester the proof will be used. Default: `this.attesterId` |
| `options.data?` | `bigint` | Indicates if user wants to endorse a 253-bits data. Default: `0` |
| `options.epoch?` | `number` | The specified epoch. Default: current epoch. |
| `options.nonce?` | `number` | The specified epoch key nonce. Default: `0`. |
| `options.revealNonce?` | `boolean` | Indicates if user wants to reveal epoch key nonce. Default: `false`. |

#### Returns

`Promise`<`EpochKeyProof`\>

The epoch key proof of type `EpochKeyProof`.

**`Example`**

```ts
const { publicSignals, proof } = await userState.genEpochKeyProof({
  nonce: 1
})
```

#### Defined in

[packages/core/src/UserState.ts:963](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L963)

___

### genProveReputationProof

▸ **genProveReputationProof**(`options`): `Promise`<`ReputationProof`\>

Generate a proof of reputation. Returns a [`ReputationProof`](https://developer.unirep.io/docs/circuits-api/classes/src.ReputationProof.md).
:::danger
**Please avoid assigning the `minRep = data[0] - data[1]` or `maxRep = data[1] - data[0]`.**<br/>
The proof could allow a user to accidentally publish their overall reputation (i.e. `data[0]-data[1]`).
Depending on the circumstances (such as the length of the attestation history) this could reveal a user’s epoch key(s) as well.
:::

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `options` | `Object` | - |
| `options.attesterId?` | `string` \| `bigint` | `attesterId` is used to generate proof for certain attester. Default: `this.attesterId` |
| `options.data?` | `string` \| `bigint` | Indicates if user wants to endorse a 253-bits data. Default: `0`. |
| `options.epkNonce?` | `number` | The nonce determines the output of the epoch key. Default: `0`. |
| `options.graffiti?` | `string` \| `bigint` | The graffiti that user wants to prove. It should satisfy: `graffiti == (data[SUM_FIELD_COUNT] / (2 ** REPL_NONCE_BITS))`. Default: `0`. |
| `options.maxRep?` | `string` \| `number` \| `bigint` | The amount of reputation that user wants to prove. It should satisfy: `negRep - posRep >= maxRep`. Default: `0` |
| `options.minRep?` | `string` \| `number` \| `bigint` | The amount of reputation that user wants to prove. It should satisfy: `posRep - negRep >= minRep`. Default: `0` |
| `options.proveZeroRep?` | `boolean` | Indicates if user wants to prove `posRep - negRep == 0`. Default: `0`. |
| `options.revealNonce?` | `boolean` | Indicates if user wants to reveal epoch key nonce. Default: `false`. |

#### Returns

`Promise`<`ReputationProof`\>

The reputation proof of type `ReputationProof`.

**`Example`**

```ts
const {publicSignals, proof} = await userState.genProveReputationProof({
  minRep: 3,
  graffiti: '1234',
})
```

#### Defined in

[packages/core/src/UserState.ts:854](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L854)

___

### genUserSignUpProof

▸ **genUserSignUpProof**(`options?`): `Promise`<`SignupProof`\>

Generate a proof that can be used to signup. Returns a [`SignupProof`](https://developer.unirep.io/docs/circuits-api/classes/src.SignupProof.md)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `options` | `Object` | - |
| `options.attesterId?` | `string` \| `bigint` | Indicates for which attester the proof will be used. Default: `this.attesterId` |
| `options.epoch?` | `number` | Indicates in which epoch the proof will be used. Default: current epoch. |

#### Returns

`Promise`<`SignupProof`\>

The sign up proof of type `SignUpProof`.

**`Example`**

```ts
const { publicSignals, proof } = await userState.genUserSignUpProof()
```

#### Defined in

[packages/core/src/UserState.ts:921](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L921)

___

### genUserStateTransitionProof

▸ **genUserStateTransitionProof**(`options?`): `Promise`<`UserStateTransitionProof`\>

Generate a user state transition proof. Returns a [`UserStateTransitionProof`](https://developer.unirep.io/docs/circuits-api/classes/src.UserStateTransitionProof.md).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `options` | `Object` | - |
| `options.attesterId?` | `string` \| `bigint` | `attesterId` is used to generate proof for certain attester. Default: `this.attesterId`. |
| `options.toEpoch?` | `number` | `toEpoch` is used to indicate in which epoch the proof will be used. Default: current epoch. |

#### Returns

`Promise`<`UserStateTransitionProof`\>

The `UserStateTransitionProof` object.

**`Example`**

```ts
const { publicSignals, proof } = await userState.genUserStateTransitionProof()
```

#### Defined in

[packages/core/src/UserState.ts:714](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L714)

___

### getData

▸ **getData**(`toEpoch?`, `attesterId?`): `Promise`<`bigint`[]\>

Get the data for a user up to and including the provided epoch.
By default data up to and including the current epoch is returned.

:::tip
If you want to make a proof of data make sure to use `getProvableData`.
Data can only be proven once it has been included in a state tree leaf.
Learn more about reputation proofs [here](https://developer.unirep.io/docs/circuits-api/classes/src.ReputationProof.md).
:::

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `toEpoch?` | `number` | The latest epoch that the reputation is accumulated. Default: current epoch. |
| `attesterId` | `string` \| `bigint` | The attester to be queried. Default: `this.sync.attesterId` |

#### Returns

`Promise`<`bigint`[]\>

The data object

#### Defined in

[packages/core/src/UserState.ts:434](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L434)

___

### getDataByEpochKey

▸ **getDataByEpochKey**(`epochKey`, `epoch`, `attesterId?`): `Promise`<`any`[]\>

Get the pending changes to the data owned by an epoch key.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `epochKey` | `string` \| `bigint` | The epoch key to be queried. |
| `epoch` | `number` | The epoch of the epoch key to be queried. |
| `attesterId` | `string` \| `bigint` | The attester to be queried. Default: `this.attesterId` |

#### Returns

`Promise`<`any`[]\>

The data object.

#### Defined in

[packages/core/src/UserState.ts:583](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L583)

___

### getEpochKeyIndex

▸ **getEpochKeyIndex**(`epoch`, `epochKey`, `attesterId`): `Promise`<`number`\>

Get the index of epoch key among all attestations.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `epoch` | `number` | The epoch of the epoch key to be queried. |
| `epochKey` | `string` \| `bigint` | The epoch key to be queried. |
| `attesterId` | `string` \| `bigint` | The attester to be queried. |

#### Returns

`Promise`<`number`\>

The index of the epoch key.

#### Defined in

[packages/core/src/UserState.ts:675](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L675)

___

### getEpochKeys

▸ **getEpochKeys**(`epoch?`, `nonce?`, `attesterId?`): `bigint` \| `bigint`[]

Get epoch keys for the current user, for an epoch.
If a `nonce` value is supplied the return value will be a single epoch key.
Otherwise an array of all epoch keys will be returned.

If no `epoch` is supplied the current epoch will be used (as determined by `synchronizer.calcCurrentEpoch`).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `epoch?` | `number` \| `bigint` | The epoch to be queried. Default: current epoch. |
| `nonce?` | `number` | The specified epoch key nonce. Default: `0`. |
| `attesterId` | `string` \| `bigint` | The attester to be queried. Default: `this.attesterId` |

#### Returns

`bigint` \| `bigint`[]

An epoch key or an array of epoch keys.

#### Defined in

[packages/core/src/UserState.ts:322](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L322)

___

### getProvableData

▸ **getProvableData**(`attesterId?`): `Promise`<`bigint`[]\>

Get the data that can be proven by the user using a state tree leaf.
This is the data up to, but not including, the epoch the user has transitioned into.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `attesterId` | `string` \| `bigint` | The attester to be queried. Default: `this.attesterId` |

#### Returns

`Promise`<`bigint`[]\>

The data object

#### Defined in

[packages/core/src/UserState.ts:569](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L569)

___

### hasSignedUp

▸ **hasSignedUp**(`attesterId?`): `Promise`<`boolean`\>

Query the current database if the [Semaphore](https://semaphore.pse.dev/) identity commitment is stored.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `attesterId` | `string` \| `bigint` | The attester to be queried. Default: `this.attesterId`. |

#### Returns

`Promise`<`boolean`\>

True if user has signed up in unirep contract, false otherwise.

#### Defined in

[packages/core/src/UserState.ts:186](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L186)

___

### latestStateTreeLeafIndex

▸ **latestStateTreeLeafIndex**(`epoch?`, `attesterId?`): `Promise`<`number`\>

Get the latest global state tree leaf index for an epoch.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `epoch?` | `number` | Get the global state tree leaf index of the given epoch. Default: current epoch. |
| `attesterId` | `string` \| `bigint` | The attester to be queried. Default: `this.attesterId` |

#### Returns

`Promise`<`number`\>

The the latest state tree leaf index for an epoch.

#### Defined in

[packages/core/src/UserState.ts:264](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L264)

___

### latestTransitionedEpoch

▸ **latestTransitionedEpoch**(`attesterId?`): `Promise`<`number`\>

Query the current database for a user's signup event or latest user state transition [nullifier](https://developer.unirep.io/docs/protocol/nullifiers).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `attesterId` | `string` \| `bigint` | The attester to be queried. Default: `this.attesterId` |

#### Returns

`Promise`<`number`\>

The latest epoch where a user performed a user state transition.

#### Defined in

[packages/core/src/UserState.ts:205](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L205)

___

### parseReplData

▸ **parseReplData**(`replData`): `Object`

This function is used to parse replacement data field to be `index` and `data`. See [replacement data field](https://developer.unirep.io/docs/protocol/data#replacement-field).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `replData` | `bigint` | The raw data which is processed on-chain. |

#### Returns

`Object`

The parsed data and the data index (nonce).

| Name | Type |
| :------ | :------ |
| `data` | `bigint` |
| `nonce` | `bigint` |

#### Defined in

[packages/core/src/UserState.ts:358](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L358)

___

### start

▸ **start**(): `Promise`<`void`\>

Start the synchronizer daemon.
Start polling the blockchain for new events. If we're behind the HEAD block we'll poll many times quickly

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/src/UserState.ts:160](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L160)

___

### stop

▸ **stop**(): `void`

Stop synchronizing with Unirep contract.

#### Returns

`void`

#### Defined in

[packages/core/src/UserState.ts:177](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L177)

___

### waitForSync

▸ **waitForSync**(`blockNumber?`): `Promise`<`void`\>

Wait for the synchronizer to sync up to a certain block.
By default this will wait until the current latest known block (according to the provider).

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `blockNumber?` | `number` | The block number to be synced to. |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/src/UserState.ts:170](https://github.com/Unirep/Unirep/blob/60105749/packages/core/src/UserState.ts#L170)
