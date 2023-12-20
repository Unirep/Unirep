---
id: "Synchronizer"
title: "Class: Synchronizer"
sidebar_label: "Synchronizer"
sidebar_position: 0
custom_edit_url: null
---

The synchronizer is used to construct the Unirep state. After events are emitted from the Unirep contract,
the synchronizer will verify the events and then save the states.

**`Example`**

```ts
import { Synchronizer } from '@unirep/core'

const state = new Synchronizer({
  unirepAddress: '0xaabbccaabbccaabbccaabbccaabbccaabbccaaaa',
  provider, // an ethers.js provider
})

// start the synchronizer deamon
await state.start()
await state.waitForSync()

// stop the synchronizer deamon
state.stop()
```

## Hierarchy

- `EventEmitter`

  ↳ **`Synchronizer`**

## Constructors

### constructor

• **new Synchronizer**(`config`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `Object` |
| `config.attesterId?` | `bigint` \| `bigint`[] |
| `config.db?` | `DB` |
| `config.provider` | `Provider` |
| `config.unirepAddress` | `string` |

#### Overrides

EventEmitter.constructor

#### Defined in

[packages/core/src/Synchronizer.ts:164](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L164)

## Properties

### \_attesterId

• `Private` **\_attesterId**: `bigint`[] = `[]`

The array of attester IDs which are synchronized in the synchronizer.

#### Defined in

[packages/core/src/Synchronizer.ts:79](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L79)

___

### \_attesterSettings

• `Private` **\_attesterSettings**: `Object` = `{}`

The settings of attesters. There are `startTimestamp` and `epochLength` of each attester.

#### Index signature

▪ [key: `string`]: `AttesterSetting`

#### Defined in

[packages/core/src/Synchronizer.ts:89](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L89)

___

### \_blockEnd

• `Private` **\_blockEnd**: `Number` = `0`

The latest completed block number.

#### Defined in

[packages/core/src/Synchronizer.ts:162](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L162)

___

### \_blocks

• `Private` **\_blocks**: `any`[] = `[]`

Unprocessed events.

#### Defined in

[packages/core/src/Synchronizer.ts:157](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L157)

___

### \_db

• `Private` **\_db**: `DB`

The database object.

#### Defined in

[packages/core/src/Synchronizer.ts:64](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L64)

___

### \_eventFilters

• `Private` **\_eventFilters**: `any`

The mapping of a contract address and its event filters.

#### Defined in

[packages/core/src/Synchronizer.ts:115](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L115)

___

### \_eventHandlers

• `Private` **\_eventHandlers**: `any`

The mapping of the event name and its handler

#### Defined in

[packages/core/src/Synchronizer.ts:110](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L110)

___

### \_provider

• `Private` **\_provider**: `Provider`

The provider which is connected in the synchronizer.

#### Defined in

[packages/core/src/Synchronizer.ts:69](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L69)

___

### \_settings

• `Private` **\_settings**: `any`

The circuits settings.

#### Defined in

[packages/core/src/Synchronizer.ts:84](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L84)

___

### \_syncAll

• `Private` **\_syncAll**: `boolean` = `false`

Indicates if the synchronizer is to sync with all Unirep attesters.

#### Defined in

[packages/core/src/Synchronizer.ts:104](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L104)

___

### \_unirepContract

• `Private` **\_unirepContract**: `Contract`

The UniRep smart contract object which is connected in the synchronizer.

#### Defined in

[packages/core/src/Synchronizer.ts:74](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L74)

___

### blockRate

• **blockRate**: `number` = `10000`

How many blocks the synchronizer will query on each poll. Default: `100000`

#### Defined in

[packages/core/src/Synchronizer.ts:129](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L129)

___

### defaultEpochTreeLeaf

• `Protected` **defaultEpochTreeLeaf**: `bigint`

The default zero [epoch tree](https://developer.unirep.io/docs/protocol/trees#epoch-tree) leaf.

#### Defined in

[packages/core/src/Synchronizer.ts:99](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L99)

___

### defaultStateTreeLeaf

• `Protected` **defaultStateTreeLeaf**: `bigint`

The default zero [state tree](https://developer.unirep.io/docs/protocol/trees#state-tree) leaf.

#### Defined in

[packages/core/src/Synchronizer.ts:94](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L94)

___

### lock

• `Private` **lock**: `any`

Lock on poll event.

#### Defined in

[packages/core/src/Synchronizer.ts:146](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L146)

___

### pollId

• `Private` **pollId**: ``null`` \| `string` = `null`

The id of the poll event.

#### Defined in

[packages/core/src/Synchronizer.ts:121](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L121)

___

### pollRate

• **pollRate**: `number` = `5000`

How frequently the synchronizer will poll the blockchain for new events (specified in milliseconds). Default: `5000`

#### Defined in

[packages/core/src/Synchronizer.ts:125](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L125)

___

### promises

• `Private` **promises**: `any`[] = `[]`

Load events promises.

#### Defined in

[packages/core/src/Synchronizer.ts:152](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L152)

___

### setupComplete

• `Private` **setupComplete**: `boolean` = `false`

Check if a setup is completed or not.

#### Defined in

[packages/core/src/Synchronizer.ts:135](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L135)

___

### setupPromise

• `Private` **setupPromise**: `any`

If a setup is not completed, there will be a setup promise.

#### Defined in

[packages/core/src/Synchronizer.ts:140](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L140)

___

### captureRejectionSymbol

▪ `Static` `Readonly` **captureRejectionSymbol**: typeof [`captureRejectionSymbol`](Synchronizer.md#capturerejectionsymbol)

Value: `Symbol.for('nodejs.rejection')`

See how to write a custom `rejection handler`.

**`Since`**

v13.4.0, v12.16.0

#### Inherited from

EventEmitter.captureRejectionSymbol

#### Defined in

node_modules/@types/node/events.d.ts:402

___

### captureRejections

▪ `Static` **captureRejections**: `boolean`

Value: [boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type)

Change the default `captureRejections` option on all new `EventEmitter` objects.

**`Since`**

v13.4.0, v12.16.0

#### Inherited from

EventEmitter.captureRejections

#### Defined in

node_modules/@types/node/events.d.ts:409

___

### defaultMaxListeners

▪ `Static` **defaultMaxListeners**: `number`

By default, a maximum of `10` listeners can be registered for any single
event. This limit can be changed for individual `EventEmitter` instances
using the `emitter.setMaxListeners(n)` method. To change the default
for _all_`EventEmitter` instances, the `events.defaultMaxListeners`property can be used. If this value is not a positive number, a `RangeError`is thrown.

Take caution when setting the `events.defaultMaxListeners` because the
change affects _all_`EventEmitter` instances, including those created before
the change is made. However, calling `emitter.setMaxListeners(n)` still has
precedence over `events.defaultMaxListeners`.

This is not a hard limit. The `EventEmitter` instance will allow
more listeners to be added but will output a trace warning to stderr indicating
that a "possible EventEmitter memory leak" has been detected. For any single`EventEmitter`, the `emitter.getMaxListeners()` and `emitter.setMaxListeners()`methods can be used to
temporarily avoid this warning:

```js
import { EventEmitter } from 'node:events';
const emitter = new EventEmitter();
emitter.setMaxListeners(emitter.getMaxListeners() + 1);
emitter.once('event', () => {
  // do stuff
  emitter.setMaxListeners(Math.max(emitter.getMaxListeners() - 1, 0));
});
```

The `--trace-warnings` command-line flag can be used to display the
stack trace for such warnings.

The emitted warning can be inspected with `process.on('warning')` and will
have the additional `emitter`, `type`, and `count` properties, referring to
the event emitter instance, the event's name and the number of attached
listeners, respectively.
Its `name` property is set to `'MaxListenersExceededWarning'`.

**`Since`**

v0.11.2

#### Inherited from

EventEmitter.defaultMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:446

___

### errorMonitor

▪ `Static` `Readonly` **errorMonitor**: typeof [`errorMonitor`](Synchronizer.md#errormonitor)

This symbol shall be used to install a listener for only monitoring `'error'`events. Listeners installed using this symbol are called before the regular`'error'` listeners are called.

Installing a listener using this symbol does not change the behavior once an`'error'` event is emitted. Therefore, the process will still crash if no
regular `'error'` listener is installed.

**`Since`**

v13.6.0, v12.17.0

#### Inherited from

EventEmitter.errorMonitor

#### Defined in

node_modules/@types/node/events.d.ts:395

## Accessors

### attesterId

• `get` **attesterId**(): `bigint`

The default attester ID that is set when constructed.
If there is a list of attester IDs, then the first one will be the default attester ID.
If no attester ID is given during construction, all attesters will be synchronized and the default `attesterId` will be `BigInt(0)`.

:::caution
The default attester ID should be checked carefully while synchronizing more than one attester.
The default attester ID can be changed with [setAttesterId](#setattesterid).
:::

#### Returns

`bigint`

#### Defined in

[packages/core/src/Synchronizer.ts:318](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L318)

___

### attestersOrClauses

• `get` **attestersOrClauses**(): `any`[]

#### Returns

`any`[]

#### Defined in

[packages/core/src/Synchronizer.ts:323](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L323)

___

### contracts

• `get` **contracts**(): `Object`

Overwrite this to query events in different attester addresses.

#### Returns

`Object`

**`Example`**

```ts
export class AppSynchronizer extends Synchronizer {
...
  get contracts(){
    return {
      ...super.contracts,
      [this.appContract.address]: {
          contract: this.appContract,
          eventNames: [
            'Event1',
            'Event2',
            'Event3',
            ...
          ]
      }
  }
}
```

#### Defined in

[packages/core/src/Synchronizer.ts:691](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L691)

___

### db

• `get` **db**(): `DB`

Read the database object.

#### Returns

`DB`

#### Defined in

[packages/core/src/Synchronizer.ts:283](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L283)

___

### provider

• `get` **provider**(): `Provider`

Read the provider which is connected in the synchronizer.

#### Returns

`Provider`

#### Defined in

[packages/core/src/Synchronizer.ts:290](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L290)

___

### settings

• `get` **settings**(): `any`

Read the settings of the UniRep smart contract.

#### Returns

`any`

#### Defined in

[packages/core/src/Synchronizer.ts:304](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L304)

___

### unirepContract

• `get` **unirepContract**(): `Contract`

Read the UniRep smart contract object which is connected in the synchronizer.

#### Returns

`Contract`

#### Defined in

[packages/core/src/Synchronizer.ts:297](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L297)

## Methods

### [captureRejectionSymbol]

▸ `Optional` **[captureRejectionSymbol]**(`error`, `event`, `...args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `error` | `Error` |
| `event` | `string` |
| `...args` | `any`[] |

#### Returns

`void`

#### Inherited from

EventEmitter.[captureRejectionSymbol]

#### Defined in

node_modules/@types/node/events.d.ts:112

___

### \_findStartBlock

▸ `Private` **_findStartBlock**(): `Promise`<`void`\>

Find the attester's genesis block in the Unirep smart contract.
Then store the `startTimestamp` and `epochLength` in database and in the memory.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/src/Synchronizer.ts:416](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L416)

___

### \_poll

▸ `Private` **_poll**(): `Promise`<{ `complete`: `boolean`  }\>

Execute polling events and processing events.

#### Returns

`Promise`<{ `complete`: `boolean`  }\>

#### Defined in

[packages/core/src/Synchronizer.ts:536](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L536)

___

### \_setup

▸ **_setup**(): `Promise`<`void`\>

Query settings from smart contract and setup event handlers.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/src/Synchronizer.ts:395](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L395)

___

### addListener

▸ **addListener**(`eventName`, `listener`): [`Synchronizer`](Synchronizer.md)

Alias for `emitter.on(eventName, listener)`.

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`Synchronizer`](Synchronizer.md)

**`Since`**

v0.1.26

#### Inherited from

EventEmitter.addListener

#### Defined in

node_modules/@types/node/events.d.ts:510

___

### attesterExist

▸ **attesterExist**(`attesterId`): `boolean`

Check if attester events are synchronized in this synchronizer.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `attesterId` | `string` \| `bigint` | The queried attester ID. |

#### Returns

`boolean`

True if the attester events are synced, false otherwise.

#### Defined in

[packages/core/src/Synchronizer.ts:356](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L356)

___

### buildEventHandlers

▸ `Private` **buildEventHandlers**(): `void`

#### Returns

`void`

#### Defined in

[packages/core/src/Synchronizer.ts:205](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L205)

___

### calcCurrentEpoch

▸ **calcCurrentEpoch**(`attesterId?`): `number`

Calculate the current epoch determining the amount of time since the attester registration timestamp.
This operation is **synchronous** and does not involve any database operations.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `attesterId` | `string` \| `bigint` | The queried attester Id. |

#### Returns

`number`

The number of current calculated epoch.

#### Defined in

[packages/core/src/Synchronizer.ts:818](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L818)

___

### calcEpochRemainingTime

▸ **calcEpochRemainingTime**(`attesterId?`): `number`

Calculate the amount of time remaining in the current epoch. This operation is **synchronous** and does not involve any database operations.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `attesterId` | `string` \| `bigint` | The queried attester Id. |

#### Returns

`number`

Current calculated time to the next epoch.

#### Defined in

[packages/core/src/Synchronizer.ts:835](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L835)

___

### checkAttesterId

▸ **checkAttesterId**(`attesterId`): `void`

Check if attester events are synchronized in this synchronizer. It will throw an error if the attester is not synchronized.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `attesterId` | `string` \| `bigint` | The queried attester ID. |

#### Returns

`void`

#### Defined in

[packages/core/src/Synchronizer.ts:364](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L364)

___

### emit

▸ **emit**(`eventName`, `...args`): `boolean`

Synchronously calls each of the listeners registered for the event named`eventName`, in the order they were registered, passing the supplied arguments
to each.

Returns `true` if the event had listeners, `false` otherwise.

```js
import { EventEmitter } from 'node:events';
const myEmitter = new EventEmitter();

// First listener
myEmitter.on('event', function firstListener() {
  console.log('Helloooo! first listener');
});
// Second listener
myEmitter.on('event', function secondListener(arg1, arg2) {
  console.log(`event with parameters ${arg1}, ${arg2} in second listener`);
});
// Third listener
myEmitter.on('event', function thirdListener(...args) {
  const parameters = args.join(', ');
  console.log(`event with parameters ${parameters} in third listener`);
});

console.log(myEmitter.listeners('event'));

myEmitter.emit('event', 1, 2, 3, 4, 5);

// Prints:
// [
//   [Function: firstListener],
//   [Function: secondListener],
//   [Function: thirdListener]
// ]
// Helloooo! first listener
// event with parameters 1, 2 in second listener
// event with parameters 1, 2, 3, 4, 5 in third listener
```

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` \| `symbol` |
| `...args` | `any`[] |

#### Returns

`boolean`

**`Since`**

v0.1.26

#### Inherited from

EventEmitter.emit

#### Defined in

node_modules/@types/node/events.d.ts:772

___

### epochTreeProof

▸ **epochTreeProof**(`epoch`, `leafIndex`, `attesterId?`): `Promise`<`MerkleProof`\>

Build a merkle inclusion proof for the tree from a certain epoch.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `epoch` | `number` | The epoch to be queried. |
| `leafIndex` | `any` | The leaf index to be queried. |
| `attesterId` | `string` \| `bigint` | The attester to be queried. |

#### Returns

`Promise`<`MerkleProof`\>

The merkle proof of the epoch tree index.

#### Defined in

[packages/core/src/Synchronizer.ts:879](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L879)

___

### epochTreeRoot

▸ **epochTreeRoot**(`epoch`, `attesterId?`): `Promise`<`any`\>

Get the epoch tree root for a certain epoch.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `epoch` | `number` | The epoch to be queried. |
| `attesterId` | `string` \| `bigint` | The attester to be queried. |

#### Returns

`Promise`<`any`\>

The epoch tree root.

#### Defined in

[packages/core/src/Synchronizer.ts:865](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L865)

___

### epochTreeRootExists

▸ **epochTreeRootExists**(`root`, `epoch`, `attesterId?`): `Promise`<`boolean`\>

Check if the epoch tree root is stored in the database.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `root` | `string` \| `bigint` | The queried epoch tree root |
| `epoch` | `number` | The queried epoch of the epoch tree |
| `attesterId` | `string` \| `bigint` | The attester to be queried. |

#### Returns

`Promise`<`boolean`\>

True if the epoch tree root is in the database, false otherwise.

**`Note`**

:::caution
Epoch tree root of current epoch might change frequently and the tree root is not stored everytime.
Try use this function when querying the epoch tree in the **previous epoch**.
:::

#### Defined in

[packages/core/src/Synchronizer.ts:1017](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L1017)

___

### eventNames

▸ **eventNames**(): (`string` \| `symbol`)[]

Returns an array listing the events for which the emitter has registered
listeners. The values in the array are strings or `Symbol`s.

```js
import { EventEmitter } from 'node:events';

const myEE = new EventEmitter();
myEE.on('foo', () => {});
myEE.on('bar', () => {});

const sym = Symbol('symbol');
myEE.on(sym, () => {});

console.log(myEE.eventNames());
// Prints: [ 'foo', 'bar', Symbol(symbol) ]
```

#### Returns

(`string` \| `symbol`)[]

**`Since`**

v6.0.0

#### Inherited from

EventEmitter.eventNames

#### Defined in

node_modules/@types/node/events.d.ts:835

___

### genEpochTree

▸ **genEpochTree**(`epoch`, `attesterId?`): `Promise`<`IncrementalMerkleTree`\>

Build the latest epoch tree for a certain epoch.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `epoch` | `number` \| `bigint` | The epoch to be queried. |
| `attesterId` | `string` \| `bigint` | The attester to be queried. |

#### Returns

`Promise`<`IncrementalMerkleTree`\>

The epoch tree.

#### Defined in

[packages/core/src/Synchronizer.ts:961](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L961)

___

### genHistoryTree

▸ **genHistoryTree**(`attesterId?`): `Promise`<`IncrementalMerkleTree`\>

Build the latest history tree for the current attester.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `attesterId` | `string` \| `bigint` | The attester to be queried. |

#### Returns

`Promise`<`IncrementalMerkleTree`\>

The history tree.

#### Defined in

[packages/core/src/Synchronizer.ts:935](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L935)

___

### genStateTree

▸ **genStateTree**(`epoch`, `attesterId?`): `Promise`<`IncrementalMerkleTree`\>

Build the latest state tree for a certain epoch.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `epoch` | `number` \| `bigint` | The epoch to be queried. |
| `attesterId` | `string` \| `bigint` | The attester to be queried. |

#### Returns

`Promise`<`IncrementalMerkleTree`\>

The state tree.

#### Defined in

[packages/core/src/Synchronizer.ts:905](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L905)

___

### getMaxListeners

▸ **getMaxListeners**(): `number`

Returns the current max listener value for the `EventEmitter` which is either
set by `emitter.setMaxListeners(n)` or defaults to [defaultMaxListeners](Synchronizer.md#defaultmaxlisteners).

#### Returns

`number`

**`Since`**

v1.0.0

#### Inherited from

EventEmitter.getMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:687

___

### handleAttestation

▸ **handleAttestation**(`args`): `Promise`<`undefined` \| ``true``\>

Handle attestation event

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `args` | `EventHandlerArgs` | `EventHandlerArgs` type arguments. |

#### Returns

`Promise`<`undefined` \| ``true``\>

True if succeeds, false otherwise.

#### Defined in

[packages/core/src/Synchronizer.ts:1139](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L1139)

___

### handleAttesterSignedUp

▸ **handleAttesterSignedUp**(`args`): `Promise`<`undefined` \| ``true``\>

Handle attester signup event

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `args` | `EventHandlerArgs` | `EventHandlerArgs` type arguments. |

#### Returns

`Promise`<`undefined` \| ``true``\>

True if succeeds, false otherwise.

#### Defined in

[packages/core/src/Synchronizer.ts:1279](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L1279)

___

### handleEpochEnded

▸ **handleEpochEnded**(`args`): `Promise`<`undefined` \| ``true``\>

Handle epoch ended event

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `args` | `EventHandlerArgs` | `EventHandlerArgs` type arguments. |

#### Returns

`Promise`<`undefined` \| ``true``\>

True if succeeds, false otherwise.

#### Defined in

[packages/core/src/Synchronizer.ts:1229](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L1229)

___

### handleEpochTreeLeaf

▸ **handleEpochTreeLeaf**(`args`): `Promise`<`undefined` \| ``true``\>

Handle epoch tree leaf event

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `args` | `EventHandlerArgs` | `EventHandlerArgs` type arguments. |

#### Returns

`Promise`<`undefined` \| ``true``\>

True if succeeds, false otherwise.

#### Defined in

[packages/core/src/Synchronizer.ts:1078](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L1078)

___

### handleHistoryTreeLeaf

▸ **handleHistoryTreeLeaf**(`args`): `Promise`<`undefined` \| ``true``\>

Handle history tree leaf event

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `args` | `EventHandlerArgs` | `EventHandlerArgs` type arguments. |

#### Returns

`Promise`<`undefined` \| ``true``\>

True if succeeds, false otherwise.

#### Defined in

[packages/core/src/Synchronizer.ts:1322](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L1322)

___

### handleStateTreeLeaf

▸ **handleStateTreeLeaf**(`args`): `Promise`<`undefined` \| ``true``\>

Handle state tree leaf event

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `args` | `EventHandlerArgs` | `EventHandlerArgs` type arguments. |

#### Returns

`Promise`<`undefined` \| ``true``\>

True if succeeds, false otherwise.

#### Defined in

[packages/core/src/Synchronizer.ts:1051](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L1051)

___

### handleUserSignedUp

▸ **handleUserSignedUp**(`args`): `Promise`<`undefined` \| ``true``\>

Handle user signup event

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `args` | `EventHandlerArgs` | `EventHandlerArgs` type arguments. |

#### Returns

`Promise`<`undefined` \| ``true``\>

True if succeeds, false otherwise.

#### Defined in

[packages/core/src/Synchronizer.ts:1111](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L1111)

___

### handleUserStateTransitioned

▸ **handleUserStateTransitioned**(`args`): `Promise`<`undefined` \| ``true``\>

Handle user state transition event

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `args` | `EventHandlerArgs` | `EventHandlerArgs` type arguments. |

#### Returns

`Promise`<`undefined` \| ``true``\>

True if succeeds, false otherwise.

#### Defined in

[packages/core/src/Synchronizer.ts:1197](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L1197)

___

### listenerCount

▸ **listenerCount**(`eventName`, `listener?`): `number`

Returns the number of listeners listening for the event named `eventName`.
If `listener` is provided, it will return how many times the listener is found
in the list of the listeners of the event.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` \| `symbol` | The name of the event being listened for |
| `listener?` | `Function` | The event handler function |

#### Returns

`number`

**`Since`**

v3.2.0

#### Inherited from

EventEmitter.listenerCount

#### Defined in

node_modules/@types/node/events.d.ts:781

___

### listeners

▸ **listeners**(`eventName`): `Function`[]

Returns a copy of the array of listeners for the event named `eventName`.

```js
server.on('connection', (stream) => {
  console.log('someone connected!');
});
console.log(util.inspect(server.listeners('connection')));
// Prints: [ [Function] ]
```

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` \| `symbol` |

#### Returns

`Function`[]

**`Since`**

v0.1.26

#### Inherited from

EventEmitter.listeners

#### Defined in

node_modules/@types/node/events.d.ts:700

___

### loadBlocks

▸ **loadBlocks**(`n`): `Promise`<`void`\>

Load more events from the smart contract.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `n` | `number` | How many blocks will be loaded. |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/src/Synchronizer.ts:591](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L591)

___

### loadCurrentEpoch

▸ **loadCurrentEpoch**(`attesterId?`): `Promise`<`number`\>

Load the current epoch number from the blockchain.

:::tip
Use this function in test environments where the blockchain timestamp may not match the real timestamp (e.g. due to snapshot/revert patterns).
:::

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `attesterId` | `string` \| `bigint` | The queried attester Id. |

#### Returns

`Promise`<`number`\>

The number of current epoch on-chain.

#### Defined in

[packages/core/src/Synchronizer.ts:854](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L854)

___

### loadNewEvents

▸ **loadNewEvents**(`fromBlock`, `toBlock`): `Promise`<`any`[]\>

Load new event from smart contract.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `fromBlock` | `number` | From which block number. |
| `toBlock` | `number` | To which block number. |

#### Returns

`Promise`<`any`[]\>

All events in the block range.

#### Defined in

[packages/core/src/Synchronizer.ts:637](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L637)

___

### nullifierExist

▸ **nullifierExist**(`nullifier`): `Promise`<`any`\>

Determine if a [nullifier](https://developer.unirep.io/docs/protocol/nullifiers) exists. All nullifiers are stored in a single mapping and expected to be globally unique.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `nullifier` | `any` | A nullifier to be queried. |

#### Returns

`Promise`<`any`\>

True if the nullifier exists on-chain before, false otherwise.

#### Defined in

[packages/core/src/Synchronizer.ts:894](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L894)

___

### numStateTreeLeaves

▸ **numStateTreeLeaves**(`epoch`, `attesterId?`): `Promise`<`number`\>

Get the number of state tree leaves in a certain epoch.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `epoch` | `number` | The queried epoch. |
| `attesterId` | `string` \| `bigint` | - |

#### Returns

`Promise`<`number`\>

The number of the state tree leaves.

#### Defined in

[packages/core/src/Synchronizer.ts:1034](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L1034)

___

### off

▸ **off**(`eventName`, `listener`): [`Synchronizer`](Synchronizer.md)

Alias for `emitter.removeListener()`.

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`Synchronizer`](Synchronizer.md)

**`Since`**

v10.0.0

#### Inherited from

EventEmitter.off

#### Defined in

node_modules/@types/node/events.d.ts:660

___

### on

▸ **on**(`eventName`, `listener`): [`Synchronizer`](Synchronizer.md)

Adds the `listener` function to the end of the listeners array for the
event named `eventName`. No checks are made to see if the `listener` has
already been added. Multiple calls passing the same combination of `eventName`and `listener` will result in the `listener` being added, and called, multiple
times.

```js
server.on('connection', (stream) => {
  console.log('someone connected!');
});
```

Returns a reference to the `EventEmitter`, so that calls can be chained.

By default, event listeners are invoked in the order they are added. The`emitter.prependListener()` method can be used as an alternative to add the
event listener to the beginning of the listeners array.

```js
import { EventEmitter } from 'node:events';
const myEE = new EventEmitter();
myEE.on('foo', () => console.log('a'));
myEE.prependListener('foo', () => console.log('b'));
myEE.emit('foo');
// Prints:
//   b
//   a
```

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` \| `symbol` | The name of the event. |
| `listener` | (...`args`: `any`[]) => `void` | The callback function |

#### Returns

[`Synchronizer`](Synchronizer.md)

**`Since`**

v0.1.101

#### Inherited from

EventEmitter.on

#### Defined in

node_modules/@types/node/events.d.ts:542

___

### once

▸ **once**(`eventName`, `listener`): [`Synchronizer`](Synchronizer.md)

Adds a **one-time**`listener` function for the event named `eventName`. The
next time `eventName` is triggered, this listener is removed and then invoked.

```js
server.once('connection', (stream) => {
  console.log('Ah, we have our first user!');
});
```

Returns a reference to the `EventEmitter`, so that calls can be chained.

By default, event listeners are invoked in the order they are added. The`emitter.prependOnceListener()` method can be used as an alternative to add the
event listener to the beginning of the listeners array.

```js
import { EventEmitter } from 'node:events';
const myEE = new EventEmitter();
myEE.once('foo', () => console.log('a'));
myEE.prependOnceListener('foo', () => console.log('b'));
myEE.emit('foo');
// Prints:
//   b
//   a
```

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` \| `symbol` | The name of the event. |
| `listener` | (...`args`: `any`[]) => `void` | The callback function |

#### Returns

[`Synchronizer`](Synchronizer.md)

**`Since`**

v0.3.0

#### Inherited from

EventEmitter.once

#### Defined in

node_modules/@types/node/events.d.ts:572

___

### poll

▸ **poll**(): `Promise`<{ `complete`: `boolean`  }\>

Manually poll for new events.
Returns a boolean indicating whether the synchronizer has synced to the head of the blockchain.

#### Returns

`Promise`<{ `complete`: `boolean`  }\>

#### Defined in

[packages/core/src/Synchronizer.ts:528](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L528)

___

### prependListener

▸ **prependListener**(`eventName`, `listener`): [`Synchronizer`](Synchronizer.md)

Adds the `listener` function to the _beginning_ of the listeners array for the
event named `eventName`. No checks are made to see if the `listener` has
already been added. Multiple calls passing the same combination of `eventName`and `listener` will result in the `listener` being added, and called, multiple
times.

```js
server.prependListener('connection', (stream) => {
  console.log('someone connected!');
});
```

Returns a reference to the `EventEmitter`, so that calls can be chained.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` \| `symbol` | The name of the event. |
| `listener` | (...`args`: `any`[]) => `void` | The callback function |

#### Returns

[`Synchronizer`](Synchronizer.md)

**`Since`**

v6.0.0

#### Inherited from

EventEmitter.prependListener

#### Defined in

node_modules/@types/node/events.d.ts:799

___

### prependOnceListener

▸ **prependOnceListener**(`eventName`, `listener`): [`Synchronizer`](Synchronizer.md)

Adds a **one-time**`listener` function for the event named `eventName` to the _beginning_ of the listeners array. The next time `eventName` is triggered, this
listener is removed, and then invoked.

```js
server.prependOnceListener('connection', (stream) => {
  console.log('Ah, we have our first user!');
});
```

Returns a reference to the `EventEmitter`, so that calls can be chained.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `eventName` | `string` \| `symbol` | The name of the event. |
| `listener` | (...`args`: `any`[]) => `void` | The callback function |

#### Returns

[`Synchronizer`](Synchronizer.md)

**`Since`**

v6.0.0

#### Inherited from

EventEmitter.prependOnceListener

#### Defined in

node_modules/@types/node/events.d.ts:815

___

### processEvents

▸ `Private` **processEvents**(`events`): `Promise`<`void`\>

Process events with each event handler.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `events` | `Event`[] | The array of events will be proccessed. |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/src/Synchronizer.ts:713](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L713)

___

### rawListeners

▸ **rawListeners**(`eventName`): `Function`[]

Returns a copy of the array of listeners for the event named `eventName`,
including any wrappers (such as those created by `.once()`).

```js
import { EventEmitter } from 'node:events';
const emitter = new EventEmitter();
emitter.once('log', () => console.log('log once'));

// Returns a new Array with a function `onceWrapper` which has a property
// `listener` which contains the original listener bound above
const listeners = emitter.rawListeners('log');
const logFnWrapper = listeners[0];

// Logs "log once" to the console and does not unbind the `once` event
logFnWrapper.listener();

// Logs "log once" to the console and removes the listener
logFnWrapper();

emitter.on('log', () => console.log('log persistently'));
// Will return a new Array with a single function bound by `.on()` above
const newListeners = emitter.rawListeners('log');

// Logs "log persistently" twice
newListeners[0]();
emitter.emit('log');
```

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` \| `symbol` |

#### Returns

`Function`[]

**`Since`**

v9.4.0

#### Inherited from

EventEmitter.rawListeners

#### Defined in

node_modules/@types/node/events.d.ts:731

___

### readCurrentEpoch

▸ **readCurrentEpoch**(`attesterId?`): `Promise`<`any`\>

Get the latest processed epoch from the database.

:::caution
This value may mismatch the onchain value depending on synchronization status.
:::

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `attesterId` | `string` \| `bigint` | The queried attester Id. |

#### Returns

`Promise`<`any`\>

`{number: number, sealed: boolean}`

#### Defined in

[packages/core/src/Synchronizer.ts:795](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L795)

___

### removeAllListeners

▸ **removeAllListeners**(`event?`): [`Synchronizer`](Synchronizer.md)

Removes all listeners, or those of the specified `eventName`.

It is bad practice to remove listeners added elsewhere in the code,
particularly when the `EventEmitter` instance was created by some other
component or module (e.g. sockets or file streams).

Returns a reference to the `EventEmitter`, so that calls can be chained.

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | `string` \| `symbol` |

#### Returns

[`Synchronizer`](Synchronizer.md)

**`Since`**

v0.1.26

#### Inherited from

EventEmitter.removeAllListeners

#### Defined in

node_modules/@types/node/events.d.ts:671

___

### removeListener

▸ **removeListener**(`eventName`, `listener`): [`Synchronizer`](Synchronizer.md)

Removes the specified `listener` from the listener array for the event named`eventName`.

```js
const callback = (stream) => {
  console.log('someone connected!');
};
server.on('connection', callback);
// ...
server.removeListener('connection', callback);
```

`removeListener()` will remove, at most, one instance of a listener from the
listener array. If any single listener has been added multiple times to the
listener array for the specified `eventName`, then `removeListener()` must be
called multiple times to remove each instance.

Once an event is emitted, all listeners attached to it at the
time of emitting are called in order. This implies that any`removeListener()` or `removeAllListeners()` calls _after_ emitting and _before_ the last listener finishes execution
will not remove them from`emit()` in progress. Subsequent events behave as expected.

```js
import { EventEmitter } from 'node:events';
class MyEmitter extends EventEmitter {}
const myEmitter = new MyEmitter();

const callbackA = () => {
  console.log('A');
  myEmitter.removeListener('event', callbackB);
};

const callbackB = () => {
  console.log('B');
};

myEmitter.on('event', callbackA);

myEmitter.on('event', callbackB);

// callbackA removes listener callbackB but it will still be called.
// Internal listener array at time of emit [callbackA, callbackB]
myEmitter.emit('event');
// Prints:
//   A
//   B

// callbackB is now removed.
// Internal listener array [callbackA]
myEmitter.emit('event');
// Prints:
//   A
```

Because listeners are managed using an internal array, calling this will
change the position indices of any listener registered _after_ the listener
being removed. This will not impact the order in which listeners are called,
but it means that any copies of the listener array as returned by
the `emitter.listeners()` method will need to be recreated.

When a single function has been added as a handler multiple times for a single
event (as in the example below), `removeListener()` will remove the most
recently added instance. In the example the `once('ping')`listener is removed:

```js
import { EventEmitter } from 'node:events';
const ee = new EventEmitter();

function pong() {
  console.log('pong');
}

ee.on('ping', pong);
ee.once('ping', pong);
ee.removeListener('ping', pong);

ee.emit('ping');
ee.emit('ping');
```

Returns a reference to the `EventEmitter`, so that calls can be chained.

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` \| `symbol` |
| `listener` | (...`args`: `any`[]) => `void` |

#### Returns

[`Synchronizer`](Synchronizer.md)

**`Since`**

v0.1.26

#### Inherited from

EventEmitter.removeListener

#### Defined in

node_modules/@types/node/events.d.ts:655

___

### setAttesterId

▸ **setAttesterId**(`attesterId`): `void`

Change default [attesterId](#attesterid) to another attester ID.
It will fail if an `attesterId` is not synchronized during construction.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `attesterId` | `string` \| `bigint` | The default attester Id to be set. |

#### Returns

`void`

#### Defined in

[packages/core/src/Synchronizer.ts:338](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L338)

___

### setMaxListeners

▸ **setMaxListeners**(`n`): [`Synchronizer`](Synchronizer.md)

By default `EventEmitter`s will print a warning if more than `10` listeners are
added for a particular event. This is a useful default that helps finding
memory leaks. The `emitter.setMaxListeners()` method allows the limit to be
modified for this specific `EventEmitter` instance. The value can be set to`Infinity` (or `0`) to indicate an unlimited number of listeners.

Returns a reference to the `EventEmitter`, so that calls can be chained.

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | `number` |

#### Returns

[`Synchronizer`](Synchronizer.md)

**`Since`**

v0.3.5

#### Inherited from

EventEmitter.setMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:681

___

### setup

▸ **setup**(): `Promise`<`any`\>

Run setup promises.

#### Returns

`Promise`<`any`\>

Setup promises.

#### Defined in

[packages/core/src/Synchronizer.ts:381](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L381)

___

### start

▸ **start**(): `Promise`<`void`\>

Start the synchronizer daemon.
Start polling the blockchain for new events. If we're behind the HEAD block we'll poll many times quickly

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/src/Synchronizer.ts:475](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L475)

___

### stateTreeRootExists

▸ **stateTreeRootExists**(`root`, `epoch`, `attesterId?`): `Promise`<`any`\>

Determine if a state root exists in a certain epoch.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `root` | `string` \| `bigint` | The queried global state tree root |
| `epoch` | `number` | The queried epoch of the global state tree |
| `attesterId` | `string` \| `bigint` | The attester to be queried. |

#### Returns

`Promise`<`any`\>

True if the global state tree root exists, false otherwise.

#### Defined in

[packages/core/src/Synchronizer.ts:993](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L993)

___

### stop

▸ **stop**(): `void`

Stop synchronizing with Unirep contract.

#### Returns

`void`

#### Defined in

[packages/core/src/Synchronizer.ts:520](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L520)

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

[packages/core/src/Synchronizer.ts:769](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/core/src/Synchronizer.ts#L769)

___

### addAbortListener

▸ `Static` **addAbortListener**(`signal`, `resource`): `Disposable`

Listens once to the `abort` event on the provided `signal`.

Listening to the `abort` event on abort signals is unsafe and may
lead to resource leaks since another third party with the signal can
call `e.stopImmediatePropagation()`. Unfortunately Node.js cannot change
this since it would violate the web standard. Additionally, the original
API makes it easy to forget to remove listeners.

This API allows safely using `AbortSignal`s in Node.js APIs by solving these
two issues by listening to the event such that `stopImmediatePropagation` does
not prevent the listener from running.

Returns a disposable so that it may be unsubscribed from more easily.

```js
import { addAbortListener } from 'node:events';

function example(signal) {
  let disposable;
  try {
    signal.addEventListener('abort', (e) => e.stopImmediatePropagation());
    disposable = addAbortListener(signal, (e) => {
      // Do something when signal is aborted.
    });
  } finally {
    disposable?.[Symbol.dispose]();
  }
}
```

#### Parameters

| Name | Type |
| :------ | :------ |
| `signal` | `AbortSignal` |
| `resource` | (`event`: `Event`) => `void` |

#### Returns

`Disposable`

Disposable that removes the `abort` listener.

**`Since`**

v20.5.0

#### Inherited from

EventEmitter.addAbortListener

#### Defined in

node_modules/@types/node/events.d.ts:387

___

### getEventListeners

▸ `Static` **getEventListeners**(`emitter`, `name`): `Function`[]

Returns a copy of the array of listeners for the event named `eventName`.

For `EventEmitter`s this behaves exactly the same as calling `.listeners` on
the emitter.

For `EventTarget`s this is the only way to get the event listeners for the
event target. This is useful for debugging and diagnostic purposes.

```js
import { getEventListeners, EventEmitter } from 'node:events';

{
  const ee = new EventEmitter();
  const listener = () => console.log('Events are fun');
  ee.on('foo', listener);
  console.log(getEventListeners(ee, 'foo')); // [ [Function: listener] ]
}
{
  const et = new EventTarget();
  const listener = () => console.log('Events are fun');
  et.addEventListener('foo', listener);
  console.log(getEventListeners(et, 'foo')); // [ [Function: listener] ]
}
```

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `EventEmitter` \| `_DOMEventTarget` |
| `name` | `string` \| `symbol` |

#### Returns

`Function`[]

**`Since`**

v15.2.0, v14.17.0

#### Inherited from

EventEmitter.getEventListeners

#### Defined in

node_modules/@types/node/events.d.ts:308

___

### getMaxListeners

▸ `Static` **getMaxListeners**(`emitter`): `number`

Returns the currently set max amount of listeners.

For `EventEmitter`s this behaves exactly the same as calling `.getMaxListeners` on
the emitter.

For `EventTarget`s this is the only way to get the max event listeners for the
event target. If the number of event handlers on a single EventTarget exceeds
the max set, the EventTarget will print a warning.

```js
import { getMaxListeners, setMaxListeners, EventEmitter } from 'node:events';

{
  const ee = new EventEmitter();
  console.log(getMaxListeners(ee)); // 10
  setMaxListeners(11, ee);
  console.log(getMaxListeners(ee)); // 11
}
{
  const et = new EventTarget();
  console.log(getMaxListeners(et)); // 10
  setMaxListeners(11, et);
  console.log(getMaxListeners(et)); // 11
}
```

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `EventEmitter` \| `_DOMEventTarget` |

#### Returns

`number`

**`Since`**

v19.9.0

#### Inherited from

EventEmitter.getMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:337

___

### listenerCount

▸ `Static` **listenerCount**(`emitter`, `eventName`): `number`

A class method that returns the number of listeners for the given `eventName`registered on the given `emitter`.

```js
import { EventEmitter, listenerCount } from 'node:events';

const myEmitter = new EventEmitter();
myEmitter.on('event', () => {});
myEmitter.on('event', () => {});
console.log(listenerCount(myEmitter, 'event'));
// Prints: 2
```

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `emitter` | `EventEmitter` | The emitter to query |
| `eventName` | `string` \| `symbol` | The event name |

#### Returns

`number`

**`Since`**

v0.9.12

**`Deprecated`**

Since v3.2.0 - Use `listenerCount` instead.

#### Inherited from

EventEmitter.listenerCount

#### Defined in

node_modules/@types/node/events.d.ts:280

___

### on

▸ `Static` **on**(`emitter`, `eventName`, `options?`): `AsyncIterableIterator`<`any`\>

```js
import { on, EventEmitter } from 'node:events';
import process from 'node:process';

const ee = new EventEmitter();

// Emit later on
process.nextTick(() => {
  ee.emit('foo', 'bar');
  ee.emit('foo', 42);
});

for await (const event of on(ee, 'foo')) {
  // The execution of this inner block is synchronous and it
  // processes one event at a time (even with await). Do not use
  // if concurrent execution is required.
  console.log(event); // prints ['bar'] [42]
}
// Unreachable here
```

Returns an `AsyncIterator` that iterates `eventName` events. It will throw
if the `EventEmitter` emits `'error'`. It removes all listeners when
exiting the loop. The `value` returned by each iteration is an array
composed of the emitted event arguments.

An `AbortSignal` can be used to cancel waiting on events:

```js
import { on, EventEmitter } from 'node:events';
import process from 'node:process';

const ac = new AbortController();

(async () => {
  const ee = new EventEmitter();

  // Emit later on
  process.nextTick(() => {
    ee.emit('foo', 'bar');
    ee.emit('foo', 42);
  });

  for await (const event of on(ee, 'foo', { signal: ac.signal })) {
    // The execution of this inner block is synchronous and it
    // processes one event at a time (even with await). Do not use
    // if concurrent execution is required.
    console.log(event); // prints ['bar'] [42]
  }
  // Unreachable here
})();

process.nextTick(() => ac.abort());
```

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `emitter` | `EventEmitter` | - |
| `eventName` | `string` | The name of the event being listened for |
| `options?` | `StaticEventEmitterOptions` | - |

#### Returns

`AsyncIterableIterator`<`any`\>

that iterates `eventName` events emitted by the `emitter`

**`Since`**

v13.6.0, v12.16.0

#### Inherited from

EventEmitter.on

#### Defined in

node_modules/@types/node/events.d.ts:258

___

### once

▸ `Static` **once**(`emitter`, `eventName`, `options?`): `Promise`<`any`[]\>

Creates a `Promise` that is fulfilled when the `EventEmitter` emits the given
event or that is rejected if the `EventEmitter` emits `'error'` while waiting.
The `Promise` will resolve with an array of all the arguments emitted to the
given event.

This method is intentionally generic and works with the web platform [EventTarget](https://dom.spec.whatwg.org/#interface-eventtarget) interface, which has no special`'error'` event
semantics and does not listen to the `'error'` event.

```js
import { once, EventEmitter } from 'node:events';
import process from 'node:process';

const ee = new EventEmitter();

process.nextTick(() => {
  ee.emit('myevent', 42);
});

const [value] = await once(ee, 'myevent');
console.log(value);

const err = new Error('kaboom');
process.nextTick(() => {
  ee.emit('error', err);
});

try {
  await once(ee, 'myevent');
} catch (err) {
  console.error('error happened', err);
}
```

The special handling of the `'error'` event is only used when `events.once()`is used to wait for another event. If `events.once()` is used to wait for the
'`error'` event itself, then it is treated as any other kind of event without
special handling:

```js
import { EventEmitter, once } from 'node:events';

const ee = new EventEmitter();

once(ee, 'error')
  .then(([err]) => console.log('ok', err.message))
  .catch((err) => console.error('error', err.message));

ee.emit('error', new Error('boom'));

// Prints: ok boom
```

An `AbortSignal` can be used to cancel waiting for the event:

```js
import { EventEmitter, once } from 'node:events';

const ee = new EventEmitter();
const ac = new AbortController();

async function foo(emitter, event, signal) {
  try {
    await once(emitter, event, { signal });
    console.log('event emitted!');
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Waiting for the event was canceled!');
    } else {
      console.error('There was an error', error.message);
    }
  }
}

foo(ee, 'foo', ac.signal);
ac.abort(); // Abort waiting for the event
ee.emit('foo'); // Prints: Waiting for the event was canceled!
```

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `_NodeEventTarget` |
| `eventName` | `string` \| `symbol` |
| `options?` | `StaticEventEmitterOptions` |

#### Returns

`Promise`<`any`[]\>

**`Since`**

v11.13.0, v10.16.0

#### Inherited from

EventEmitter.once

#### Defined in

node_modules/@types/node/events.d.ts:193

▸ `Static` **once**(`emitter`, `eventName`, `options?`): `Promise`<`any`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `emitter` | `_DOMEventTarget` |
| `eventName` | `string` |
| `options?` | `StaticEventEmitterOptions` |

#### Returns

`Promise`<`any`[]\>

#### Inherited from

EventEmitter.once

#### Defined in

node_modules/@types/node/events.d.ts:198

___

### setMaxListeners

▸ `Static` **setMaxListeners**(`n?`, `...eventTargets`): `void`

```js
import { setMaxListeners, EventEmitter } from 'node:events';

const target = new EventTarget();
const emitter = new EventEmitter();

setMaxListeners(5, target, emitter);
```

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `n?` | `number` | A non-negative number. The maximum number of listeners per `EventTarget` event. |
| `...eventTargets` | (`EventEmitter` \| `_DOMEventTarget`)[] | - |

#### Returns

`void`

**`Since`**

v15.4.0

#### Inherited from

EventEmitter.setMaxListeners

#### Defined in

node_modules/@types/node/events.d.ts:352
