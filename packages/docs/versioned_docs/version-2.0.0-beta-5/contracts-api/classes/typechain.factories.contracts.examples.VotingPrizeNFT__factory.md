---
id: "typechain.factories.contracts.examples.VotingPrizeNFT__factory"
title: "Class: VotingPrizeNFT__factory"
sidebar_label: "VotingPrizeNFT__factory"
custom_edit_url: null
---

[contracts](../namespaces/typechain.factories.contracts.md).[examples](../namespaces/typechain.factories.contracts.examples.md).VotingPrizeNFT__factory

## Hierarchy

- `ContractFactory`

  ↳ **`VotingPrizeNFT__factory`**

## Constructors

### constructor

• **new VotingPrizeNFT__factory**(`...args`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `VotingPrizeNFTConstructorParams` |

#### Overrides

ContractFactory.constructor

#### Defined in

packages/contracts/typechain/factories/contracts/examples/VotingPrizeNFT__factory.ts:470

## Properties

### bytecode

• `Readonly` **bytecode**: `string`

#### Inherited from

ContractFactory.bytecode

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:139

___

### interface

• `Readonly` **interface**: `Interface`

#### Inherited from

ContractFactory.interface

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:138

___

### signer

• `Readonly` **signer**: `Signer`

#### Inherited from

ContractFactory.signer

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:140

___

### abi

▪ `Static` `Readonly` **abi**: readonly [{ `inputs`: readonly [{ `internalType`: ``"string"`` = "string"; `name`: ``"_metadataURI"`` = "\_metadataURI"; `type`: ``"string"`` = "string" }] ; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"constructor"`` = "constructor" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"address"`` = "address"; `name`: ``"owner"`` = "owner"; `type`: ``"address"`` = "address" }, { `indexed`: ``true`` = true; `internalType`: ``"address"`` = "address"; `name`: ``"approved"`` = "approved"; `type`: ``"address"`` = "address" }, { `indexed`: ``true`` = true; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"Approval"`` = "Approval"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"address"`` = "address"; `name`: ``"owner"`` = "owner"; `type`: ``"address"`` = "address" }, { `indexed`: ``true`` = true; `internalType`: ``"address"`` = "address"; `name`: ``"operator"`` = "operator"; `type`: ``"address"`` = "address" }, { `indexed`: ``false`` = false; `internalType`: ``"bool"`` = "bool"; `name`: ``"approved"`` = "approved"; `type`: ``"bool"`` = "bool" }] ; `name`: ``"ApprovalForAll"`` = "ApprovalForAll"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``false`` = false; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"_fromTokenId"`` = "\_fromTokenId"; `type`: ``"uint256"`` = "uint256" }, { `indexed`: ``false`` = false; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"_toTokenId"`` = "\_toTokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"BatchMetadataUpdate"`` = "BatchMetadataUpdate"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``false`` = false; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"_tokenId"`` = "\_tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"MetadataUpdate"`` = "MetadataUpdate"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"address"`` = "address"; `name`: ``"from"`` = "from"; `type`: ``"address"`` = "address" }, { `indexed`: ``true`` = true; `internalType`: ``"address"`` = "address"; `name`: ``"to"`` = "to"; `type`: ``"address"`` = "address" }, { `indexed`: ``true`` = true; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"Transfer"`` = "Transfer"; `type`: ``"event"`` = "event" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"to"`` = "to"; `type`: ``"address"`` = "address" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"approve"`` = "approve"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"winner"`` = "winner"; `type`: ``"address"`` = "address" }] ; `name`: ``"awardItem"`` = "awardItem"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"owner"`` = "owner"; `type`: ``"address"`` = "address" }] ; `name`: ``"balanceOf"`` = "balanceOf"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"getApproved"`` = "getApproved"; `outputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``""`` = ""; `type`: ``"address"`` = "address" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"owner"`` = "owner"; `type`: ``"address"`` = "address" }, { `internalType`: ``"address"`` = "address"; `name`: ``"operator"`` = "operator"; `type`: ``"address"`` = "address" }] ; `name`: ``"isApprovedForAll"`` = "isApprovedForAll"; `outputs`: readonly [{ `internalType`: ``"bool"`` = "bool"; `name`: ``""`` = ""; `type`: ``"bool"`` = "bool" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"metadataURI"`` = "metadataURI"; `outputs`: readonly [{ `internalType`: ``"string"`` = "string"; `name`: ``""`` = ""; `type`: ``"string"`` = "string" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"name"`` = "name"; `outputs`: readonly [{ `internalType`: ``"string"`` = "string"; `name`: ``""`` = ""; `type`: ``"string"`` = "string" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"owner"`` = "owner"; `outputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``""`` = ""; `type`: ``"address"`` = "address" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"ownerOf"`` = "ownerOf"; `outputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``""`` = ""; `type`: ``"address"`` = "address" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"from"`` = "from"; `type`: ``"address"`` = "address" }, { `internalType`: ``"address"`` = "address"; `name`: ``"to"`` = "to"; `type`: ``"address"`` = "address" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"safeTransferFrom"`` = "safeTransferFrom"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"from"`` = "from"; `type`: ``"address"`` = "address" }, { `internalType`: ``"address"`` = "address"; `name`: ``"to"`` = "to"; `type`: ``"address"`` = "address" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"bytes"`` = "bytes"; `name`: ``"data"`` = "data"; `type`: ``"bytes"`` = "bytes" }] ; `name`: ``"safeTransferFrom"`` = "safeTransferFrom"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"operator"`` = "operator"; `type`: ``"address"`` = "address" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"approved"`` = "approved"; `type`: ``"bool"`` = "bool" }] ; `name`: ``"setApprovalForAll"`` = "setApprovalForAll"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"_voting"`` = "\_voting"; `type`: ``"address"`` = "address" }] ; `name`: ``"setVotingAddress"`` = "setVotingAddress"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"bytes4"`` = "bytes4"; `name`: ``"interfaceId"`` = "interfaceId"; `type`: ``"bytes4"`` = "bytes4" }] ; `name`: ``"supportsInterface"`` = "supportsInterface"; `outputs`: readonly [{ `internalType`: ``"bool"`` = "bool"; `name`: ``""`` = ""; `type`: ``"bool"`` = "bool" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"symbol"`` = "symbol"; `outputs`: readonly [{ `internalType`: ``"string"`` = "string"; `name`: ``""`` = ""; `type`: ``"string"`` = "string" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"tokenURI"`` = "tokenURI"; `outputs`: readonly [{ `internalType`: ``"string"`` = "string"; `name`: ``""`` = ""; `type`: ``"string"`` = "string" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"from"`` = "from"; `type`: ``"address"`` = "address" }, { `internalType`: ``"address"`` = "address"; `name`: ``"to"`` = "to"; `type`: ``"address"`` = "address" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"tokenId"`` = "tokenId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"transferFrom"`` = "transferFrom"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"voting"`` = "voting"; `outputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``""`` = ""; `type`: ``"address"`` = "address" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }] = `_abi`

