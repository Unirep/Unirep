---
id: "typechain.factories.contracts.interfaces.IUnirep__factory"
title: "Class: IUnirep__factory"
sidebar_label: "IUnirep__factory"
custom_edit_url: null
---

[contracts](../namespaces/typechain.factories.contracts.md).[interfaces](../namespaces/typechain.factories.contracts.interfaces.md).IUnirep__factory

## Constructors

### constructor

• **new IUnirep__factory**()

## Properties

### abi

▪ `Static` `Readonly` **abi**: readonly [{ `inputs`: readonly [{ `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attester"`` = "attester"; `type`: ``"uint160"`` = "uint160" }] ; `name`: ``"AttesterAlreadySignUp"`` = "AttesterAlreadySignUp"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [{ `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }] ; `name`: ``"AttesterIdNotMatch"`` = "AttesterIdNotMatch"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"AttesterInvalid"`` = "AttesterInvalid"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [{ `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attester"`` = "attester"; `type`: ``"uint160"`` = "uint160" }] ; `name`: ``"AttesterNotSignUp"`` = "AttesterNotSignUp"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [{ `internalType`: ``"uint48"`` = "uint48"; `name`: ``"chainId"`` = "chainId"; `type`: ``"uint48"`` = "uint48" }] ; `name`: ``"ChainIdNotMatch"`` = "ChainIdNotMatch"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"EpochKeyNotProcessed"`` = "EpochKeyNotProcessed"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"EpochNotMatch"`` = "EpochNotMatch"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"InvalidEpoch"`` = "InvalidEpoch"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"InvalidEpochKey"`` = "InvalidEpochKey"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"InvalidField"`` = "InvalidField"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"historyTreeRoot"`` = "historyTreeRoot"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"InvalidHistoryTreeRoot"`` = "InvalidHistoryTreeRoot"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"InvalidProof"`` = "InvalidProof"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"InvalidSignature"`` = "InvalidSignature"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"nullilier"`` = "nullilier"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"NullifierAlreadyUsed"`` = "NullifierAlreadyUsed"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"OutOfRange"`` = "OutOfRange"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"identityCommitment"`` = "identityCommitment"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"UserAlreadySignedUp"`` = "UserAlreadySignedUp"; `type`: ``"error"`` = "error" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `indexed`: ``true`` = true; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"epochKey"`` = "epochKey"; `type`: ``"uint256"`` = "uint256" }, { `indexed`: ``true`` = true; `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `indexed`: ``false`` = false; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"fieldIndex"`` = "fieldIndex"; `type`: ``"uint256"`` = "uint256" }, { `indexed`: ``false`` = false; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"change"`` = "change"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"Attestation"`` = "Attestation"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `indexed`: ``false`` = false; `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epochLength"`` = "epochLength"; `type`: ``"uint48"`` = "uint48" }, { `indexed`: ``false`` = false; `internalType`: ``"uint48"`` = "uint48"; `name`: ``"timestamp"`` = "timestamp"; `type`: ``"uint48"`` = "uint48" }] ; `name`: ``"AttesterSignedUp"`` = "AttesterSignedUp"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `indexed`: ``true`` = true; `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }] ; `name`: ``"EpochEnded"`` = "EpochEnded"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `indexed`: ``true`` = true; `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `indexed`: ``true`` = true; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"index"`` = "index"; `type`: ``"uint256"`` = "uint256" }, { `indexed`: ``false`` = false; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"leaf"`` = "leaf"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"EpochTreeLeaf"`` = "EpochTreeLeaf"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `indexed`: ``false`` = false; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"leaf"`` = "leaf"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"HistoryTreeLeaf"`` = "HistoryTreeLeaf"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `indexed`: ``true`` = true; `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `indexed`: ``true`` = true; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"index"`` = "index"; `type`: ``"uint256"`` = "uint256" }, { `indexed`: ``false`` = false; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"leaf"`` = "leaf"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"StateTreeLeaf"`` = "StateTreeLeaf"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `indexed`: ``true`` = true; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"identityCommitment"`` = "identityCommitment"; `type`: ``"uint256"`` = "uint256" }, { `indexed`: ``true`` = true; `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `indexed`: ``false`` = false; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"leafIndex"`` = "leafIndex"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"UserSignedUp"`` = "UserSignedUp"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `indexed`: ``true`` = true; `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `indexed`: ``true`` = true; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"leafIndex"`` = "leafIndex"; `type`: ``"uint256"`` = "uint256" }, { `indexed`: ``false`` = false; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"hashedLeaf"`` = "hashedLeaf"; `type`: ``"uint256"`` = "uint256" }, { `indexed`: ``false`` = false; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"nullifier"`` = "nullifier"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"UserStateTransitioned"`` = "UserStateTransitioned"; `type`: ``"event"`` = "event" }] = `_abi`

#### Defined in

packages/contracts/typechain/factories/contracts/interfaces/IUnirep__factory.ts:374

## Methods

### connect

▸ `Static` **connect**(`address`, `signerOrProvider`): [`IUnirep`](../interfaces/typechain.contracts.interfaces.IUnirep.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |
| `signerOrProvider` | `Provider` \| `Signer` |

#### Returns

[`IUnirep`](../interfaces/typechain.contracts.interfaces.IUnirep.md)

#### Defined in

packages/contracts/typechain/factories/contracts/interfaces/IUnirep__factory.ts:378

___

### createInterface

▸ `Static` **createInterface**(): `IUnirepInterface`

#### Returns

`IUnirepInterface`

#### Defined in

packages/contracts/typechain/factories/contracts/interfaces/IUnirep__factory.ts:375
