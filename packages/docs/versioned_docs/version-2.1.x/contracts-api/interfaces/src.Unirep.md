---
id: "src.Unirep"
title: "Interface: Unirep"
sidebar_label: "Unirep"
custom_edit_url: null
---

[src](../modules/src.md).Unirep

## Hierarchy

- `BaseContract`

  ↳ **`Unirep`**

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
| `_updateEpochIfNeeded` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `attest` | (`epochKey`: `BigNumberish`, `epoch`: `BigNumberish`, `fieldIndex`: `BigNumberish`, `change`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`void`\> |
| `attestationCount` | (`overrides?`: `CallOverrides`) => `Promise`<`number`\> |
| `attesterCurrentEpoch` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`number`\> |
| `attesterEpochLength` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`number`\> |
| `attesterEpochRemainingTime` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`number`\> |
| `attesterEpochRoot` | (`attesterId`: `BigNumberish`, `epoch`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `attesterMemberCount` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `attesterSemaphoreGroupRoot` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `attesterSignUp` | (`epochLength`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`void`\> |
| `attesterSignUpViaRelayer` | (`attester`: `string`, `epochLength`: `BigNumberish`, `signature`: `BytesLike`, `overrides?`: `CallOverrides`) => `Promise`<`void`\> |
| `attesterStartTimestamp` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `attesterStateTreeLeafCount` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `attesterStateTreeRoot` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `attesterStateTreeRootExists` | (`attesterId`: `BigNumberish`, `epoch`: `BigNumberish`, `root`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`boolean`\> |
| `chainid` | (`overrides?`: `CallOverrides`) => `Promise`<`number`\> |
| `config` | (`overrides?`: `CallOverrides`) => `Promise`<`ConfigStructOutput`\> |
| `decodeSignupControl` | (`control`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`, `number`, `number`] & { `attesterId`: `BigNumber` ; `chainId`: `number` ; `epoch`: `number`  }\> |
| `decodeSignupSignals` | (`publicSignals`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`SignupSignalsStructOutput`\> |
| `decodeUserStateTransitionControl` | (`control`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`, `number`] & { `attesterId`: `BigNumber` ; `toEpoch`: `number`  }\> |
| `decodeUserStateTransitionSignals` | (`publicSignals`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`UserStateTransitionSignalsStructOutput`\> |
| `defaultDataHash` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `epochTreeDepth` | (`overrides?`: `CallOverrides`) => `Promise`<`number`\> |
| `fieldCount` | (`overrides?`: `CallOverrides`) => `Promise`<`number`\> |
| `historyTreeDepth` | (`overrides?`: `CallOverrides`) => `Promise`<`number`\> |
| `manualUserSignUp` | (`epoch`: `BigNumberish`, `identityCommitment`: `BigNumberish`, `leafIdentityHash`: `BigNumberish`, `initialData`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`void`\> |
| `numEpochKeyNoncePerEpoch` | (`overrides?`: `CallOverrides`) => `Promise`<`number`\> |
| `replFieldBits` | (`overrides?`: `CallOverrides`) => `Promise`<`number`\> |
| `replNonceBits` | (`overrides?`: `CallOverrides`) => `Promise`<`number`\> |
| `signupVerifier` | (`overrides?`: `CallOverrides`) => `Promise`<`string`\> |
| `stateTreeDepth` | (`overrides?`: `CallOverrides`) => `Promise`<`number`\> |
| `sumFieldCount` | (`overrides?`: `CallOverrides`) => `Promise`<`number`\> |
| `updateEpochIfNeeded` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`number`\> |
| `usedNullifiers` | (`arg0`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`boolean`\> |
| `userSignUp` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`void`\> |
| `userStateTransition` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`void`\> |
| `userStateTransitionVerifier` | (`overrides?`: `CallOverrides`) => `Promise`<`string`\> |

#### Overrides

BaseContract.callStatic

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:957

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
| `_updateEpochIfNeeded` | (`attesterId`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`BigNumber`\> |
| `attest` | (`epochKey`: `BigNumberish`, `epoch`: `BigNumberish`, `fieldIndex`: `BigNumberish`, `change`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`BigNumber`\> |
| `attestationCount` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `attesterCurrentEpoch` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `attesterEpochLength` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `attesterEpochRemainingTime` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `attesterEpochRoot` | (`attesterId`: `BigNumberish`, `epoch`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `attesterMemberCount` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `attesterSemaphoreGroupRoot` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `attesterSignUp` | (`epochLength`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`BigNumber`\> |
| `attesterSignUpViaRelayer` | (`attester`: `string`, `epochLength`: `BigNumberish`, `signature`: `BytesLike`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`BigNumber`\> |
| `attesterStartTimestamp` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `attesterStateTreeLeafCount` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `attesterStateTreeRoot` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `attesterStateTreeRootExists` | (`attesterId`: `BigNumberish`, `epoch`: `BigNumberish`, `root`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `chainid` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `config` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `decodeSignupControl` | (`control`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `decodeSignupSignals` | (`publicSignals`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `decodeUserStateTransitionControl` | (`control`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `decodeUserStateTransitionSignals` | (`publicSignals`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `defaultDataHash` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `epochTreeDepth` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `fieldCount` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `historyTreeDepth` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `manualUserSignUp` | (`epoch`: `BigNumberish`, `identityCommitment`: `BigNumberish`, `leafIdentityHash`: `BigNumberish`, `initialData`: `BigNumberish`[], `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`BigNumber`\> |
| `numEpochKeyNoncePerEpoch` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `replFieldBits` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `replNonceBits` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `signupVerifier` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `stateTreeDepth` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `sumFieldCount` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `updateEpochIfNeeded` | (`attesterId`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`BigNumber`\> |
| `usedNullifiers` | (`arg0`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |
| `userSignUp` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`BigNumber`\> |
| `userStateTransition` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`BigNumber`\> |
| `userStateTransitionVerifier` | (`overrides?`: `CallOverrides`) => `Promise`<`BigNumber`\> |

#### Overrides

BaseContract.estimateGas

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:1225

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

packages/contracts/typechain/contracts/Unirep.ts:1125

___

### functions

• **functions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `SNARK_SCALAR_FIELD` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `_updateEpochIfNeeded` | (`attesterId`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`ContractTransaction`\> |
| `attest` | (`epochKey`: `BigNumberish`, `epoch`: `BigNumberish`, `fieldIndex`: `BigNumberish`, `change`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`ContractTransaction`\> |
| `attestationCount` | (`overrides?`: `CallOverrides`) => `Promise`<[`number`]\> |
| `attesterCurrentEpoch` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`number`]\> |
| `attesterEpochLength` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`number`]\> |
| `attesterEpochRemainingTime` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`number`]\> |
| `attesterEpochRoot` | (`attesterId`: `BigNumberish`, `epoch`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `attesterMemberCount` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `attesterSemaphoreGroupRoot` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `attesterSignUp` | (`epochLength`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`ContractTransaction`\> |
| `attesterSignUpViaRelayer` | (`attester`: `string`, `epochLength`: `BigNumberish`, `signature`: `BytesLike`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`ContractTransaction`\> |
| `attesterStartTimestamp` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `attesterStateTreeLeafCount` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `attesterStateTreeRoot` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `attesterStateTreeRootExists` | (`attesterId`: `BigNumberish`, `epoch`: `BigNumberish`, `root`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`boolean`]\> |
| `chainid` | (`overrides?`: `CallOverrides`) => `Promise`<[`number`]\> |
| `config` | (`overrides?`: `CallOverrides`) => `Promise`<[`ConfigStructOutput`]\> |
| `decodeSignupControl` | (`control`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`, `number`, `number`] & { `attesterId`: `BigNumber` ; `chainId`: `number` ; `epoch`: `number`  }\> |
| `decodeSignupSignals` | (`publicSignals`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<[`SignupSignalsStructOutput`]\> |
| `decodeUserStateTransitionControl` | (`control`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`, `number`] & { `attesterId`: `BigNumber` ; `toEpoch`: `number`  }\> |
| `decodeUserStateTransitionSignals` | (`publicSignals`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<[`UserStateTransitionSignalsStructOutput`]\> |
| `defaultDataHash` | (`overrides?`: `CallOverrides`) => `Promise`<[`BigNumber`]\> |
| `epochTreeDepth` | (`overrides?`: `CallOverrides`) => `Promise`<[`number`]\> |
| `fieldCount` | (`overrides?`: `CallOverrides`) => `Promise`<[`number`]\> |
| `historyTreeDepth` | (`overrides?`: `CallOverrides`) => `Promise`<[`number`]\> |
| `manualUserSignUp` | (`epoch`: `BigNumberish`, `identityCommitment`: `BigNumberish`, `leafIdentityHash`: `BigNumberish`, `initialData`: `BigNumberish`[], `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`ContractTransaction`\> |
| `numEpochKeyNoncePerEpoch` | (`overrides?`: `CallOverrides`) => `Promise`<[`number`]\> |
| `replFieldBits` | (`overrides?`: `CallOverrides`) => `Promise`<[`number`]\> |
| `replNonceBits` | (`overrides?`: `CallOverrides`) => `Promise`<[`number`]\> |
| `signupVerifier` | (`overrides?`: `CallOverrides`) => `Promise`<[`string`]\> |
| `stateTreeDepth` | (`overrides?`: `CallOverrides`) => `Promise`<[`number`]\> |
| `sumFieldCount` | (`overrides?`: `CallOverrides`) => `Promise`<[`number`]\> |
| `updateEpochIfNeeded` | (`attesterId`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`ContractTransaction`\> |
| `usedNullifiers` | (`arg0`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<[`boolean`]\> |
| `userSignUp` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`ContractTransaction`\> |
| `userStateTransition` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`ContractTransaction`\> |
| `userStateTransitionVerifier` | (`overrides?`: `CallOverrides`) => `Promise`<[`string`]\> |

#### Overrides

BaseContract.functions

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:625

___

### interface

• **interface**: `UnirepInterface`

#### Overrides

BaseContract.interface

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:604

___

### off

• **off**: `OnEvent`<[`Unirep`](src.Unirep.md)\>

#### Overrides

BaseContract.off

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:620

___

### on

• **on**: `OnEvent`<[`Unirep`](src.Unirep.md)\>

#### Overrides

BaseContract.on

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:621

___

### once

• **once**: `OnEvent`<[`Unirep`](src.Unirep.md)\>

#### Overrides

BaseContract.once

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:622

___

### populateTransaction

• **populateTransaction**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `SNARK_SCALAR_FIELD` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `_updateEpochIfNeeded` | (`attesterId`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`PopulatedTransaction`\> |
| `attest` | (`epochKey`: `BigNumberish`, `epoch`: `BigNumberish`, `fieldIndex`: `BigNumberish`, `change`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`PopulatedTransaction`\> |
| `attestationCount` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `attesterCurrentEpoch` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `attesterEpochLength` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `attesterEpochRemainingTime` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `attesterEpochRoot` | (`attesterId`: `BigNumberish`, `epoch`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `attesterMemberCount` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `attesterSemaphoreGroupRoot` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `attesterSignUp` | (`epochLength`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`PopulatedTransaction`\> |
| `attesterSignUpViaRelayer` | (`attester`: `string`, `epochLength`: `BigNumberish`, `signature`: `BytesLike`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`PopulatedTransaction`\> |
| `attesterStartTimestamp` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `attesterStateTreeLeafCount` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `attesterStateTreeRoot` | (`attesterId`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `attesterStateTreeRootExists` | (`attesterId`: `BigNumberish`, `epoch`: `BigNumberish`, `root`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `chainid` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `config` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `decodeSignupControl` | (`control`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `decodeSignupSignals` | (`publicSignals`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `decodeUserStateTransitionControl` | (`control`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `decodeUserStateTransitionSignals` | (`publicSignals`: `BigNumberish`[], `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `defaultDataHash` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `epochTreeDepth` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `fieldCount` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `historyTreeDepth` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `manualUserSignUp` | (`epoch`: `BigNumberish`, `identityCommitment`: `BigNumberish`, `leafIdentityHash`: `BigNumberish`, `initialData`: `BigNumberish`[], `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`PopulatedTransaction`\> |
| `numEpochKeyNoncePerEpoch` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `replFieldBits` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `replNonceBits` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `signupVerifier` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `stateTreeDepth` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `sumFieldCount` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `updateEpochIfNeeded` | (`attesterId`: `BigNumberish`, `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`PopulatedTransaction`\> |
| `usedNullifiers` | (`arg0`: `BigNumberish`, `overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |
| `userSignUp` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`PopulatedTransaction`\> |
| `userStateTransition` | (`publicSignals`: `BigNumberish`[], `proof`: `BigNumberish`[], `overrides?`: `Overrides` & { `from?`: `string`  }) => `Promise`<`PopulatedTransaction`\> |
| `userStateTransitionVerifier` | (`overrides?`: `CallOverrides`) => `Promise`<`PopulatedTransaction`\> |

#### Overrides

BaseContract.populateTransaction

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:1385

___

### provider

• `Readonly` **provider**: `Provider`

#### Inherited from

BaseContract.provider

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:82

___

### removeListener

• **removeListener**: `OnEvent`<[`Unirep`](src.Unirep.md)\>

#### Overrides

BaseContract.removeListener

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:623

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

packages/contracts/typechain/contracts/Unirep.ts:793

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

### \_updateEpochIfNeeded

▸ **_updateEpochIfNeeded**(`attesterId`, `overrides?`): `Promise`<`ContractTransaction`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `attesterId` | `BigNumberish` |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<`ContractTransaction`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:795

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

▸ **attach**(`addressOrName`): [`Unirep`](src.Unirep.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `addressOrName` | `string` |

#### Returns

[`Unirep`](src.Unirep.md)

#### Overrides

BaseContract.attach

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:601

___

### attest

▸ **attest**(`epochKey`, `epoch`, `fieldIndex`, `change`, `overrides?`): `Promise`<`ContractTransaction`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `epochKey` | `BigNumberish` |
| `epoch` | `BigNumberish` |
| `fieldIndex` | `BigNumberish` |
| `change` | `BigNumberish` |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<`ContractTransaction`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:800

___

### attestationCount

▸ **attestationCount**(`overrides?`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`number`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:808

___

### attesterCurrentEpoch

▸ **attesterCurrentEpoch**(`attesterId`, `overrides?`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `attesterId` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`number`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:810

___

### attesterEpochLength

▸ **attesterEpochLength**(`attesterId`, `overrides?`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `attesterId` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`number`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:815

___

### attesterEpochRemainingTime

▸ **attesterEpochRemainingTime**(`attesterId`, `overrides?`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `attesterId` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`number`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:820

___

### attesterEpochRoot

▸ **attesterEpochRoot**(`attesterId`, `epoch`, `overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `attesterId` | `BigNumberish` |
| `epoch` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:825

___

### attesterMemberCount

▸ **attesterMemberCount**(`attesterId`, `overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `attesterId` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:831

___

### attesterSemaphoreGroupRoot

▸ **attesterSemaphoreGroupRoot**(`attesterId`, `overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `attesterId` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:836

___

### attesterSignUp

▸ **attesterSignUp**(`epochLength`, `overrides?`): `Promise`<`ContractTransaction`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `epochLength` | `BigNumberish` |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<`ContractTransaction`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:841

___

### attesterSignUpViaRelayer

▸ **attesterSignUpViaRelayer**(`attester`, `epochLength`, `signature`, `overrides?`): `Promise`<`ContractTransaction`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `attester` | `string` |
| `epochLength` | `BigNumberish` |
| `signature` | `BytesLike` |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<`ContractTransaction`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:846

___

### attesterStartTimestamp

▸ **attesterStartTimestamp**(`attesterId`, `overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `attesterId` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:853

___

### attesterStateTreeLeafCount

▸ **attesterStateTreeLeafCount**(`attesterId`, `overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `attesterId` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:858

___

### attesterStateTreeRoot

▸ **attesterStateTreeRoot**(`attesterId`, `overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `attesterId` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:863

___

### attesterStateTreeRootExists

▸ **attesterStateTreeRootExists**(`attesterId`, `epoch`, `root`, `overrides?`): `Promise`<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `attesterId` | `BigNumberish` |
| `epoch` | `BigNumberish` |
| `root` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`boolean`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:868

___

### chainid

▸ **chainid**(`overrides?`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`number`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:875

___

### config

▸ **config**(`overrides?`): `Promise`<`ConfigStructOutput`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`ConfigStructOutput`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:877

___

### connect

▸ **connect**(`signerOrProvider`): [`Unirep`](src.Unirep.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `signerOrProvider` | `string` \| `Provider` \| `Signer` |

#### Returns

[`Unirep`](src.Unirep.md)

#### Overrides

BaseContract.connect

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:600

___

### decodeSignupControl

▸ **decodeSignupControl**(`control`, `overrides?`): `Promise`<[`BigNumber`, `number`, `number`] & { `attesterId`: `BigNumber` ; `chainId`: `number` ; `epoch`: `number`  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `control` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<[`BigNumber`, `number`, `number`] & { `attesterId`: `BigNumber` ; `chainId`: `number` ; `epoch`: `number`  }\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:879

___

### decodeSignupSignals

▸ **decodeSignupSignals**(`publicSignals`, `overrides?`): `Promise`<`SignupSignalsStructOutput`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicSignals` | `BigNumberish`[] |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`SignupSignalsStructOutput`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:890

___

### decodeUserStateTransitionControl

▸ **decodeUserStateTransitionControl**(`control`, `overrides?`): `Promise`<[`BigNumber`, `number`] & { `attesterId`: `BigNumber` ; `toEpoch`: `number`  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `control` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<[`BigNumber`, `number`] & { `attesterId`: `BigNumber` ; `toEpoch`: `number`  }\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:895

___

### decodeUserStateTransitionSignals

▸ **decodeUserStateTransitionSignals**(`publicSignals`, `overrides?`): `Promise`<`UserStateTransitionSignalsStructOutput`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicSignals` | `BigNumberish`[] |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`UserStateTransitionSignalsStructOutput`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:900

___

### defaultDataHash

▸ **defaultDataHash**(`overrides?`): `Promise`<`BigNumber`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`BigNumber`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:905

___

### deployed

▸ **deployed**(): `Promise`<[`Unirep`](src.Unirep.md)\>

#### Returns

`Promise`<[`Unirep`](src.Unirep.md)\>

#### Overrides

BaseContract.deployed

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:602

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

### epochTreeDepth

▸ **epochTreeDepth**(`overrides?`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`number`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:907

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

### fieldCount

▸ **fieldCount**(`overrides?`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`number`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:909

___

### historyTreeDepth

▸ **historyTreeDepth**(`overrides?`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`number`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:911

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

packages/contracts/typechain/contracts/Unirep.ts:612

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

packages/contracts/typechain/contracts/Unirep.ts:615

___

### manualUserSignUp

▸ **manualUserSignUp**(`epoch`, `identityCommitment`, `leafIdentityHash`, `initialData`, `overrides?`): `Promise`<`ContractTransaction`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `epoch` | `BigNumberish` |
| `identityCommitment` | `BigNumberish` |
| `leafIdentityHash` | `BigNumberish` |
| `initialData` | `BigNumberish`[] |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<`ContractTransaction`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:913

___

### numEpochKeyNoncePerEpoch

▸ **numEpochKeyNoncePerEpoch**(`overrides?`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`number`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:921

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

packages/contracts/typechain/contracts/Unirep.ts:606

___

### removeAllListeners

▸ **removeAllListeners**<`TEvent`\>(`eventFilter`): [`Unirep`](src.Unirep.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TEvent` | extends `TypedEvent`<`any`, `any`, `TEvent`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventFilter` | `TypedEventFilter`<`TEvent`\> |

#### Returns

[`Unirep`](src.Unirep.md)

#### Overrides

BaseContract.removeAllListeners

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:616

▸ **removeAllListeners**(`eventName?`): [`Unirep`](src.Unirep.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `eventName?` | `string` |

#### Returns

[`Unirep`](src.Unirep.md)

#### Overrides

BaseContract.removeAllListeners

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:619

___

### replFieldBits

▸ **replFieldBits**(`overrides?`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`number`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:923

___

### replNonceBits

▸ **replNonceBits**(`overrides?`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`number`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:925

___

### signupVerifier

▸ **signupVerifier**(`overrides?`): `Promise`<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`string`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:927

___

### stateTreeDepth

▸ **stateTreeDepth**(`overrides?`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`number`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:929

___

### sumFieldCount

▸ **sumFieldCount**(`overrides?`): `Promise`<`number`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`number`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:931

___

### updateEpochIfNeeded

▸ **updateEpochIfNeeded**(`attesterId`, `overrides?`): `Promise`<`ContractTransaction`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `attesterId` | `BigNumberish` |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<`ContractTransaction`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:933

___

### usedNullifiers

▸ **usedNullifiers**(`arg0`, `overrides?`): `Promise`<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `arg0` | `BigNumberish` |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`boolean`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:938

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

packages/contracts/typechain/contracts/Unirep.ts:943

___

### userStateTransition

▸ **userStateTransition**(`publicSignals`, `proof`, `overrides?`): `Promise`<`ContractTransaction`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `publicSignals` | `BigNumberish`[] |
| `proof` | `BigNumberish`[] |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<`ContractTransaction`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:949

___

### userStateTransitionVerifier

▸ **userStateTransitionVerifier**(`overrides?`): `Promise`<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `overrides?` | `CallOverrides` |

#### Returns

`Promise`<`string`\>

#### Defined in

packages/contracts/typechain/contracts/Unirep.ts:955
