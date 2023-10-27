---
id: "typechain.factories.openzeppelin.contracts.token.erc721.IERC721__factory"
title: "Class: IERC721__factory"
sidebar_label: "IERC721__factory"
custom_edit_url: null
---

[token](../namespaces/typechain.factories.openzeppelin.contracts.token.md).[erc721](../namespaces/typechain.factories.openzeppelin.contracts.token.erc721.md).IERC721__factory

## Constructors

### constructor

• **new IERC721__factory**()

## Properties

### abi

▪ `Static` `Readonly` **abi**: readonly [{ `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"address"`` = "address"; `name`: ``"owner"`` = "owner"; `type`: ``"address"`` = "address" }, { `indexed`: ``true`` = true; `internalType`: ``"address"`` = "address"; `name`: ``"approved"`` = "approved"; `type`: ``"address"`` = "address" }, { `indexed`: ``true`` = true; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"Approval"`` = "Approval"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"address"`` = "address"; `name`: ``"owner"`` = "owner"; `type`: ``"address"`` = "address" }, { `indexed`: ``true`` = true; `internalType`: ``"address"`` = "address"; `name`: ``"operator"`` = "operator"; `type`: ``"address"`` = "address" }, { `indexed`: ``false`` = false; `internalType`: ``"bool"`` = "bool"; `name`: ``"approved"`` = "approved"; `type`: ``"bool"`` = "bool" }] ; `name`: ``"ApprovalForAll"`` = "ApprovalForAll"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"address"`` = "address"; `name`: ``"from"`` = "from"; `type`: ``"address"`` = "address" }, { `indexed`: ``true`` = true; `internalType`: ``"address"`` = "address"; `name`: ``"to"`` = "to"; `type`: ``"address"`` = "address" }, { `indexed`: ``true`` = true; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"Transfer"`` = "Transfer"; `type`: ``"event"`` = "event" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"to"`` = "to"; `type`: ``"address"`` = "address" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"approve"`` = "approve"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"owner"`` = "owner"; `type`: ``"address"`` = "address" }] ; `name`: ``"balanceOf"`` = "balanceOf"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"balance"`` = "balance"; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"getApproved"`` = "getApproved"; `outputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"operator"`` = "operator"; `type`: ``"address"`` = "address" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"owner"`` = "owner"; `type`: ``"address"`` = "address" }, { `internalType`: ``"address"`` = "address"; `name`: ``"operator"`` = "operator"; `type`: ``"address"`` = "address" }] ; `name`: ``"isApprovedForAll"`` = "isApprovedForAll"; `outputs`: readonly [{ `internalType`: ``"bool"`` = "bool"; `name`: ``""`` = ""; `type`: ``"bool"`` = "bool" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"ownerOf"`` = "ownerOf"; `outputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"owner"`` = "owner"; `type`: ``"address"`` = "address" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"from"`` = "from"; `type`: ``"address"`` = "address" }, { `internalType`: ``"address"`` = "address"; `name`: ``"to"`` = "to"; `type`: ``"address"`` = "address" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"safeTransferFrom"`` = "safeTransferFrom"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"from"`` = "from"; `type`: ``"address"`` = "address" }, { `internalType`: ``"address"`` = "address"; `name`: ``"to"`` = "to"; `type`: ``"address"`` = "address" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"bytes"`` = "bytes"; `name`: ``"data"`` = "data"; `type`: ``"bytes"`` = "bytes" }] ; `name`: ``"safeTransferFrom"`` = "safeTransferFrom"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"operator"`` = "operator"; `type`: ``"address"`` = "address" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"approved"`` = "approved"; `type`: ``"bool"`` = "bool" }] ; `name`: ``"setApprovalForAll"`` = "setApprovalForAll"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"bytes4"`` = "bytes4"; `name`: ``"interfaceId"`` = "interfaceId"; `type`: ``"bytes4"`` = "bytes4" }] ; `name`: ``"supportsInterface"`` = "supportsInterface"; `outputs`: readonly [{ `internalType`: ``"bool"`` = "bool"; `name`: ``""`` = ""; `type`: ``"bool"`` = "bool" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"from"`` = "from"; `type`: ``"address"`` = "address" }, { `internalType`: ``"address"`` = "address"; `name`: ``"to"`` = "to"; `type`: ``"address"`` = "address" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"transferFrom"`` = "transferFrom"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }] = `_abi`

#### Defined in

packages/contracts/typechain/factories/@openzeppelin/contracts/token/ERC721/IERC721__factory.ts:301

## Methods

### connect

▸ `Static` **connect**(`address`, `signerOrProvider`): [`IERC721`](../interfaces/typechain.openzeppelin.contracts.token.erc721.IERC721.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |
| `signerOrProvider` | `Provider` \| `Signer` |

#### Returns

[`IERC721`](../interfaces/typechain.openzeppelin.contracts.token.erc721.IERC721.md)

#### Defined in

packages/contracts/typechain/factories/@openzeppelin/contracts/token/ERC721/IERC721__factory.ts:305

___

### createInterface

▸ `Static` **createInterface**(): `IERC721Interface`

#### Returns

`IERC721Interface`

#### Defined in

packages/contracts/typechain/factories/@openzeppelin/contracts/token/ERC721/IERC721__factory.ts:302
