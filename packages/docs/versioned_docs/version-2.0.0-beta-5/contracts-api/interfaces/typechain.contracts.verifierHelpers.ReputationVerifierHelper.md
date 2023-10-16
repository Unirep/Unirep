---
id: "typechain.contracts.verifierHelpers.ReputationVerifierHelper"
title: "Interface: ReputationVerifierHelper"
sidebar_label: "ReputationVerifierHelper"
custom_edit_url: null
---

[contracts](../namespaces/typechain.contracts.md).[verifierHelpers](../namespaces/typechain.contracts.verifierHelpers.md).ReputationVerifierHelper

## Hierarchy

- `BaseContract`

  ↳ **`ReputationVerifierHelper`**

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
| `decodeReputationControl` | (`control`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`, `BigNumber`, `boolean`, `boolean`, `boolean`, `boolean`] & { `maxRep`: `BigNumber` ; `minRep`: `BigNumber` ; `proveGraffiti`: `boolean` ; `proveMaxRep`: `boolean` ; `proveMinRep`: `boolean` ; `proveZeroRep`: `boolean`  }\> |
| `decodeReputationSignals` | (`publicSignals`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`ReputationSignalsStructOutput`\> |
| `shiftAndParse` | (`data`: `BigNumberish`, `shiftBits`: `BigNumberish`, `variableBits`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `verifyAndCheck` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`ReputationSignalsStructOutput`\> |
| `verifyAndCheckCaller` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`ReputationSignalsStructOutput`\> |

#### Overrides

BaseContract.callStatic

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:302

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
| `decodeReputationControl` | (`control`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `decodeReputationSignals` | (`publicSignals`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `shiftAndParse` | (`data`: `BigNumberish`, `shiftBits`: `BigNumberish`, `variableBits`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `verifyAndCheck` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `verifyAndCheckCaller` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |

#### Overrides

BaseContract.estimateGas

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:361

___

### filters

• **filters**: `Object`

#### Overrides

BaseContract.filters

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:359

___

### functions

• **functions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `SNARK_SCALAR_FIELD` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `chainid` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `decodeEpochKeyControl` | (`control`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`number`, `number`, `BigNumber`, `boolean`, `number`] & { `attesterId`: `BigNumber` ; `chainId`: `number` ; `epoch`: `number` ; `nonce`: `number` ; `revealNonce`: `boolean`  }\> |
| `decodeReputationControl` | (`control`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`, `BigNumber`, `boolean`, `boolean`, `boolean`, `boolean`] & { `maxRep`: `BigNumber` ; `minRep`: `BigNumber` ; `proveGraffiti`: `boolean` ; `proveMaxRep`: `boolean` ; `proveMinRep`: `boolean` ; `proveZeroRep`: `boolean`  }\> |
| `decodeReputationSignals` | (`publicSignals`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<[`ReputationSignalsStructOutput`]\> |
| `shiftAndParse` | (`data`: `BigNumberish`, `shiftBits`: `BigNumberish`, `variableBits`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `verifyAndCheck` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<[`ReputationSignalsStructOutput`]\> |
| `verifyAndCheckCaller` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<[`ReputationSignalsStructOutput`]\> |

#### Overrides

BaseContract.functions

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:190

___

### interface

• **interface**: `ReputationVerifierHelperInterface`

#### Overrides

BaseContract.interface

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:169

___

### off

• **off**: `OnEvent`<[`ReputationVerifierHelper`](typechain.contracts.verifierHelpers.ReputationVerifierHelper.md)\>

#### Overrides

BaseContract.off

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:185

___

### on

• **on**: `OnEvent`<[`ReputationVerifierHelper`](typechain.contracts.verifierHelpers.ReputationVerifierHelper.md)\>

#### Overrides

BaseContract.on

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:186

___

### once

• **once**: `OnEvent`<[`ReputationVerifierHelper`](typechain.contracts.verifierHelpers.ReputationVerifierHelper.md)\>

#### Overrides

BaseContract.once

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:187

___

### populateTransaction

• **populateTransaction**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `SNARK_SCALAR_FIELD` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `chainid` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `decodeEpochKeyControl` | (`control`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `decodeReputationControl` | (`control`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `decodeReputationSignals` | (`publicSignals`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `shiftAndParse` | (`data`: `BigNumberish`, `shiftBits`: `BigNumberish`, `variableBits`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `verifyAndCheck` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `verifyAndCheckCaller` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |

#### Overrides

BaseContract.populateTransaction

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:401

___

### provider

• `Readonly` **provider**: `Provider`

#### Inherited from

BaseContract.provider

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:82

___

### removeListener

• **removeListener**: `OnEvent`<[`ReputationVerifierHelper`](typechain.contracts.verifierHelpers.ReputationVerifierHelper.md)\>

#### Overrides

BaseContract.removeListener

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:188

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

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:247

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

▸ **attach**(`addressOrName`): [`ReputationVerifierHelper`](typechain.contracts.verifierHelpers.ReputationVerifierHelper.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `addressOrName` | `string` |

#### Returns

[`ReputationVerifierHelper`](typechain.contracts.verifierHelpers.ReputationVerifierHelper.md)

#### Overrides

BaseContract.attach

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:166

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

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:249

___

### connect

▸ **connect**(`signerOrProvider`): [`ReputationVerifierHelper`](typechain.contracts.verifierHelpers.ReputationVerifierHelper.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `signerOrProvider` | `string` \| `Provider` \| `Signer` |

#### Returns

[`ReputationVerifierHelper`](typechain.contracts.verifierHelpers.ReputationVerifierHelper.md)

#### Overrides

BaseContract.connect

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:165

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

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:251

___

### decodeReputationControl

▸ **decodeReputationControl**(`control`, `overrides?`): `Promise`<[`BigNumber`, `BigNumber`, `boolean`, `boolean`, `boolean`, `boolean`] & { `maxRep`: `BigNumber` ; `minRep`: `BigNumber` ; `proveGraffiti`: `boolean` ; `proveMaxRep`: `boolean` ; `proveMinRep`: `boolean` ; `proveZeroRep`: `boolean`  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `control` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<[`BigNumber`, `BigNumber`, `boolean`, `boolean`, `boolean`, `boolean`] & { `maxRep`: `BigNumber` ; `minRep`: `BigNumber` ; `proveGraffiti`: `boolean` ; `proveMaxRep`: `boolean` ; `proveMinRep`: `boolean` ; `proveZeroRep`: `boolean`  }\>

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:264

___

### decodeReputationSignals

▸ **decodeReputationSignals**(`publicSignals`, `overrides?`): `Promise`<`ReputationSignalsStructOutput`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicSignals` | `BigNumberish`[] |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`ReputationSignalsStructOutput`\>

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:278

___

### deployed

▸ **deployed**(): `Promise`<[`ReputationVerifierHelper`](typechain.contracts.verifierHelpers.ReputationVerifierHelper.md)\>

#### Returns

`Promise`<[`ReputationVerifierHelper`](typechain.contracts.verifierHelpers.ReputationVerifierHelper.md)\>

#### Overrides

BaseContract.deployed

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:167

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

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:177

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

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:180

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

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:171

___

### removeAllListeners

▸ **removeAllListeners**<`TEvent`\>(`eventFilter`): [`ReputationVerifierHelper`](typechain.contracts.verifierHelpers.ReputationVerifierHelper.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TEvent` | extends `TypedEvent`<`any`, `any`, `TEvent`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventFilter` | `TypedEventFilter`<`TEvent`\> |

#### Returns

[`ReputationVerifierHelper`](typechain.contracts.verifierHelpers.ReputationVerifierHelper.md)

#### Overrides

BaseContract.removeAllListeners

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:181

▸ **removeAllListeners**(`eventName?`): [`ReputationVerifierHelper`](typechain.contracts.verifierHelpers.ReputationVerifierHelper.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName?` | `string` |

#### Returns

[`ReputationVerifierHelper`](typechain.contracts.verifierHelpers.ReputationVerifierHelper.md)

#### Overrides

BaseContract.removeAllListeners

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:184

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

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:283

___

### verifyAndCheck

▸ **verifyAndCheck**(`publicSignals`, `proof`, `overrides?`): `Promise`<`ReputationSignalsStructOutput`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicSignals` | `BigNumberish`[] |
| `proof` | `BigNumberish`[] |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`ReputationSignalsStructOutput`\>

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:290

___

### verifyAndCheckCaller

▸ **verifyAndCheckCaller**(`publicSignals`, `proof`, `overrides?`): `Promise`<`ReputationSignalsStructOutput`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicSignals` | `BigNumberish`[] |
| `proof` | `BigNumberish`[] |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`ReputationSignalsStructOutput`\>

#### Defined in

packages/contracts/typechain/contracts/verifierHelpers/ReputationVerifierHelper.ts:296
