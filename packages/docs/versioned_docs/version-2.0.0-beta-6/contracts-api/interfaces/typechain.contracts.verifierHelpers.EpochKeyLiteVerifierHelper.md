---
id: "typechain.contracts.verifierHelpers.EpochKeyLiteVerifierHelper"
title: "Interface: EpochKeyLiteVerifierHelper"
sidebar_label: "EpochKeyLiteVerifierHelper"
custom_edit_url: null
---

[contracts](../namespaces/typechain.contracts.md).[verifierHelpers](../namespaces/typechain.contracts.verifierHelpers.md).EpochKeyLiteVerifierHelper

## Hierarchy

- `BaseContract`

  ↳ **`EpochKeyLiteVerifierHelper`**

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
| `SNARK_SCALAR_FIELD` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `chainid` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `decodeEpochKeyControl` | (`control`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`number`, `number`, `BigNumber`, `boolean`, `number`] & { `attesterId`: `BigNumber` ; `chainId`: `number` ; `epoch`: `number` ; `nonce`: `number` ; `revealNonce`: `boolean`  }\> |
| `decodeEpochKeyLiteSignals` | (`publicSignals`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`EpochKeySignalsStructOutput`\> |
| `shiftAndParse` | (`data`: `BigNumberish`, `shiftBits`: `BigNumberish`, `variableBits`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `verifyAndCheck` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`EpochKeySignalsStructOutput`\> |
| `verifyAndCheckCaller` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`EpochKeySignalsStructOutput`\> |

#### Overrides

BaseContract.callStatic

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:243

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
| `SNARK_SCALAR_FIELD` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `chainid` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `decodeEpochKeyControl` | (`control`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `decodeEpochKeyLiteSignals` | (`publicSignals`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `shiftAndParse` | (`data`: `BigNumberish`, `shiftBits`: `BigNumberish`, `variableBits`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `verifyAndCheck` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `verifyAndCheckCaller` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |

#### Overrides

BaseContract.estimateGas

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:288

___

### filters

• **filters**: `Object`

#### Overrides

BaseContract.filters

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:286

___

### functions

• **functions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `SNARK_SCALAR_FIELD` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `chainid` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `decodeEpochKeyControl` | (`control`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`number`, `number`, `BigNumber`, `boolean`, `number`] & { `attesterId`: `BigNumber` ; `chainId`: `number` ; `epoch`: `number` ; `nonce`: `number` ; `revealNonce`: `boolean`  }\> |
| `decodeEpochKeyLiteSignals` | (`publicSignals`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<[`EpochKeySignalsStructOutput`]\> |
| `shiftAndParse` | (`data`: `BigNumberish`, `shiftBits`: `BigNumberish`, `variableBits`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `verifyAndCheck` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<[`EpochKeySignalsStructOutput`]\> |
| `verifyAndCheckCaller` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<[`EpochKeySignalsStructOutput`]\> |

#### Overrides

BaseContract.functions

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:159

___

### interface

• **interface**: `EpochKeyLiteVerifierHelperInterface`

#### Overrides

BaseContract.interface

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:138

___

### off

• **off**: `OnEvent`<[`EpochKeyLiteVerifierHelper`](typechain.contracts.verifierHelpers.EpochKeyLiteVerifierHelper.md)\>

#### Overrides

BaseContract.off

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:154

___

### on

• **on**: `OnEvent`<[`EpochKeyLiteVerifierHelper`](typechain.contracts.verifierHelpers.EpochKeyLiteVerifierHelper.md)\>

#### Overrides

BaseContract.on

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:155

___

### once

• **once**: `OnEvent`<[`EpochKeyLiteVerifierHelper`](typechain.contracts.verifierHelpers.EpochKeyLiteVerifierHelper.md)\>

#### Overrides

BaseContract.once

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:156

___

### populateTransaction

• **populateTransaction**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `SNARK_SCALAR_FIELD` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `chainid` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `decodeEpochKeyControl` | (`control`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `decodeEpochKeyLiteSignals` | (`publicSignals`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `shiftAndParse` | (`data`: `BigNumberish`, `shiftBits`: `BigNumberish`, `variableBits`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `verifyAndCheck` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `verifyAndCheckCaller` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |

#### Overrides

BaseContract.populateTransaction

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:323

___

### provider

• `Readonly` **provider**: `Provider`

#### Inherited from

BaseContract.provider

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:82

___

### removeListener

• **removeListener**: `OnEvent`<[`EpochKeyLiteVerifierHelper`](typechain.contracts.verifierHelpers.EpochKeyLiteVerifierHelper.md)\>

#### Overrides

BaseContract.removeListener

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:157

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

### SNARK\_SCALAR\_FIELD

▸ **SNARK_SCALAR_FIELD**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:202

___

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

▸ **attach**(`addressOrName`): [`EpochKeyLiteVerifierHelper`](typechain.contracts.verifierHelpers.EpochKeyLiteVerifierHelper.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `addressOrName` | `string` |

#### Returns

[`EpochKeyLiteVerifierHelper`](typechain.contracts.verifierHelpers.EpochKeyLiteVerifierHelper.md)

#### Overrides

BaseContract.attach

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:135

___

### chainid

▸ **chainid**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:204

___

### connect

▸ **connect**(`signerOrProvider`): [`EpochKeyLiteVerifierHelper`](typechain.contracts.verifierHelpers.EpochKeyLiteVerifierHelper.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `signerOrProvider` | `string` \| `Provider` \| `Signer` |

#### Returns

[`EpochKeyLiteVerifierHelper`](typechain.contracts.verifierHelpers.EpochKeyLiteVerifierHelper.md)

#### Overrides

BaseContract.connect

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:134

___

### decodeEpochKeyControl

▸ **decodeEpochKeyControl**(`control`, `overrides?`): `Promise`<[`number`, `number`, `BigNumber`, `boolean`, `number`] & { `attesterId`: `BigNumber` ; `chainId`: `number` ; `epoch`: `number` ; `nonce`: `number` ; `revealNonce`: `boolean`  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `control` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<[`number`, `number`, `BigNumber`, `boolean`, `number`] & { `attesterId`: `BigNumber` ; `chainId`: `number` ; `epoch`: `number` ; `nonce`: `number` ; `revealNonce`: `boolean`  }\>

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:206

___

### decodeEpochKeyLiteSignals

▸ **decodeEpochKeyLiteSignals**(`publicSignals`, `overrides?`): `Promise`<`EpochKeySignalsStructOutput`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicSignals` | `BigNumberish`[] |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`EpochKeySignalsStructOutput`\>

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:219

___

### deployed

▸ **deployed**(): `Promise`<[`EpochKeyLiteVerifierHelper`](typechain.contracts.verifierHelpers.EpochKeyLiteVerifierHelper.md)\>

#### Returns

`Promise`<[`EpochKeyLiteVerifierHelper`](typechain.contracts.verifierHelpers.EpochKeyLiteVerifierHelper.md)\>

#### Overrides

BaseContract.deployed

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:136

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

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:146

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

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:149

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

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:140

___

### removeAllListeners

▸ **removeAllListeners**<`TEvent`\>(`eventFilter`): [`EpochKeyLiteVerifierHelper`](typechain.contracts.verifierHelpers.EpochKeyLiteVerifierHelper.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TEvent` | extends `TypedEvent`<`any`, `any`, `TEvent`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventFilter` | `TypedEventFilter`<`TEvent`\> |

#### Returns

[`EpochKeyLiteVerifierHelper`](typechain.contracts.verifierHelpers.EpochKeyLiteVerifierHelper.md)

#### Overrides

BaseContract.removeAllListeners

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:150

▸ **removeAllListeners**(`eventName?`): [`EpochKeyLiteVerifierHelper`](typechain.contracts.verifierHelpers.EpochKeyLiteVerifierHelper.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName?` | `string` |

#### Returns

[`EpochKeyLiteVerifierHelper`](typechain.contracts.verifierHelpers.EpochKeyLiteVerifierHelper.md)

#### Overrides

BaseContract.removeAllListeners

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:153

___

### shiftAndParse

▸ **shiftAndParse**(`data`, `shiftBits`, `variableBits`, `overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `BigNumberish` |
| `shiftBits` | `BigNumberish` |
| `variableBits` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:224

___

### verifyAndCheck

▸ **verifyAndCheck**(`publicSignals`, `proof`, `overrides?`): `Promise`<`EpochKeySignalsStructOutput`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicSignals` | `BigNumberish`[] |
| `proof` | `BigNumberish`[] |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`EpochKeySignalsStructOutput`\>

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:231

___

### verifyAndCheckCaller

▸ **verifyAndCheckCaller**(`publicSignals`, `proof`, `overrides?`): `Promise`<`EpochKeySignalsStructOutput`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicSignals` | `BigNumberish`[] |
| `proof` | `BigNumberish`[] |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`EpochKeySignalsStructOutput`\>

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/EpochKeyLiteVerifierHelper.ts:237
