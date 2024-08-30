---
id: "typechain.contracts.examples.UnirepVoting"
title: "Interface: UnirepVoting"
sidebar_label: "UnirepVoting"
custom_edit_url: null
---

[contracts](../namespaces/typechain.contracts.md).[examples](../namespaces/typechain.contracts.examples.md).UnirepVoting

## Hierarchy

- `BaseContract`

  ↳ **`UnirepVoting`**

## Properties

### \_deployedPromise

• **\_deployedPromise**: `Promise`<`Contract`\>

#### Inherited from

BaseContract.\_deployedPromise

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:100

___

### \_runningEvents

• **\_runningEvents**: `Object`

#### Index signature

▪ [eventTag: `string`]: `RunningEvent`

#### Inherited from

BaseContract.\_runningEvents

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:101

___

### \_wrappedEmits

• **\_wrappedEmits**: `Object`

#### Index signature

▪ [eventTag: `string`]: (...`args`: `any`[]) => `void`

#### Inherited from

BaseContract.\_wrappedEmits

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:104

___

### address

• `Readonly` **address**: `string`

#### Inherited from

BaseContract.address

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:79

___

### callStatic

• **callStatic**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `claimPrize` | (`receiver`: `string`, `publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`void`\> |
| `counts` | (`arg0`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `epochKeyHelper` | (`overrides?`: `CallOverrides`) => `Promise`<`string`\> |
| `joinProject` | (`projectID`: `BigNumberish`, `publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`void`\> |
| `nft` | (`overrides?`: `CallOverrides`) => `Promise`<`string`\> |
| `numProjects` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `participants` | (`arg0`: `BigNumberish`, `arg1`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `projectData` | (`arg0`: `BigNumberish`, `arg1`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `repHelper` | (`overrides?`: `CallOverrides`) => `Promise`<`string`\> |
| `scores` | (`arg0`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `unirep` | (`overrides?`: `CallOverrides`) => `Promise`<`string`\> |
| `userSignUp` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`void`\> |
| `vote` | (`projectID`: `BigNumberish`, `option`: `BigNumberish`, `publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`void`\> |
| `voted` | (`arg0`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `winnerScore` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |

#### Overrides

BaseContract.callStatic

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:293

___

### deployTransaction

• `Readonly` **deployTransaction**: `TransactionResponse`

#### Inherited from

BaseContract.deployTransaction

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:99

___

### estimateGas

• **estimateGas**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `claimPrize` | (`receiver`: `string`, `publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`BigNumber`\> |
| `counts` | (`arg0`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `epochKeyHelper` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `joinProject` | (`projectID`: `BigNumberish`, `publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`BigNumber`\> |
| `nft` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `numProjects` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `participants` | (`arg0`: `BigNumberish`, `arg1`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `projectData` | (`arg0`: `BigNumberish`, `arg1`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `repHelper` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `scores` | (`arg0`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `unirep` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `userSignUp` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`BigNumber`\> |
| `vote` | (`projectID`: `BigNumberish`, `option`: `BigNumberish`, `publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`BigNumber`\> |
| `voted` | (`arg0`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `winnerScore` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |

#### Overrides

BaseContract.estimateGas

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:355

___

### filters

• **filters**: `Object`

#### Overrides

BaseContract.filters

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:353

___

### functions

• **functions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `claimPrize` | (`receiver`: `string`, `publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`ContractTransaction`\> |
| `counts` | (`arg0`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `epochKeyHelper` | (`overrides?`: `CallOverrides`) => `Promise`<[`string`]\> |
| `joinProject` | (`projectID`: `BigNumberish`, `publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`ContractTransaction`\> |
| `nft` | (`overrides?`: `CallOverrides`) => `Promise`<[`string`]\> |
| `numProjects` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `participants` | (`arg0`: `BigNumberish`, `arg1`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `projectData` | (`arg0`: `BigNumberish`, `arg1`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `repHelper` | (`overrides?`: `CallOverrides`) => `Promise`<[`string`]\> |
| `scores` | (`arg0`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `unirep` | (`overrides?`: `CallOverrides`) => `Promise`<[`string`]\> |
| `userSignUp` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`ContractTransaction`\> |
| `vote` | (`projectID`: `BigNumberish`, `option`: `BigNumberish`, `publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`ContractTransaction`\> |
| `voted` | (`arg0`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `winnerScore` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |

#### Overrides

BaseContract.functions

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:175

___

### interface

• **interface**: `UnirepVotingInterface`

#### Overrides

BaseContract.interface

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:154

___

### off

• **off**: `OnEvent`<[`UnirepVoting`](typechain.contracts.examples.UnirepVoting.md)\>

#### Overrides

BaseContract.off

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:170

___

### on

• **on**: `OnEvent`<[`UnirepVoting`](typechain.contracts.examples.UnirepVoting.md)\>

#### Overrides

BaseContract.on

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:171

___

### once

• **once**: `OnEvent`<[`UnirepVoting`](typechain.contracts.examples.UnirepVoting.md)\>

#### Overrides

BaseContract.once

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:172

___

### populateTransaction

• **populateTransaction**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `claimPrize` | (`receiver`: `string`, `publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`PopulatedTransaction`\> |
| `counts` | (`arg0`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `epochKeyHelper` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `joinProject` | (`projectID`: `BigNumberish`, `publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`PopulatedTransaction`\> |
| `nft` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `numProjects` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `participants` | (`arg0`: `BigNumberish`, `arg1`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `projectData` | (`arg0`: `BigNumberish`, `arg1`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `repHelper` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `scores` | (`arg0`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `unirep` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `userSignUp` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`PopulatedTransaction`\> |
| `vote` | (`projectID`: `BigNumberish`, `option`: `BigNumberish`, `publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`PopulatedTransaction`\> |
| `voted` | (`arg0`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `winnerScore` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |

#### Overrides

BaseContract.populateTransaction

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:415

___

### provider

• `Readonly` **provider**: `Provider`

#### Inherited from

BaseContract.provider

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:82

___

### removeListener

• **removeListener**: `OnEvent`<[`UnirepVoting`](typechain.contracts.examples.UnirepVoting.md)\>

#### Overrides

BaseContract.removeListener

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:173

___

### resolvedAddress

• `Readonly` **resolvedAddress**: `Promise`<`string`\>

#### Inherited from

BaseContract.resolvedAddress

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:98

___

### signer

• `Readonly` **signer**: `Signer`

#### Inherited from

BaseContract.signer

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:81

## Methods

### \_checkRunningEvents

▸ **_checkRunningEvents**(`runningEvent`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `runningEvent` | `RunningEvent` |

#### Returns

`void`

#### Inherited from

BaseContract.\_checkRunningEvents

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:121

___

### \_deployed

▸ **_deployed**(`blockTag?`): `Promise`<`Contract`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `blockTag?` | `BlockTag` |

#### Returns

`Promise`<`Contract`\>

#### Inherited from

BaseContract.\_deployed

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:114

___

### \_wrapEvent

▸ **_wrapEvent**(`runningEvent`, `log`, `listener`): `Event`

#### Parameters

| Name | Type |
| :------ | :------ |
| `runningEvent` | `RunningEvent` |
| `log` | `Log` |
| `listener` | `Listener` |

#### Returns

`Event`

#### Inherited from

BaseContract.\_wrapEvent

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:122

___

### attach

▸ **attach**(`addressOrName`): [`UnirepVoting`](typechain.contracts.examples.UnirepVoting.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `addressOrName` | `string` |

#### Returns

[`UnirepVoting`](typechain.contracts.examples.UnirepVoting.md)

#### Overrides

BaseContract.attach

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:151

___

### claimPrize

▸ **claimPrize**(`receiver`, `publicSignals`, `proof`, `overrides?`): `Promise`<`ContractTransaction`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `receiver` | `string` |
| `publicSignals` | `BigNumberish`[] |
| `proof` | `BigNumberish`[] |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<`ContractTransaction`\>

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:235

___

### connect

▸ **connect**(`signerOrProvider`): [`UnirepVoting`](typechain.contracts.examples.UnirepVoting.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `signerOrProvider` | `string` \| `Provider` \| `Signer` |

#### Returns

[`UnirepVoting`](typechain.contracts.examples.UnirepVoting.md)

#### Overrides

BaseContract.connect

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:150

___

### counts

▸ **counts**(`arg0`, `overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `arg0` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:242

___

### deployed

▸ **deployed**(): `Promise`<[`UnirepVoting`](typechain.contracts.examples.UnirepVoting.md)\>

#### Returns

`Promise`<[`UnirepVoting`](typechain.contracts.examples.UnirepVoting.md)\>

#### Overrides

BaseContract.deployed

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:152

___

### emit

▸ **emit**(`eventName`, `...args`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName` | `string` \| `EventFilter` |
| `...args` | `any`[] |

#### Returns

`boolean`

#### Inherited from

BaseContract.emit

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:127

___

### epochKeyHelper

▸ **epochKeyHelper**(`overrides?`): `Promise`<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`string`\>

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:244

___

### fallback

▸ **fallback**(`overrides?`): `Promise`<`TransactionResponse`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `TransactionRequest` |

#### Returns

`Promise`<`TransactionResponse`\>

#### Inherited from

BaseContract.fallback

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:115

___

### joinProject

▸ **joinProject**(`projectID`, `publicSignals`, `proof`, `overrides?`): `Promise`<`ContractTransaction`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `projectID` | `BigNumberish` |
| `publicSignals` | `BigNumberish`[] |
| `proof` | `BigNumberish`[] |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<`ContractTransaction`\>

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:246

___

### listenerCount

▸ **listenerCount**(`eventName?`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName?` | `string` \| `EventFilter` |

#### Returns

`number`

#### Inherited from

BaseContract.listenerCount

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:128

___

### listeners

▸ **listeners**<`TEvent`\>(`eventFilter?`): `TypedListener`<`TEvent`\>[]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TEvent` | extends `TypedEvent`<`any`, `any`, `TEvent`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventFilter?` | `TypedEventFilter`<`TEvent`\> |

#### Returns

`TypedListener`<`TEvent`\>[]

#### Overrides

BaseContract.listeners

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:162

▸ **listeners**(`eventName?`): `Listener`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName?` | `string` |

#### Returns

`Listener`[]

#### Overrides

BaseContract.listeners

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:165

___

### nft

▸ **nft**(`overrides?`): `Promise`<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`string`\>

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:253

___

### numProjects

▸ **numProjects**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:255

___

### participants

▸ **participants**(`arg0`, `arg1`, `overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `arg0` | `BigNumberish` |
| `arg1` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:257

___

### projectData

▸ **projectData**(`arg0`, `arg1`, `overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `arg0` | `BigNumberish` |
| `arg1` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:263

___

### queryFilter

▸ **queryFilter**<`TEvent`\>(`event`, `fromBlockOrBlockhash?`, `toBlock?`): `Promise`<`TEvent`[]\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TEvent` | extends `TypedEvent`<`any`, `any`, `TEvent`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `TypedEventFilter`<`TEvent`\> |
| `fromBlockOrBlockhash?` | `string` \| `number` |
| `toBlock?` | `string` \| `number` |

#### Returns

`Promise`<`TEvent`[]\>

#### Overrides

BaseContract.queryFilter

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:156

___

### removeAllListeners

▸ **removeAllListeners**<`TEvent`\>(`eventFilter`): [`UnirepVoting`](typechain.contracts.examples.UnirepVoting.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TEvent` | extends `TypedEvent`<`any`, `any`, `TEvent`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventFilter` | `TypedEventFilter`<`TEvent`\> |

#### Returns

[`UnirepVoting`](typechain.contracts.examples.UnirepVoting.md)

#### Overrides

BaseContract.removeAllListeners

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:166

▸ **removeAllListeners**(`eventName?`): [`UnirepVoting`](typechain.contracts.examples.UnirepVoting.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName?` | `string` |

#### Returns

[`UnirepVoting`](typechain.contracts.examples.UnirepVoting.md)

#### Overrides

BaseContract.removeAllListeners

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:169

___

### repHelper

▸ **repHelper**(`overrides?`): `Promise`<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`string`\>

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:269

___

### scores

▸ **scores**(`arg0`, `overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `arg0` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:271

___

### unirep

▸ **unirep**(`overrides?`): `Promise`<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`string`\>

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:273

___

### userSignUp

▸ **userSignUp**(`publicSignals`, `proof`, `overrides?`): `Promise`<`ContractTransaction`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicSignals` | `BigNumberish`[] |
| `proof` | `BigNumberish`[] |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<`ContractTransaction`\>

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:275

___

### vote

▸ **vote**(`projectID`, `option`, `publicSignals`, `proof`, `overrides?`): `Promise`<`ContractTransaction`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `projectID` | `BigNumberish` |
| `option` | `BigNumberish` |
| `publicSignals` | `BigNumberish`[] |
| `proof` | `BigNumberish`[] |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<`ContractTransaction`\>

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:281

___

### voted

▸ **voted**(`arg0`, `overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `arg0` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:289

___

### winnerScore

▸ **winnerScore**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/examples/UnirepVoting.ts:291
