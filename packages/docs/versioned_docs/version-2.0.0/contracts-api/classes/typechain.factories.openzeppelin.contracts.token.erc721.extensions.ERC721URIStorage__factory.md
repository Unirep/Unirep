---
id: "typechain.factories.openzeppelin.contracts.token.erc721.extensions.ERC721URIStorage__factory"
title: "Class: ERC721URIStorage__factory"
sidebar_label: "ERC721URIStorage__factory"
custom_edit_url: null
---

[erc721](../namespaces/typechain.factories.openzeppelin.contracts.token.erc721.md).[extensions](../namespaces/typechain.factories.openzeppelin.contracts.token.erc721.extensions.md).ERC721URIStorage__factory

## Constructors

### constructor

• **new ERC721URIStorage__factory**()

## Properties

### abi

▪ `Static` `Readonly` **abi**: readonly [{ `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"address"`` = "address"; `name`: ``"owner"`` = "owner"; `type`: ``"address"`` = "address" }, { `indexed`: ``true`` = true; `internalType`: ``"address"`` = "address"; `name`: ``"approved"`` = "approved"; `type`: ``"address"`` = "address" }, { `indexed`: ``true`` = true; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"Approval"`` = "Approval"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"address"`` = "address"; `name`: ``"owner"`` = "owner"; `type`: ``"address"`` = "address" }, { `indexed`: ``true`` = true; `internalType`: ``"address"`` = "address"; `name`: ``"operator"`` = "operator"; `type`: ``"address"`` = "address" }, { `indexed`: ``false`` = false; `internalType`: ``"bool"`` = "bool"; `name`: ``"approved"`` = "approved"; `type`: ``"bool"`` = "bool" }] ; `name`: ``"ApprovalForAll"`` = "ApprovalForAll"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``false`` = false; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"_fromTokenId"`` = "\_fromTokenId"; `type`: ``"uint256"`` = "uint256" }, { `indexed`: ``false`` = false; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"_toTokenId"`` = "\_toTokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"BatchMetadataUpdate"`` = "BatchMetadataUpdate"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``false`` = false; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"_tokenId"`` = "\_tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"MetadataUpdate"`` = "MetadataUpdate"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"address"`` = "address"; `name`: ``"from"`` = "from"; `type`: ``"address"`` = "address" }, { `indexed`: ``true`` = true; `internalType`: ``"address"`` = "address"; `name`: ``"to"`` = "to"; `type`: ``"address"`` = "address" }, { `indexed`: ``true`` = true; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"Transfer"`` = "Transfer"; `type`: ``"event"`` = "event" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"to"`` = "to"; `type`: ``"address"`` = "address" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"approve"`` = "approve"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"owner"`` = "owner"; `type`: ``"address"`` = "address" }] ; `name`: ``"balanceOf"`` = "balanceOf"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"getApproved"`` = "getApproved"; `outputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``""`` = ""; `type`: ``"address"`` = "address" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"owner"`` = "owner"; `type`: ``"address"`` = "address" }, { `internalType`: ``"address"`` = "address"; `name`: ``"operator"`` = "operator"; `type`: ``"address"`` = "address" }] ; `name`: ``"isApprovedForAll"`` = "isApprovedForAll"; `outputs`: readonly [{ `internalType`: ``"bool"`` = "bool"; `name`: ``""`` = ""; `type`: ``"bool"`` = "bool" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"name"`` = "name"; `outputs`: readonly [{ `internalType`: ``"string"`` = "string"; `name`: ``""`` = ""; `type`: ``"string"`` = "string" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"ownerOf"`` = "ownerOf"; `outputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``""`` = ""; `type`: ``"address"`` = "address" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"from"`` = "from"; `type`: ``"address"`` = "address" }, { `internalType`: ``"address"`` = "address"; `name`: ``"to"`` = "to"; `type`: ``"address"`` = "address" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"safeTransferFrom"`` = "safeTransferFrom"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"from"`` = "from"; `type`: ``"address"`` = "address" }, { `internalType`: ``"address"`` = "address"; `name`: ``"to"`` = "to"; `type`: ``"address"`` = "address" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"bytes"`` = "bytes"; `name`: ``"data"`` = "data"; `type`: ``"bytes"`` = "bytes" }] ; `name`: ``"safeTransferFrom"`` = "safeTransferFrom"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"operator"`` = "operator"; `type`: ``"address"`` = "address" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"approved"`` = "approved"; `type`: ``"bool"`` = "bool" }] ; `name`: ``"setApprovalForAll"`` = "setApprovalForAll"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"bytes4"`` = "bytes4"; `name`: ``"interfaceId"`` = "interfaceId"; `type`: ``"bytes4"`` = "bytes4" }] ; `name`: ``"supportsInterface"`` = "supportsInterface"; `outputs`: readonly [{ `internalType`: ``"bool"`` = "bool"; `name`: ``""`` = ""; `type`: ``"bool"`` = "bool" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"symbol"`` = "symbol"; `outputs`: readonly [{ `internalType`: ``"string"`` = "string"; `name`: ``""`` = ""; `type`: ``"string"`` = "string" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"tokenURI"`` = "tokenURI"; `outputs`: readonly [{ `internalType`: ``"string"`` = "string"; `name`: ``""`` = ""; `type`: ``"string"`` = "string" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"from"`` = "from"; `type`: ``"address"`` = "address" }, { `internalType`: ``"address"`` = "address"; `name`: ``"to"`` = "to"; `type`: ``"address"`` = "address" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"transferFrom"`` = "transferFrom"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }] = `_abi`

#### Defined in

packages/contracts/typechain/factories/@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage__factory.ts:378

## Methods

### connect

▸ `Static` **connect**(`address`, `signerOrProvider`): [`ERC721URIStorage`](../interfaces/typechain.openzeppelin.contracts.token.erc721.extensions.ERC721URIStorage.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |
| `signerOrProvider` | `Provider` \| `Signer` |

#### Returns

[`ERC721URIStorage`](../interfaces/typechain.openzeppelin.contracts.token.erc721.extensions.ERC721URIStorage.md)

#### Defined in

packages/contracts/typechain/factories/@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage__factory.ts:382

___

### createInterface

▸ `Static` **createInterface**(): `ERC721URIStorageInterface`

#### Returns

`ERC721URIStorageInterface`

#### Defined in

packages/contracts/typechain/factories/@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage__factory.ts:379