#### Defined in

packages/contracts/typechain/factories/contracts/examples/VotingPrizeNFT__factory.ts:501

___

### bytecode

▪ `Static` `Readonly` **bytecode**: ``"0x60806040523480156200001157600080fd5b506040516200231e3803806200231e8339810160408190526200003491620000da565b6040518060400160405280600e81526020016d159bdd1a5b99d41c9a5e9953919560921b815250604051806040016040528060058152602001645072697a6560d81b81525081600090816200008a91906200023e565b5060016200009982826200023e565b5050600880546001600160a01b0319163317905550600a620000bc82826200023e565b50506200030a565b634e487b7160e01b600052604160045260246000fd5b60006020808385031215620000ee57600080fd5b82516001600160401b03808211156200010657600080fd5b818501915085601f8301126200011b57600080fd5b815181811115620001305762000130620000c4565b604051601f8201601f19908116603f011681019083821181831017156200015b576200015b620000c4565b8160405282815288868487010111156200017457600080fd5b600093505b8284101562000198578484018601518185018701529285019262000179565b600086848301015280965050505050505092915050565b600181811c90821680620001c457607f821691505b602082108103620001e557634e487b7160e01b600052602260045260246000fd5b50919050565b601f8211156200023957600081815260208120601f850160051c81016020861015620002145750805b601f850160051c820191505b81811015620002355782815560010162000220565b5050505b505050565b81516001600160401b038111156200025a576200025a620000c4565b62000272816200026b8454620001af565b84620001eb565b602080601f831160018114620002aa5760008415620002915750858301515b600019600386901b1c1916600185901b17855562000235565b600085815260208120601f198616915b82811015620002db57888601518255948401946001909101908401620002ba565b5085821015620002fa5787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b612004806200031a6000396000f3fe608060405234801561001057600080fd5b50600436106101365760003560e01c80637a6cfcab116100b2578063b88d4fde11610081578063e985e9c511610066578063e985e9c51461029b578063f2fb2120146102e4578063fce1ccca146102f757600080fd5b8063b88d4fde14610275578063c87b56dd1461028857600080fd5b80637a6cfcab146102275780638da5cb5b1461023a57806395d89b411461025a578063a22cb4651461026257600080fd5b8063095ea7b31161010957806342842e0e116100ee57806342842e0e146101e05780636352211e146101f357806370a082311461020657600080fd5b8063095ea7b3146101b857806323b872dd146101cd57600080fd5b806301ffc9a71461013b57806303ee438c1461016357806306fdde0314610178578063081812fc14610180575b600080fd5b61014e610149366004611a85565b610317565b60405190151581526020015b60405180910390f35b61016b610373565b60405161015a9190611b10565b61016b610401565b61019361018e366004611b23565b610493565b60405173ffffffffffffffffffffffffffffffffffffffff909116815260200161015a565b6101cb6101c6366004611b65565b6104c7565b005b6101cb6101db366004611b8f565b610658565b6101cb6101ee366004611b8f565b6106f9565b610193610201366004611b23565b610714565b610219610214366004611bcb565b6107a0565b60405190815260200161015a565b6101cb610235366004611bcb565b61086e565b6008546101939073ffffffffffffffffffffffffffffffffffffffff1681565b61016b6108d9565b6101cb610270366004611be6565b6108e8565b6101cb610283366004611c51565b6108f7565b61016b610296366004611b23565b61099f565b61014e6102a9366004611d4b565b73ffffffffffffffffffffffffffffffffffffffff918216600090815260056020908152604080832093909416825291909152205460ff1690565b6102196102f2366004611bcb565b610aaf565b6009546101939073ffffffffffffffffffffffffffffffffffffffff1681565b60007fffffffff0000000000000000000000000000000000000000000000000000000082167f4906490600000000000000000000000000000000000000000000000000000000148061036d575061036d82610b8f565b92915050565b600a805461038090611d7e565b80601f01602080910402602001604051908101604052809291908181526020018280546103ac90611d7e565b80156103f95780601f106103ce576101008083540402835291602001916103f9565b820191906000526020600020905b8154815290600101906020018083116103dc57829003601f168201915b505050505081565b60606000805461041090611d7e565b80601f016020809104026020016040519081016040528092919081815260200182805461043c90611d7e565b80156104895780601f1061045e57610100808354040283529160200191610489565b820191906000526020600020905b81548152906001019060200180831161046c57829003601f168201915b5050505050905090565b600061049e82610c72565b5060009081526004602052604090205473ffffffffffffffffffffffffffffffffffffffff1690565b60006104d282610714565b90508073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603610594576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602160248201527f4552433732313a20617070726f76616c20746f2063757272656e74206f776e6560448201527f720000000000000000000000000000000000000000000000000000000000000060648201526084015b60405180910390fd5b3373ffffffffffffffffffffffffffffffffffffffff821614806105bd57506105bd81336102a9565b610649576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152603d60248201527f4552433732313a20617070726f76652063616c6c6572206973206e6f7420746f60448201527f6b656e206f776e6572206f7220617070726f76656420666f7220616c6c000000606482015260840161058b565b6106538383610d00565b505050565b6106623382610da0565b6106ee576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602d60248201527f4552433732313a2063616c6c6572206973206e6f7420746f6b656e206f776e6560448201527f72206f7220617070726f76656400000000000000000000000000000000000000606482015260840161058b565b610653838383610e5f565b610653838383604051806020016040528060008152506108f7565b60008181526002602052604081205473ffffffffffffffffffffffffffffffffffffffff168061036d576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601860248201527f4552433732313a20696e76616c696420746f6b656e2049440000000000000000604482015260640161058b565b600073ffffffffffffffffffffffffffffffffffffffff8216610845576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602960248201527f4552433732313a2061646472657373207a65726f206973206e6f74206120766160448201527f6c6964206f776e65720000000000000000000000000000000000000000000000606482015260840161058b565b5073ffffffffffffffffffffffffffffffffffffffff1660009081526003602052604090205490565b60085473ffffffffffffffffffffffffffffffffffffffff16331461089257600080fd5b600980547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff92909216919091179055565b60606001805461041090611d7e565b6108f333838361115a565b5050565b6109013383610da0565b61098d576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602d60248201527f4552433732313a2063616c6c6572206973206e6f7420746f6b656e206f776e6560448201527f72206f7220617070726f76656400000000000000000000000000000000000000606482015260840161058b565b61099984848484611287565b50505050565b60606109aa82610c72565b600082815260066020526040812080546109c390611d7e565b80601f01602080910402602001604051908101604052809291908181526020018280546109ef90611d7e565b8015610a3c5780601f10610a1157610100808354040283529160200191610a3c565b820191906000526020600020905b815481529060010190602001808311610a1f57829003601f168201915b505050505090506000610a5a60408051602081019091526000815290565b90508051600003610a6c575092915050565b815115610a9e578082604051602001610a86929190611dd1565b60405160208183030381529060405292505050919050565b610aa78461132a565b949350505050565b60095460009073ffffffffffffffffffffffffffffffffffffffff163314610ad657600080fd5b6000610ae160075490565b9050610aed838261139e565b610b8181600a8054610afe90611d7e565b80601f0160208091040260200160405190810160405280929190818152602001828054610b2a90611d7e565b8015610b775780601f10610b4c57610100808354040283529160200191610b77565b820191906000526020600020905b815481529060010190602001808311610b5a57829003601f168201915b50505050506115c3565b61036d600780546001019055565b60007fffffffff0000000000000000000000000000000000000000000000000000000082167f80ac58cd000000000000000000000000000000000000000000000000000000001480610c2257507fffffffff0000000000000000000000000000000000000000000000000000000082167f5b5e139f00000000000000000000000000000000000000000000000000000000145b8061036d57507f01ffc9a7000000000000000000000000000000000000000000000000000000007fffffffff0000000000000000000000000000000000000000000000000000000083161461036d565b60008181526002602052604090205473ffffffffffffffffffffffffffffffffffffffff16610cfd576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601860248201527f4552433732313a20696e76616c696420746f6b656e2049440000000000000000604482015260640161058b565b50565b600081815260046020526040902080547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff84169081179091558190610d5a82610714565b73ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92560405160405180910390a45050565b600080610dac83610714565b90508073ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff161480610e1a575073ffffffffffffffffffffffffffffffffffffffff80821660009081526005602090815260408083209388168352929052205460ff165b80610aa757508373ffffffffffffffffffffffffffffffffffffffff16610e4084610493565b73ffffffffffffffffffffffffffffffffffffffff1614949350505050565b8273ffffffffffffffffffffffffffffffffffffffff16610e7f82610714565b73ffffffffffffffffffffffffffffffffffffffff1614610f22576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602560248201527f4552433732313a207472616e736665722066726f6d20696e636f72726563742060448201527f6f776e6572000000000000000000000000000000000000000000000000000000606482015260840161058b565b73ffffffffffffffffffffffffffffffffffffffff8216610fc4576040517f08c379a0000000000000000000000000000000000000000000000000000000008152602060048201526024808201527f4552433732313a207472616e7366657220746f20746865207a65726f2061646460448201527f7265737300000000000000000000000000000000000000000000000000000000606482015260840161058b565b8273ffffffffffffffffffffffffffffffffffffffff16610fe482610714565b73ffffffffffffffffffffffffffffffffffffffff1614611087576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602560248201527f4552433732313a207472616e736665722066726f6d20696e636f72726563742060448201527f6f776e6572000000000000000000000000000000000000000000000000000000606482015260840161058b565b600081815260046020908152604080832080547fffffffffffffffffffffffff000000000000000000000000000000000000000090811690915573ffffffffffffffffffffffffffffffffffffffff8781168086526003855283862080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01905590871680865283862080546001019055868652600290945282852080549092168417909155905184937fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef91a4505050565b8173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16036111ef576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601960248201527f4552433732313a20617070726f766520746f2063616c6c657200000000000000604482015260640161058b565b73ffffffffffffffffffffffffffffffffffffffff83811660008181526005602090815260408083209487168084529482529182902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff001686151590811790915591519182527f17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31910160405180910390a3505050565b611292848484610e5f565b61129e848484846116c4565b610999576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152603260248201527f4552433732313a207472616e7366657220746f206e6f6e20455243373231526560448201527f63656976657220696d706c656d656e7465720000000000000000000000000000606482015260840161058b565b606061133582610c72565b600061134c60408051602081019091526000815290565b9050600081511161136c5760405180602001604052806000815250611397565b80611376846118b7565b604051602001611387929190611dd1565b6040516020818303038152906040525b9392505050565b73ffffffffffffffffffffffffffffffffffffffff821661141b576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820181905260248201527f4552433732313a206d696e7420746f20746865207a65726f2061646472657373604482015260640161058b565b60008181526002602052604090205473ffffffffffffffffffffffffffffffffffffffff16156114a7576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601c60248201527f4552433732313a20746f6b656e20616c7265616479206d696e74656400000000604482015260640161058b565b60008181526002602052604090205473ffffffffffffffffffffffffffffffffffffffff1615611533576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601c60248201527f4552433732313a20746f6b656e20616c7265616479206d696e74656400000000604482015260640161058b565b73ffffffffffffffffffffffffffffffffffffffff8216600081815260036020908152604080832080546001019055848352600290915280822080547fffffffffffffffffffffffff0000000000000000000000000000000000000000168417905551839291907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef908290a45050565b60008281526002602052604090205473ffffffffffffffffffffffffffffffffffffffff16611674576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602e60248201527f45524337323155524953746f726167653a2055524920736574206f66206e6f6e60448201527f6578697374656e7420746f6b656e000000000000000000000000000000000000606482015260840161058b565b600082815260066020526040902061168c8282611e4e565b506040518281527ff8e1a15aba9398e019f0b49df1a4fde98ee17ae345cb5f6b5e2c27f5033e8ce79060200160405180910390a15050565b600073ffffffffffffffffffffffffffffffffffffffff84163b156118ac576040517f150b7a0200000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff85169063150b7a029061173b903390899088908890600401611f68565b6020604051808303816000875af1925050508015611794575060408051601f3d9081017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe016820190925261179191810190611fb1565b60015b611861573d8080156117c2576040519150601f19603f3d011682016040523d82523d6000602084013e6117c7565b606091505b508051600003611859576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152603260248201527f4552433732313a207472616e7366657220746f206e6f6e20455243373231526560448201527f63656976657220696d706c656d656e7465720000000000000000000000000000606482015260840161058b565b805181602001fd5b7fffffffff00000000000000000000000000000000000000000000000000000000167f150b7a0200000000000000000000000000000000000000000000000000000000149050610aa7565b506001949350505050565b606060006118c483611975565b600101905060008167ffffffffffffffff8111156118e4576118e4611c22565b6040519080825280601f01601f19166020018201604052801561190e576020820181803683370190505b5090508181016020015b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff017f3031323334353637383961626364656600000000000000000000000000000000600a86061a8153600a850494508461191857509392505050565b6000807a184f03e93ff9f4daa797ed6e38ed64bf6a1f01000000000000000083106119be577a184f03e93ff9f4daa797ed6e38ed64bf6a1f010000000000000000830492506040015b6d04ee2d6d415b85acef810000000083106119ea576d04ee2d6d415b85acef8100000000830492506020015b662386f26fc100008310611a0857662386f26fc10000830492506010015b6305f5e1008310611a20576305f5e100830492506008015b6127108310611a3457612710830492506004015b60648310611a46576064830492506002015b600a831061036d5760010192915050565b7fffffffff0000000000000000000000000000000000000000000000000000000081168114610cfd57600080fd5b600060208284031215611a9757600080fd5b813561139781611a57565b60005b83811015611abd578181015183820152602001611aa5565b50506000910152565b60008151808452611ade816020860160208601611aa2565b601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0169290920160200192915050565b6020815260006113976020830184611ac6565b600060208284031215611b3557600080fd5b5035919050565b803573ffffffffffffffffffffffffffffffffffffffff81168114611b6057600080fd5b919050565b60008060408385031215611b7857600080fd5b611b8183611b3c565b946020939093013593505050565b600080600060608486031215611ba457600080fd5b611bad84611b3c565b9250611bbb60208501611b3c565b9150604084013590509250925092565b600060208284031215611bdd57600080fd5b61139782611b3c565b60008060408385031215611bf957600080fd5b611c0283611b3c565b915060208301358015158114611c1757600080fd5b809150509250929050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b60008060008060808587031215611c6757600080fd5b611c7085611b3c565b9350611c7e60208601611b3c565b925060408501359150606085013567ffffffffffffffff80821115611ca257600080fd5b818701915087601f830112611cb657600080fd5b813581811115611cc857611cc8611c22565b604051601f82017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0908116603f01168101908382118183101715611d0e57611d0e611c22565b816040528281528a6020848701011115611d2757600080fd5b82602086016020830137600060208483010152809550505050505092959194509250565b60008060408385031215611d5e57600080fd5b611d6783611b3c565b9150611d7560208401611b3c565b90509250929050565b600181811c90821680611d9257607f821691505b602082108103611dcb577f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b50919050565b60008351611de3818460208801611aa2565b835190830190611df7818360208801611aa2565b01949350505050565b601f82111561065357600081815260208120601f850160051c81016020861015611e275750805b601f850160051c820191505b81811015611e4657828155600101611e33565b505050505050565b815167ffffffffffffffff811115611e6857611e68611c22565b611e7c81611e768454611d7e565b84611e00565b602080601f831160018114611ecf5760008415611e995750858301515b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600386901b1c1916600185901b178555611e46565b6000858152602081207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08616915b82811015611f1c57888601518255948401946001909101908401611efd565b5085821015611f5857878501517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600388901b60f8161c191681555b5050505050600190811b01905550565b600073ffffffffffffffffffffffffffffffffffffffff808716835280861660208401525083604083015260806060830152611fa76080830184611ac6565b9695505050505050565b600060208284031215611fc357600080fd5b815161139781611a5756fea2646970667358221220b97c0b4e75af96be821842a32c4d51c2b01c39915457b17e2a1585c9da9e285664736f6c63430008130033"``

