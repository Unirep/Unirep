---
id: "typechain.openzeppelin.contracts.token.erc721.IERC721Receiver"
title: "Interface: IERC721Receiver"
sidebar_label: "IERC721Receiver"
custom_edit_url: null
---

[token](../namespaces/typechain.openzeppelin.contracts.token.md).[erc721](../namespaces/typechain.openzeppelin.contracts.token.erc721.md).IERC721Receiver

## Hierarchy

- `BaseContract`

  ↳ **`IERC721Receiver`**

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
| `onERC721Received` | (`operator`: `string`, `from`: `string`, `tokenId`: `BigNumberish`, `data`: `BytesLike`, `overrides?`: `CallOverrides`) => `Promise`<`string`\> |

#### Overrides

BaseContract.callStatic

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/token/ERC721/IERC721Receiver.ts:89

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
| `onERC721Received` | (`operator`: `string`, `from`: `string`, `tokenId`: `BigNumberish`, `data`: `BytesLike`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`BigNumber`\> |

#### Overrides

BaseContract.estimateGas

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/token/ERC721/IERC721Receiver.ts:101

___

### filters

• **filters**: `Object`

#### Overrides

BaseContract.filters

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/token/ERC721/IERC721Receiver.ts:99

___

### functions

• **functions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `onERC721Received` | (`operator`: `string`, `from`: `string`, `tokenId`: `BigNumberish`, `data`: `BytesLike`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`ContractTransaction`\> |

#### Overrides

BaseContract.functions

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/token/ERC721/IERC721Receiver.ts:71

___

### interface

• **interface**: `IERC721ReceiverInterface`

#### Overrides

BaseContract.interface

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/token/ERC721/IERC721Receiver.ts:50

___

### off

• **off**: `OnEvent`<[`IERC721Receiver`](typechain.openzeppelin.contracts.token.erc721.IERC721Receiver.md)\>

#### Overrides

BaseContract.off

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/token/ERC721/IERC721Receiver.ts:66

___

### on

• **on**: `OnEvent`<[`IERC721Receiver`](typechain.openzeppelin.contracts.token.erc721.IERC721Receiver.md)\>

#### Overrides

BaseContract.on

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/token/ERC721/IERC721Receiver.ts:67

___

### once

• **once**: `OnEvent`<[`IERC721Receiver`](typechain.openzeppelin.contracts.token.erc721.IERC721Receiver.md)\>

#### Overrides

BaseContract.once

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/token/ERC721/IERC721Receiver.ts:68

___

### populateTransaction

• **populateTransaction**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `onERC721Received` | (`operator`: `string`, `from`: `string`, `tokenId`: `BigNumberish`, `data`: `BytesLike`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`PopulatedTransaction`\> |

#### Overrides

BaseContract.populateTransaction

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/token/ERC721/IERC721Receiver.ts:111

___

### provider

• `Readonly` **provider**: `Provider`

#### Inherited from

BaseContract.provider

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:82

___

### removeListener

• **removeListener**: `OnEvent`<[`IERC721Receiver`](typechain.openzeppelin.contracts.token.erc721.IERC721Receiver.md)\>

#### Overrides

BaseContract.removeListener

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/token/ERC721/IERC721Receiver.ts:69

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

▸ **attach**(`addressOrName`): [`IERC721Receiver`](typechain.openzeppelin.contracts.token.erc721.IERC721Receiver.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `addressOrName` | `string` |

#### Returns

[`IERC721Receiver`](typechain.openzeppelin.contracts.token.erc721.IERC721Receiver.md)

#### Overrides

BaseContract.attach

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/token/ERC721/IERC721Receiver.ts:47

___

### connect

▸ **connect**(`signerOrProvider`): [`IERC721Receiver`](typechain.openzeppelin.contracts.token.erc721.IERC721Receiver.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `signerOrProvider` | `string` \| `Provider` \| `Signer` |

#### Returns

[`IERC721Receiver`](typechain.openzeppelin.contracts.token.erc721.IERC721Receiver.md)

#### Overrides

BaseContract.connect

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/token/ERC721/IERC721Receiver.ts:46

___

### deployed

▸ **deployed**(): `Promise`<[`IERC721Receiver`](typechain.openzeppelin.contracts.token.erc721.IERC721Receiver.md)\>

#### Returns

`Promise`<[`IERC721Receiver`](typechain.openzeppelin.contracts.token.erc721.IERC721Receiver.md)\>

#### Overrides

BaseContract.deployed

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/token/ERC721/IERC721Receiver.ts:48

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

packages/contracts/typechain/@openzeppelin/contracts/token/ERC721/IERC721Receiver.ts:58

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

packages/contracts/typechain/@openzeppelin/contracts/token/ERC721/IERC721Receiver.ts:61

___

### onERC721Received

▸ **onERC721Received**(`operator`, `from`, `tokenId`, `data`, `overrides?`): `Promise`<`ContractTransaction`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `operator` | `string` |
| `from` | `string` |
| `tokenId` | `BigNumberish` |
| `data` | `BytesLike` |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<`ContractTransaction`\>

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/token/ERC721/IERC721Receiver.ts:81

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

packages/contracts/typechain/@openzeppelin/contracts/token/ERC721/IERC721Receiver.ts:52

___

### removeAllListeners

▸ **removeAllListeners**<`TEvent`\>(`eventFilter`): [`IERC721Receiver`](typechain.openzeppelin.contracts.token.erc721.IERC721Receiver.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TEvent` | extends `TypedEvent`<`any`, `any`, `TEvent`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventFilter` | `TypedEventFilter`<`TEvent`\> |

#### Returns

[`IERC721Receiver`](typechain.openzeppelin.contracts.token.erc721.IERC721Receiver.md)

#### Overrides

BaseContract.removeAllListeners

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/token/ERC721/IERC721Receiver.ts:62

▸ **removeAllListeners**(`eventName?`): [`IERC721Receiver`](typechain.openzeppelin.contracts.token.erc721.IERC721Receiver.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName?` | `string` |

#### Returns

[`IERC721Receiver`](typechain.openzeppelin.contracts.token.erc721.IERC721Receiver.md)

#### Overrides

BaseContract.removeAllListeners

#### Defined in

packages/contracts/typechain/@openzeppelin/contracts/token/ERC721/IERC721Receiver.ts:65
