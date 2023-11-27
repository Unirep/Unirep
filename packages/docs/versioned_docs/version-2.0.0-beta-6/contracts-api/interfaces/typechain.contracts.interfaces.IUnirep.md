---
id: "typechain.contracts.interfaces.IUnirep"
title: "Interface: IUnirep"
sidebar_label: "IUnirep"
custom_edit_url: null
---

[contracts](../namespaces/typechain.contracts.md).[interfaces](../namespaces/typechain.contracts.interfaces.md).IUnirep

## Hierarchy

- `BaseContract`

  ↳ **`IUnirep`**

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

#### Overrides

BaseContract.callStatic

#### Defined in

packages/contracts/typechain/contracts/interfaces/IUnirep.ts:175

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

#### Overrides

BaseContract.estimateGas

#### Defined in

packages/contracts/typechain/contracts/interfaces/IUnirep.ts:277

___

### filters

• **filters**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `Attestation` | (`epoch?`: ``null`` \| `BigNumberish`, `epochKey?`: ``null`` \| `BigNumberish`, `attesterId?`: ``null`` \| `BigNumberish`, `fieldIndex?`: ``null``, `change?`: ``null``) => `AttestationEventFilter` |
| `Attestation(uint48,uint256,uint160,uint256,uint256)` | (`epoch?`: ``null`` \| `BigNumberish`, `epochKey?`: ``null`` \| `BigNumberish`, `attesterId?`: ``null`` \| `BigNumberish`, `fieldIndex?`: ``null``, `change?`: ``null``) => `AttestationEventFilter` |
| `AttesterSignedUp` | (`attesterId?`: ``null`` \| `BigNumberish`, `epochLength?`: ``null``, `timestamp?`: ``null``) => `AttesterSignedUpEventFilter` |
| `AttesterSignedUp(uint160,uint48,uint48)` | (`attesterId?`: ``null`` \| `BigNumberish`, `epochLength?`: ``null``, `timestamp?`: ``null``) => `AttesterSignedUpEventFilter` |
| `EpochEnded` | (`epoch?`: ``null`` \| `BigNumberish`, `attesterId?`: ``null`` \| `BigNumberish`) => `EpochEndedEventFilter` |
| `EpochEnded(uint48,uint160)` | (`epoch?`: ``null`` \| `BigNumberish`, `attesterId?`: ``null`` \| `BigNumberish`) => `EpochEndedEventFilter` |
| `EpochTreeLeaf` | (`epoch?`: ``null`` \| `BigNumberish`, `attesterId?`: ``null`` \| `BigNumberish`, `index?`: ``null`` \| `BigNumberish`, `leaf?`: ``null``) => `EpochTreeLeafEventFilter` |
| `EpochTreeLeaf(uint48,uint160,uint256,uint256)` | (`epoch?`: ``null`` \| `BigNumberish`, `attesterId?`: ``null`` \| `BigNumberish`, `index?`: ``null`` \| `BigNumberish`, `leaf?`: ``null``) => `EpochTreeLeafEventFilter` |
| `HistoryTreeLeaf` | (`attesterId?`: ``null`` \| `BigNumberish`, `leaf?`: ``null``) => `HistoryTreeLeafEventFilter` |
| `HistoryTreeLeaf(uint160,uint256)` | (`attesterId?`: ``null`` \| `BigNumberish`, `leaf?`: ``null``) => `HistoryTreeLeafEventFilter` |
| `StateTreeLeaf` | (`epoch?`: ``null`` \| `BigNumberish`, `attesterId?`: ``null`` \| `BigNumberish`, `index?`: ``null`` \| `BigNumberish`, `leaf?`: ``null``) => `StateTreeLeafEventFilter` |
| `StateTreeLeaf(uint48,uint160,uint256,uint256)` | (`epoch?`: ``null`` \| `BigNumberish`, `attesterId?`: ``null`` \| `BigNumberish`, `index?`: ``null`` \| `BigNumberish`, `leaf?`: ``null``) => `StateTreeLeafEventFilter` |
| `UserSignedUp` | (`epoch?`: ``null`` \| `BigNumberish`, `identityCommitment?`: ``null`` \| `BigNumberish`, `attesterId?`: ``null`` \| `BigNumberish`, `leafIndex?`: ``null``) => `UserSignedUpEventFilter` |
| `UserSignedUp(uint48,uint256,uint160,uint256)` | (`epoch?`: ``null`` \| `BigNumberish`, `identityCommitment?`: ``null`` \| `BigNumberish`, `attesterId?`: ``null`` \| `BigNumberish`, `leafIndex?`: ``null``) => `UserSignedUpEventFilter` |
| `UserStateTransitioned` | (`epoch?`: ``null`` \| `BigNumberish`, `attesterId?`: ``null`` \| `BigNumberish`, `leafIndex?`: ``null`` \| `BigNumberish`, `hashedLeaf?`: ``null``, `nullifier?`: ``null``) => `UserStateTransitionedEventFilter` |
| `UserStateTransitioned(uint48,uint160,uint256,uint256,uint256)` | (`epoch?`: ``null`` \| `BigNumberish`, `attesterId?`: ``null`` \| `BigNumberish`, `leafIndex?`: ``null`` \| `BigNumberish`, `hashedLeaf?`: ``null``, `nullifier?`: ``null``) => `UserStateTransitionedEventFilter` |