#### Defined in

packages/contracts/typechain/factories/contracts/examples/VotingPrizeNFT__factory.ts:500

## Methods

### attach

▸ **attach**(`address`): [`VotingPrizeNFT`](../interfaces/typechain.contracts.examples.VotingPrizeNFT.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |

#### Returns

[`VotingPrizeNFT`](../interfaces/typechain.contracts.examples.VotingPrizeNFT.md)

#### Overrides

ContractFactory.attach

#### Defined in

packages/contracts/typechain/factories/contracts/examples/VotingPrizeNFT__factory.ts:493

___

### connect

▸ **connect**(`signer`): [`VotingPrizeNFT__factory`](typechain.factories.contracts.examples.VotingPrizeNFT__factory.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `signer` | `Signer` |

#### Returns

[`VotingPrizeNFT__factory`](typechain.factories.contracts.examples.VotingPrizeNFT__factory.md)

#### Overrides

ContractFactory.connect

#### Defined in

packages/contracts/typechain/factories/contracts/examples/VotingPrizeNFT__factory.ts:496

___

### deploy

▸ **deploy**(`_metadataURI`, `overrides?`): `Promise`<[`VotingPrizeNFT`](../interfaces/typechain.contracts.examples.VotingPrizeNFT.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `_metadataURI` | `string` |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<[`VotingPrizeNFT`](../interfaces/typechain.contracts.examples.VotingPrizeNFT.md)\>

#### Overrides

ContractFactory.deploy

#### Defined in

packages/contracts/typechain/factories/contracts/examples/VotingPrizeNFT__factory.ts:478

___

### getDeployTransaction

▸ **getDeployTransaction**(`_metadataURI`, `overrides?`): `TransactionRequest`

#### Parameters

| Name | Type |
| :------ | :------ |
| `_metadataURI` | `string` |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`TransactionRequest`

#### Overrides

ContractFactory.getDeployTransaction

#### Defined in

packages/contracts/typechain/factories/contracts/examples/VotingPrizeNFT__factory.ts:487

___

### connect

▸ `Static` **connect**(`address`, `signerOrProvider`): [`VotingPrizeNFT`](../interfaces/typechain.contracts.examples.VotingPrizeNFT.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |
| `signerOrProvider` | `Provider` \| `Signer` |

#### Returns

[`VotingPrizeNFT`](../interfaces/typechain.contracts.examples.VotingPrizeNFT.md)

#### Defined in

packages/contracts/typechain/factories/contracts/examples/VotingPrizeNFT__factory.ts:505

___

### createInterface

▸ `Static` **createInterface**(): `VotingPrizeNFTInterface`

#### Returns

`VotingPrizeNFTInterface`

#### Defined in

packages/contracts/typechain/factories/contracts/examples/VotingPrizeNFT__factory.ts:502

___

### fromSolidity

▸ `Static` **fromSolidity**(`compilerOutput`, `signer?`): `ContractFactory`

#### Parameters

| Name | Type |
| :------ | :------ |
| `compilerOutput` | `any` |
| `signer?` | `Signer` |

#### Returns

`ContractFactory`

#### Inherited from

ContractFactory.fromSolidity

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:148

___

### getContract

▸ `Static` **getContract**(`address`, `contractInterface`, `signer?`): `Contract`

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |
| `contractInterface` | `ContractInterface` |
| `signer?` | `Signer` |

#### Returns

`Contract`

#### Inherited from

ContractFactory.getContract

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:154

___

### getContractAddress

▸ `Static` **getContractAddress**(`tx`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `tx` | `Object` |
| `tx.from` | `string` |
| `tx.nonce` | `number` \| `BytesLike` \| `BigNumber` |

#### Returns

`string`

#### Inherited from

ContractFactory.getContractAddress

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:150

___

### getInterface

▸ `Static` **getInterface**(`contractInterface`): `Interface`

#### Parameters

| Name | Type |
| :------ | :------ |
| `contractInterface` | `ContractInterface` |

#### Returns

`Interface`

#### Inherited from

ContractFactory.getInterface

#### Defined in

node_modules/@ethersproject/contracts/lib/index.d.ts:149
