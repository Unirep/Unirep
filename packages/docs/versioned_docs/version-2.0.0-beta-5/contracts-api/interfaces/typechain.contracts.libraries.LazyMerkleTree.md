---
id: "typechain.contracts.libraries.LazyMerkleTree"
title: "Interface: LazyMerkleTree"
sidebar_label: "LazyMerkleTree"
custom_edit_url: null
---

[contracts](../namespaces/typechain.contracts.md).[libraries](../namespaces/typechain.contracts.libraries.md).LazyMerkleTree

## Hierarchy

- `BaseContract`

  ↳ **`LazyMerkleTree`**

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
| `Z_0` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_1` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_10` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_11` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_12` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_13` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_14` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_15` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_16` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_17` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_18` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_19` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_2` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_20` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_21` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_22` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_23` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_24` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_25` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_26` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_27` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_28` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_29` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_3` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_30` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_31` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_32` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_4` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_5` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_6` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_7` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_8` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_9` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `defaultZero` | (`index`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `indexForElement` | (`level`: `BigNumberish`, `index`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`number`\> |

#### Overrides

BaseContract.callStatic

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:370

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
| `Z_0` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_1` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_10` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_11` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_12` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_13` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_14` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_15` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_16` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_17` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_18` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_19` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_2` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_20` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_21` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_22` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_23` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_24` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_25` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_26` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_27` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_28` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_29` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_3` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_30` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_31` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_32` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_4` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_5` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_6` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_7` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_8` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `Z_9` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `defaultZero` | (`index`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `indexForElement` | (`level`: `BigNumberish`, `index`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |

#### Overrides

BaseContract.estimateGas

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:451

___

### filters

• **filters**: `Object`

#### Overrides

BaseContract.filters

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:449

___

### functions

• **functions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `Z_0` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_1` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_10` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_11` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_12` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_13` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_14` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_15` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_16` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_17` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_18` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_19` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_2` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_20` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_21` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_22` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_23` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_24` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_25` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_26` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_27` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_28` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_29` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_3` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_30` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_31` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_32` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_4` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_5` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_6` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_7` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_8` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `Z_9` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `defaultZero` | (`index`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `indexForElement` | (`level`: `BigNumberish`, `index`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`number`]\> |

#### Overrides

BaseContract.functions

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:214

___

### interface

• **interface**: `LazyMerkleTreeInterface`

#### Overrides

BaseContract.interface

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:193

___

### off

• **off**: `OnEvent`<[`LazyMerkleTree`](typechain.contracts.libraries.LazyMerkleTree.md)\>

#### Overrides

BaseContract.off

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:209

___

### on

• **on**: `OnEvent`<[`LazyMerkleTree`](typechain.contracts.libraries.LazyMerkleTree.md)\>

#### Overrides

BaseContract.on

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:210

___

### once

• **once**: `OnEvent`<[`LazyMerkleTree`](typechain.contracts.libraries.LazyMerkleTree.md)\>

#### Overrides

BaseContract.once

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:211

___

### populateTransaction

• **populateTransaction**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `Z_0` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_1` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_10` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_11` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_12` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_13` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_14` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_15` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_16` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_17` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_18` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_19` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_2` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_20` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_21` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_22` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_23` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_24` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_25` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_26` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_27` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_28` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_29` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_3` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_30` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_31` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_32` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_4` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_5` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_6` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_7` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_8` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `Z_9` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `defaultZero` | (`index`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `indexForElement` | (`level`: `BigNumberish`, `index`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |

#### Overrides

BaseContract.populateTransaction

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:530

___

### provider

• `Readonly` **provider**: `Provider`

#### Inherited from

BaseContract.provider

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:82

___

### removeListener

• **removeListener**: `OnEvent`<[`LazyMerkleTree`](typechain.contracts.libraries.LazyMerkleTree.md)\>

#### Overrides

BaseContract.removeListener

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:212

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

### Z\_0

▸ **Z_0**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:293

___

### Z\_1

▸ **Z_1**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:295

___

### Z\_10

▸ **Z_10**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:297

___

### Z\_11

▸ **Z_11**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:299

___

### Z\_12

▸ **Z_12**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:301

___

### Z\_13

▸ **Z_13**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:303

___

### Z\_14

▸ **Z_14**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:305

___

### Z\_15

▸ **Z_15**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:307

___

### Z\_16

▸ **Z_16**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:309

___

### Z\_17

▸ **Z_17**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:311

___

### Z\_18

▸ **Z_18**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:313

___

### Z\_19

▸ **Z_19**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:315

___

### Z\_2

▸ **Z_2**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:317

___

### Z\_20

▸ **Z_20**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:319

___

### Z\_21

▸ **Z_21**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:321

___

### Z\_22

▸ **Z_22**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:323

___

### Z\_23

▸ **Z_23**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:325

___

### Z\_24

▸ **Z_24**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:327

___

### Z\_25

▸ **Z_25**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:329

___

### Z\_26

▸ **Z_26**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:331

___

### Z\_27

▸ **Z_27**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:333

___

### Z\_28

▸ **Z_28**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:335

___

### Z\_29

▸ **Z_29**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:337

___

### Z\_3

▸ **Z_3**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:339

___

### Z\_30

▸ **Z_30**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:341

___

### Z\_31

▸ **Z_31**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:343

___

### Z\_32

▸ **Z_32**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:345

___

### Z\_4

▸ **Z_4**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:347

___

### Z\_5

▸ **Z_5**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:349

___

### Z\_6

▸ **Z_6**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:351

___

### Z\_7

▸ **Z_7**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:353

___

### Z\_8

▸ **Z_8**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:355

___

### Z\_9

▸ **Z_9**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:357

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

▸ **attach**(`addressOrName`): [`LazyMerkleTree`](typechain.contracts.libraries.LazyMerkleTree.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `addressOrName` | `string` |

#### Returns

[`LazyMerkleTree`](typechain.contracts.libraries.LazyMerkleTree.md)

#### Overrides

BaseContract.attach

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:190

___

### connect

▸ **connect**(`signerOrProvider`): [`LazyMerkleTree`](typechain.contracts.libraries.LazyMerkleTree.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `signerOrProvider` | `string` \| `Provider` \| `Signer` |

#### Returns

[`LazyMerkleTree`](typechain.contracts.libraries.LazyMerkleTree.md)

#### Overrides

BaseContract.connect

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:189

___

### defaultZero

▸ **defaultZero**(`index`, `overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `index` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:359

___

### deployed

▸ **deployed**(): `Promise`<[`LazyMerkleTree`](typechain.contracts.libraries.LazyMerkleTree.md)\>

#### Returns

`Promise`<[`LazyMerkleTree`](typechain.contracts.libraries.LazyMerkleTree.md)\>

#### Overrides

BaseContract.deployed

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:191

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

### indexForElement

▸ **indexForElement**(`level`, `index`, `overrides?`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `level` | `BigNumberish` |
| `index` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`number`\>

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:364

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

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:201

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

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:204

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

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:195

___

### removeAllListeners

▸ **removeAllListeners**<`TEvent`\>(`eventFilter`): [`LazyMerkleTree`](typechain.contracts.libraries.LazyMerkleTree.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TEvent` | extends `TypedEvent`<`any`, `any`, `TEvent`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventFilter` | `TypedEventFilter`<`TEvent`\> |

#### Returns

[`LazyMerkleTree`](typechain.contracts.libraries.LazyMerkleTree.md)

#### Overrides

BaseContract.removeAllListeners

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:205

▸ **removeAllListeners**(`eventName?`): [`LazyMerkleTree`](typechain.contracts.libraries.LazyMerkleTree.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName?` | `string` |

#### Returns

[`LazyMerkleTree`](typechain.contracts.libraries.LazyMerkleTree.md)

#### Overrides

BaseContract.removeAllListeners

#### Defined in

packages/contracts/typechain/contracts/libraries/LazyMerkleTree.ts:208