#### Overrides

BaseContract.filters

#### Defined in

packages/contracts/typechain/contracts/interfaces/IUnirep.ts:177

___

### functions

• **functions**: `Object`

#### Overrides

BaseContract.functions

#### Defined in

packages/contracts/typechain/contracts/interfaces/IUnirep.ts:173

___

### interface

• **interface**: `IUnirepInterface`

#### Overrides

BaseContract.interface

#### Defined in

packages/contracts/typechain/contracts/interfaces/IUnirep.ts:152

___

### off

• **off**: `OnEvent`<[`IUnirep`](typechain.contracts.interfaces.IUnirep.md)\>

#### Overrides

BaseContract.off

#### Defined in

packages/contracts/typechain/contracts/interfaces/IUnirep.ts:168

___

### on

• **on**: `OnEvent`<[`IUnirep`](typechain.contracts.interfaces.IUnirep.md)\>

#### Overrides

BaseContract.on

#### Defined in

packages/contracts/typechain/contracts/interfaces/IUnirep.ts:169

___

### once

• **once**: `OnEvent`<[`IUnirep`](typechain.contracts.interfaces.IUnirep.md)\>

#### Overrides

BaseContract.once

#### Defined in

packages/contracts/typechain/contracts/interfaces/IUnirep.ts:170

___

### populateTransaction

• **populateTransaction**: `Object`

#### Overrides

BaseContract.populateTransaction

#### Defined in

packages/contracts/typechain/contracts/interfaces/IUnirep.ts:279

___

### provider

• `Readonly` **provider**: `Provider`

#### Inherited from

BaseContract.provider

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:82

___

### removeListener

• **removeListener**: `OnEvent`<[`IUnirep`](typechain.contracts.interfaces.IUnirep.md)\>

#### Overrides

BaseContract.removeListener

#### Defined in

packages/contracts/typechain/contracts/interfaces/IUnirep.ts:171

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

▸ **attach**(`addressOrName`): [`IUnirep`](typechain.contracts.interfaces.IUnirep.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `addressOrName` | `string` |

#### Returns

[`IUnirep`](typechain.contracts.interfaces.IUnirep.md)

#### Overrides

BaseContract.attach

#### Defined in

packages/contracts/typechain/contracts/interfaces/IUnirep.ts:149

___

### connect

▸ **connect**(`signerOrProvider`): [`IUnirep`](typechain.contracts.interfaces.IUnirep.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `signerOrProvider` | `string` \| `Provider` \| `Signer` |

#### Returns

[`IUnirep`](typechain.contracts.interfaces.IUnirep.md)

#### Overrides

BaseContract.connect

#### Defined in

packages/contracts/typechain/contracts/interfaces/IUnirep.ts:148

___

### deployed

▸ **deployed**(): `Promise`<[`IUnirep`](typechain.contracts.interfaces.IUnirep.md)\>

#### Returns

`Promise`<[`IUnirep`](typechain.contracts.interfaces.IUnirep.md)\>

#### Overrides

BaseContract.deployed

#### Defined in

packages/contracts/typechain/contracts/interfaces/IUnirep.ts:150

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

packages/contracts/typechain/contracts/interfaces/IUnirep.ts:160

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

packages/contracts/typechain/contracts/interfaces/IUnirep.ts:163

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

packages/contracts/typechain/contracts/interfaces/IUnirep.ts:154

___

### removeAllListeners

▸ **removeAllListeners**<`TEvent`\>(`eventFilter`): [`IUnirep`](typechain.contracts.interfaces.IUnirep.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TEvent` | extends `TypedEvent`<`any`, `any`, `TEvent`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventFilter` | `TypedEventFilter`<`TEvent`\> |

#### Returns

[`IUnirep`](typechain.contracts.interfaces.IUnirep.md)

#### Overrides

BaseContract.removeAllListeners

#### Defined in

packages/contracts/typechain/contracts/interfaces/IUnirep.ts:164

▸ **removeAllListeners**(`eventName?`): [`IUnirep`](typechain.contracts.interfaces.IUnirep.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName?` | `string` |

#### Returns

[`IUnirep`](typechain.contracts.interfaces.IUnirep.md)

#### Overrides

BaseContract.removeAllListeners

#### Defined in

packages/contracts/typechain/contracts/interfaces/IUnirep.ts:167
