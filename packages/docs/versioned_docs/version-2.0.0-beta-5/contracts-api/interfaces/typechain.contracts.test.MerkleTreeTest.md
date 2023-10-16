---
id: "typechain.contracts.test.MerkleTreeTest"
title: "Interface: MerkleTreeTest"
sidebar_label: "MerkleTreeTest"
custom_edit_url: null
---

[contracts](../namespaces/typechain.contracts.md).[test](../namespaces/typechain.contracts.test.md).MerkleTreeTest

## Hierarchy

- `BaseContract`

  ↳ **`MerkleTreeTest`**

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
| `insertLazy` | (`leaf`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`void`\> |
| `insertReusable` | (`leaf`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`void`\> |
| `rootLazy` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `rootReusable` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `updateLazy` | (`leaf`: `BigNumberish`, `index`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`void`\> |
| `updateReusable` | (`leaf`: `BigNumberish`, `index`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`void`\> |

#### Overrides

BaseContract.callStatic

#### Defined in

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:166

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
| `insertLazy` | (`leaf`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`BigNumber`\> |
| `insertReusable` | (`leaf`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`BigNumber`\> |
| `rootLazy` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `rootReusable` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `updateLazy` | (`leaf`: `BigNumberish`, `index`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`BigNumber`\> |
| `updateReusable` | (`leaf`: `BigNumberish`, `index`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`BigNumber`\> |

#### Overrides

BaseContract.estimateGas

#### Defined in

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:193

___

### filters

• **filters**: `Object`

#### Overrides

BaseContract.filters

#### Defined in

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:191

___

### functions

• **functions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `insertLazy` | (`leaf`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`ContractTransaction`\> |
| `insertReusable` | (`leaf`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`ContractTransaction`\> |
| `rootLazy` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `rootReusable` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `updateLazy` | (`leaf`: `BigNumberish`, `index`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`ContractTransaction`\> |
| `updateReusable` | (`leaf`: `BigNumberish`, `index`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`ContractTransaction`\> |

#### Overrides

BaseContract.functions

#### Defined in

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:112

___

### interface

• **interface**: `MerkleTreeTestInterface`

#### Overrides

BaseContract.interface

#### Defined in

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:91

___

### off

• **off**: `OnEvent`<[`MerkleTreeTest`](typechain.contracts.test.MerkleTreeTest.md)\>

#### Overrides

BaseContract.off

#### Defined in

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:107

___

### on

• **on**: `OnEvent`<[`MerkleTreeTest`](typechain.contracts.test.MerkleTreeTest.md)\>

#### Overrides

BaseContract.on

#### Defined in

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:108

___

### once

• **once**: `OnEvent`<[`MerkleTreeTest`](typechain.contracts.test.MerkleTreeTest.md)\>

#### Overrides

BaseContract.once

#### Defined in

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:109

___

### populateTransaction

• **populateTransaction**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `insertLazy` | (`leaf`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`PopulatedTransaction`\> |
| `insertReusable` | (`leaf`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`PopulatedTransaction`\> |
| `rootLazy` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `rootReusable` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `updateLazy` | (`leaf`: `BigNumberish`, `index`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`PopulatedTransaction`\> |
| `updateReusable` | (`leaf`: `BigNumberish`, `index`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`PopulatedTransaction`\> |

#### Overrides

BaseContract.populateTransaction

#### Defined in

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:221

___

### provider

• `Readonly` **provider**: `Provider`

#### Inherited from

BaseContract.provider

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:82

___

### removeListener

• **removeListener**: `OnEvent`<[`MerkleTreeTest`](typechain.contracts.test.MerkleTreeTest.md)\>

#### Overrides

BaseContract.removeListener

#### Defined in

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:110

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

▸ **attach**(`addressOrName`): [`MerkleTreeTest`](typechain.contracts.test.MerkleTreeTest.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `addressOrName` | `string` |

#### Returns

[`MerkleTreeTest`](typechain.contracts.test.MerkleTreeTest.md)

#### Overrides

BaseContract.attach

#### Defined in

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:88

___

### connect

▸ **connect**(`signerOrProvider`): [`MerkleTreeTest`](typechain.contracts.test.MerkleTreeTest.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `signerOrProvider` | `string` \| `Provider` \| `Signer` |

#### Returns

[`MerkleTreeTest`](typechain.contracts.test.MerkleTreeTest.md)

#### Overrides

BaseContract.connect

#### Defined in

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:87

___

### deployed

▸ **deployed**(): `Promise`<[`MerkleTreeTest`](typechain.contracts.test.MerkleTreeTest.md)\>

#### Returns

`Promise`<[`MerkleTreeTest`](typechain.contracts.test.MerkleTreeTest.md)\>

#### Overrides

BaseContract.deployed

#### Defined in

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:89

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

### insertLazy

▸ **insertLazy**(`leaf`, `overrides?`): `Promise`<`ContractTransaction`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `leaf` | `BigNumberish` |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<`ContractTransaction`\>

#### Defined in

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:140

___

### insertReusable

▸ **insertReusable**(`leaf`, `overrides?`): `Promise`<`ContractTransaction`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `leaf` | `BigNumberish` |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<`ContractTransaction`\>

#### Defined in

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:145

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

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:99

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

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:102

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

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:93

___

### removeAllListeners

▸ **removeAllListeners**<`TEvent`\>(`eventFilter`): [`MerkleTreeTest`](typechain.contracts.test.MerkleTreeTest.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TEvent` | extends `TypedEvent`<`any`, `any`, `TEvent`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventFilter` | `TypedEventFilter`<`TEvent`\> |

#### Returns

[`MerkleTreeTest`](typechain.contracts.test.MerkleTreeTest.md)

#### Overrides

BaseContract.removeAllListeners

#### Defined in

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:103

▸ **removeAllListeners**(`eventName?`): [`MerkleTreeTest`](typechain.contracts.test.MerkleTreeTest.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName?` | `string` |

#### Returns

[`MerkleTreeTest`](typechain.contracts.test.MerkleTreeTest.md)

#### Overrides

BaseContract.removeAllListeners

#### Defined in

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:106

___

### rootLazy

▸ **rootLazy**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:150

___

### rootReusable

▸ **rootReusable**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:152

___

### updateLazy

▸ **updateLazy**(`leaf`, `index`, `overrides?`): `Promise`<`ContractTransaction`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `leaf` | `BigNumberish` |
| `index` | `BigNumberish` |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<`ContractTransaction`\>

#### Defined in

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:154

___

### updateReusable

▸ **updateReusable**(`leaf`, `index`, `overrides?`): `Promise`<`ContractTransaction`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `leaf` | `BigNumberish` |
| `index` | `BigNumberish` |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<`ContractTransaction`\>

#### Defined in

packages/contracts/typechain/contracts/test/MerkleTreeTest.ts:160
