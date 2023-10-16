---
id: "typechain.factories.contracts.interfaces.IVerifier__factory"
title: "Class: IVerifier__factory"
sidebar_label: "IVerifier__factory"
custom_edit_url: null
---

[contracts](../namespaces/typechain.factories.contracts.md).[interfaces](../namespaces/typechain.factories.contracts.interfaces.md).IVerifier__factory

## Constructors

### constructor

• **new IVerifier__factory**()

## Properties

### abi

▪ `Static` `Readonly` **abi**: readonly [{ `inputs`: readonly [{ `internalType`: ``"uint256[]"`` = "uint256[]"; `name`: ``"publicSignals"`` = "publicSignals"; `type`: ``"uint256[]"`` = "uint256[]" }, { `internalType`: ``"uint256[8]"`` = "uint256[8]"; `name`: ``"proof"`` = "proof"; `type`: ``"uint256[8]"`` = "uint256[8]" }] ; `name`: ``"verifyProof"`` = "verifyProof"; `outputs`: readonly [{ `internalType`: ``"bool"`` = "bool"; `name`: ``""`` = ""; `type`: ``"bool"`` = "bool" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }] = `_abi`

#### Defined in

packages/contracts/typechain/factories/contracts/interfaces/IVerifier__factory.ts:40

## Methods

### connect

▸ `Static` **connect**(`address`, `signerOrProvider`): [`IVerifier`](../interfaces/typechain.contracts.interfaces.IVerifier.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |
| `signerOrProvider` | `Provider` \| `Signer` |

#### Returns

[`IVerifier`](../interfaces/typechain.contracts.interfaces.IVerifier.md)

#### Defined in

packages/contracts/typechain/factories/contracts/interfaces/IVerifier__factory.ts:44

___

### createInterface

▸ `Static` **createInterface**(): `IVerifierInterface`

#### Returns

`IVerifierInterface`

#### Defined in

packages/contracts/typechain/factories/contracts/interfaces/IVerifier__factory.ts:41
