---
id: "src"
title: "Module: src"
sidebar_label: "src"
sidebar_position: 0
custom_edit_url: null
---

## Classes

- [UnirepFactory](../classes/src.UnirepFactory.md)

## Interfaces

- [Unirep](../interfaces/src.Unirep.md)

## Functions

### genSignature

▸ **genSignature**(`unirepAddress`, `attester`, `epochLength`, `chainId`): `Promise`<`string`\>

Generate attester sign up signature

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `unirepAddress` | `string` | The address of UniRep smart contract |
| `attester` | `Signer` \| `Wallet` | The address of the attester |
| `epochLength` | `number` | Epoch length specified by the attester |
| `chainId` | `number` \| `bigint` | The current chain id of the UniRep smart contract |

#### Returns

`Promise`<`string`\>

An sign up signature for the attester

#### Defined in

[packages/contracts/src/index.ts:26](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/contracts/src/index.ts#L26)

___

### getUnirepContract

▸ **getUnirepContract**(`address`, `signerOrProvider`): [`Unirep`](../interfaces/src.Unirep.md)

Get Unirep smart contract from a given address

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `address` | `string` | The address if the Unirep contract |
| `signerOrProvider` | `Provider` \| `Signer` | The signer or provider that will connect to the Unirep smart contract |

#### Returns

[`Unirep`](../interfaces/src.Unirep.md)

The Unirep smart contract

#### Defined in

[packages/contracts/src/index.ts:10](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/contracts/src/index.ts#L10)
