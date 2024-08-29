---
id: "typechain.factories.contracts.test.MerkleTreeTest__factory"
title: "Class: MerkleTreeTest__factory"
sidebar_label: "MerkleTreeTest__factory"
custom_edit_url: null
---

[contracts](../namespaces/typechain.factories.contracts.md).[test](../namespaces/typechain.factories.contracts.test.md).MerkleTreeTest__factory

## Hierarchy

- `ContractFactory`

  ↳ **`MerkleTreeTest__factory`**

## Constructors

### constructor

• **new MerkleTreeTest__factory**(`...args`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `MerkleTreeTestConstructorParams` |

#### Overrides

ContractFactory.constructor

#### Defined in

packages/contracts/typechain/factories/contracts/test/MerkleTreeTest__factory.ts:138

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

▪ `Static` `Readonly` **abi**: readonly [{ `inputs`: readonly [{ `internalType`: ``"uint8"`` = "uint8"; `name`: ``"_depth"`` = "\_depth"; `type`: ``"uint8"`` = "uint8" }] ; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"constructor"`` = "constructor" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"leaf"`` = "leaf"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"insertLazy"`` = "insertLazy"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"leaf"`` = "leaf"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"insertReusable"`` = "insertReusable"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"rootLazy"`` = "rootLazy"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"rootReusable"`` = "rootReusable"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"leaf"`` = "leaf"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint40"`` = "uint40"; `name`: ``"index"`` = "index"; `type`: ``"uint40"`` = "uint40" }] ; `name`: ``"updateLazy"`` = "updateLazy"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"leaf"`` = "leaf"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"index"`` = "index"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"updateReusable"`` = "updateReusable"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }] = `_abi`

#### Defined in

packages/contracts/typechain/factories/contracts/test/MerkleTreeTest__factory.ts:197

___

### bytecode

▪ `Static` `Readonly` **bytecode**: ``"0x608060405234801561001057600080fd5b506040516105ef3803806105ef83398101604081905261002f9161011e565b6006805460ff191660ff831690811790915560405163510ff26560e01b815260006004820152602481019190915273__$1fb0d694a3c1e0496466c56a438cb5e7fb$__9063510ff2659060440160006040518083038186803b15801561009457600080fd5b505af41580156100a8573d6000803e3d6000fd5b5050604051632f4ba31b60e01b81526002600482015260ff8416602482015273__$7091785c4e08a29a969db2a728005f35a2$__9250632f4ba31b915060440160006040518083038186803b15801561010057600080fd5b505af4158015610114573d6000803e3d6000fd5b5050505050610148565b60006020828403121561013057600080fd5b815160ff8116811461014157600080fd5b9392505050565b610498806101576000396000f3fe608060405234801561001057600080fd5b50600436106100725760003560e01c80635517cab8116100505780635517cab8146100b55780637f4e4fbc146100c8578063a7cd46d5146100d057600080fd5b80630b16cbdf146100775780631d5e96011461008d578063471df55e146100a2575b600080fd5b6003545b60405190815260200160405180910390f35b6100a061009b3660046103d4565b6100e3565b005b6100a06100b03660046103ed565b610167565b6100a06100c33660046103d4565b610207565b61007b61029f565b6100a06100de36600461040f565b610340565b6040517e081944000000000000000000000000000000000000000000000000000000008152600060048201526024810182905273__$1fb0d694a3c1e0496466c56a438cb5e7fb$__90620819449060440160006040518083038186803b15801561014c57600080fd5b505af4158015610160573d6000803e3d6000fd5b5050505050565b6040517ffb348dfd00000000000000000000000000000000000000000000000000000000815260026004820152602481018390526044810182905273__$7091785c4e08a29a969db2a728005f35a2$__9063fb348dfd90606401602060405180830381865af41580156101de573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906102029190610449565b505050565b6040517f226ab5d4000000000000000000000000000000000000000000000000000000008152600260048201526024810182905273__$7091785c4e08a29a969db2a728005f35a2$__9063226ab5d490604401602060405180830381865af4158015610277573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061029b9190610449565b5050565b6006546040517ff330445500000000000000000000000000000000000000000000000000000000815260006004820181905260ff909216602482015273__$1fb0d694a3c1e0496466c56a438cb5e7fb$__9063f330445590604401602060405180830381865af4158015610317573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061033b9190610449565b905090565b6040517f2cbda923000000000000000000000000000000000000000000000000000000008152600060048201526024810183905264ffffffffff8216604482015273__$1fb0d694a3c1e0496466c56a438cb5e7fb$__90632cbda9239060640160006040518083038186803b1580156103b857600080fd5b505af41580156103cc573d6000803e3d6000fd5b505050505050565b6000602082840312156103e657600080fd5b5035919050565b6000806040838503121561040057600080fd5b50508035926020909101359150565b6000806040838503121561042257600080fd5b82359150602083013564ffffffffff8116811461043e57600080fd5b809150509250929050565b60006020828403121561045b57600080fd5b505191905056fea26469706673582212204f71ba8f0156d8ae6c789b57041ee961fc0d90117740841adda2fb2b5f23dd6f64736f6c63430008130033"``

#### Defined in

packages/contracts/typechain/factories/contracts/test/MerkleTreeTest__factory.ts:196

## Methods

### attach

▸ **attach**(`address`): [`MerkleTreeTest`](../interfaces/typechain.contracts.test.MerkleTreeTest.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |

#### Returns

[`MerkleTreeTest`](../interfaces/typechain.contracts.test.MerkleTreeTest.md)

#### Overrides

ContractFactory.attach

#### Defined in

packages/contracts/typechain/factories/contracts/test/MerkleTreeTest__factory.ts:189

___

### connect

▸ **connect**(`signer`): [`MerkleTreeTest__factory`](typechain.factories.contracts.test.MerkleTreeTest__factory.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `signer` | `Signer` |

#### Returns

[`MerkleTreeTest__factory`](typechain.factories.contracts.test.MerkleTreeTest__factory.md)

#### Overrides

ContractFactory.connect

#### Defined in

packages/contracts/typechain/factories/contracts/test/MerkleTreeTest__factory.ts:192

___

### deploy

▸ **deploy**(`_depth`, `overrides?`): `Promise`<[`MerkleTreeTest`](../interfaces/typechain.contracts.test.MerkleTreeTest.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `_depth` | `BigNumberish` |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<[`MerkleTreeTest`](../interfaces/typechain.contracts.test.MerkleTreeTest.md)\>

#### Overrides

ContractFactory.deploy

#### Defined in

packages/contracts/typechain/factories/contracts/test/MerkleTreeTest__factory.ts:177

___

### getDeployTransaction

▸ **getDeployTransaction**(`_depth`, `overrides?`): `TransactionRequest`

#### Parameters

| Name | Type |
| :------ | :------ |
| `_depth` | `BigNumberish` |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`TransactionRequest`

#### Overrides

ContractFactory.getDeployTransaction

#### Defined in

packages/contracts/typechain/factories/contracts/test/MerkleTreeTest__factory.ts:183

___

### connect

▸ `Static` **connect**(`address`, `signerOrProvider`): [`MerkleTreeTest`](../interfaces/typechain.contracts.test.MerkleTreeTest.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |
| `signerOrProvider` | `Provider` \| `Signer` |

#### Returns

[`MerkleTreeTest`](../interfaces/typechain.contracts.test.MerkleTreeTest.md)

#### Defined in

packages/contracts/typechain/factories/contracts/test/MerkleTreeTest__factory.ts:201

___

### createInterface

▸ `Static` **createInterface**(): `MerkleTreeTestInterface`

#### Returns

`MerkleTreeTestInterface`

#### Defined in

packages/contracts/typechain/factories/contracts/test/MerkleTreeTest__factory.ts:198

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

___

### linkBytecode

▸ `Static` **linkBytecode**(`linkLibraryAddresses`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `linkLibraryAddresses` | `MerkleTreeTestLibraryAddresses` |

#### Returns

`string`

#### Defined in

packages/contracts/typechain/factories/contracts/test/MerkleTreeTest__factory.ts:151
