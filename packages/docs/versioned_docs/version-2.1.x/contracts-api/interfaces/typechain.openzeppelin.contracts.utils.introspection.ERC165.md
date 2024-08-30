---
id: "typechain.openzeppelin.contracts.utils.introspection.ERC165"
title: "Interface: ERC165"
sidebar_label: "ERC165"
custom_edit_url: null
---

[utils](../namespaces/typechain.openzeppelin.contracts.utils.md).[introspection](../namespaces/typechain.openzeppelin.contracts.utils.introspection.md).ERC165

## Hierarchy

- `BaseContract`

  ↳ **`ERC165`**

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
| `supportsInterface` | (`interfaceId`: `BytesLike`, `overrides?`: `CallOverrides`) => `Promise`<`boolean`\> |

#### Overrides

BaseContract.callStatic

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/utils/introspection/ERC165.ts:80

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
| `supportsInterface` | (`interfaceId`: `BytesLike`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |

#### Overrides

BaseContract.estimateGas

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/utils/introspection/ERC165.ts:89

___

### filters

• **filters**: `Object`

#### Overrides

BaseContract.filters

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/utils/introspection/ERC165.ts:87

___

### functions

• **functions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `supportsInterface` | (`interfaceId`: `BytesLike`, `overrides?`: `CallOverrides`) => `Promise`<[`boolean`]\> |

#### Overrides

BaseContract.functions

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/utils/introspection/ERC165.ts:68

___

### interface

• **interface**: `ERC165Interface`

#### Overrides

BaseContract.interface

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/utils/introspection/ERC165.ts:47

___

### off

• **off**: `OnEvent`<[`ERC165`](typechain.openzeppelin.contracts.utils.introspection.ERC165.md)\>

#### Overrides

BaseContract.off

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/utils/introspection/ERC165.ts:63

___

### on

• **on**: `OnEvent`<[`ERC165`](typechain.openzeppelin.contracts.utils.introspection.ERC165.md)\>

#### Overrides

BaseContract.on

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/utils/introspection/ERC165.ts:64

___

### once

• **once**: `OnEvent`<[`ERC165`](typechain.openzeppelin.contracts.utils.introspection.ERC165.md)\>

#### Overrides

BaseContract.once

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/utils/introspection/ERC165.ts:65

___

### populateTransaction

• **populateTransaction**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `supportsInterface` | (`interfaceId`: `BytesLike`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |

#### Overrides

BaseContract.populateTransaction

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/utils/introspection/ERC165.ts:96

___

### provider

• `Readonly` **provider**: `Provider`

#### Inherited from

BaseContract.provider

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:82

___

### removeListener

• **removeListener**: `OnEvent`<[`ERC165`](typechain.openzeppelin.contracts.utils.introspection.ERC165.md)\>

#### Overrides

BaseContract.removeListener

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/utils/introspection/ERC165.ts:66

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

▸ **attach**(`addressOrName`): [`ERC165`](typechain.openzeppelin.contracts.utils.introspection.ERC165.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `addressOrName` | `string` |

#### Returns

[`ERC165`](typechain.openzeppelin.contracts.utils.introspection.ERC165.md)

#### Overrides

BaseContract.attach

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/utils/introspection/ERC165.ts:44

___

### connect

▸ **connect**(`signerOrProvider`): [`ERC165`](typechain.openzeppelin.contracts.utils.introspection.ERC165.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `signerOrProvider` | `string` \| `Provider` \| `Signer` |

#### Returns

[`ERC165`](typechain.openzeppelin.contracts.utils.introspection.ERC165.md)

#### Overrides

BaseContract.connect

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/utils/introspection/ERC165.ts:43

___

### deployed

▸ **deployed**(): `Promise`<[`ERC165`](typechain.openzeppelin.contracts.utils.introspection.ERC165.md)\>

#### Returns

`Promise`<[`ERC165`](typechain.openzeppelin.contracts.utils.introspection.ERC165.md)\>

#### Overrides

BaseContract.deployed

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/utils/introspection/ERC165.ts:45

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

packages/contracts/typechain/@openzeppelin/contracts/utils/introspection/ERC165.ts:55

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

packages/contracts/typechain/@openzeppelin/contracts/utils/introspection/ERC165.ts:58

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

packages/contracts/typechain/@openzeppelin/contracts/utils/introspection/ERC165.ts:49

___

### removeAllListeners

▸ **removeAllListeners**<`TEvent`\>(`eventFilter`): [`ERC165`](typechain.openzeppelin.contracts.utils.introspection.ERC165.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TEvent` | extends `TypedEvent`<`any`, `any`, `TEvent`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventFilter` | `TypedEventFilter`<`TEvent`\> |

#### Returns

[`ERC165`](typechain.openzeppelin.contracts.utils.introspection.ERC165.md)

#### Overrides

BaseContract.removeAllListeners

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/utils/introspection/ERC165.ts:59

▸ **removeAllListeners**(`eventName?`): [`ERC165`](typechain.openzeppelin.contracts.utils.introspection.ERC165.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName?` | `string` |

#### Returns

[`ERC165`](typechain.openzeppelin.contracts.utils.introspection.ERC165.md)

#### Overrides

BaseContract.removeAllListeners

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/utils/introspection/ERC165.ts:62

___

### supportsInterface

▸ **supportsInterface**(`interfaceId`, `overrides?`): `Promise`<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `interfaceId` | `BytesLike` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`boolean`\>

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/utils/introspection/ERC165.ts:75
