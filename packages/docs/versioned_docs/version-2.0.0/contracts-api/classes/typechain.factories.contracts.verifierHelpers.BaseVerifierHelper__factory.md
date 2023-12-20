---
id: "typechain.factories.contracts.verifierHelpers.BaseVerifierHelper__factory"
title: "Class: BaseVerifierHelper__factory"
sidebar_label: "BaseVerifierHelper__factory"
custom_edit_url: null
---

[contracts](../namespaces/typechain.factories.contracts.md).[verifierHelpers](../namespaces/typechain.factories.contracts.verifierHelpers.md).BaseVerifierHelper__factory

## Hierarchy

- `ContractFactory`

  ↳ **`BaseVerifierHelper__factory`**

## Constructors

### constructor

• **new BaseVerifierHelper__factory**(`...args`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `BaseVerifierHelperConstructorParams` |

#### Overrides

ContractFactory.constructor

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/BaseVerifierHelper__factory.ts:183

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

▪ `Static` `Readonly` **abi**: readonly [{ `inputs`: readonly [{ `internalType`: ``"contract Unirep"`` = "contract Unirep"; `name`: ``"_unirep"`` = "\_unirep"; `type`: ``"address"`` = "address" }, { `internalType`: ``"contract IVerifier"`` = "contract IVerifier"; `name`: ``"_verifier"`` = "\_verifier"; `type`: ``"address"`` = "address" }] ; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"constructor"`` = "constructor" }, { `inputs`: readonly [] = []; `name`: ``"AttesterInvalid"`` = "AttesterInvalid"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"CallerInvalid"`` = "CallerInvalid"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [{ `internalType`: ``"uint48"`` = "uint48"; `name`: ``"chainId"`` = "chainId"; `type`: ``"uint48"`` = "uint48" }] ; `name`: ``"ChainIdNotMatch"`` = "ChainIdNotMatch"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"InvalidEpoch"`` = "InvalidEpoch"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"InvalidEpochKey"`` = "InvalidEpochKey"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"InvalidProof"`` = "InvalidProof"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"stateTreeRoot"`` = "stateTreeRoot"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"InvalidStateTreeRoot"`` = "InvalidStateTreeRoot"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"SNARK_SCALAR_FIELD"`` = "SNARK\_SCALAR\_FIELD"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"chainid"`` = "chainid"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"control"`` = "control"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"decodeEpochKeyControl"`` = "decodeEpochKeyControl"; `outputs`: readonly [{ `internalType`: ``"uint8"`` = "uint8"; `name`: ``"nonce"`` = "nonce"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"revealNonce"`` = "revealNonce"; `type`: ``"bool"`` = "bool" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"chainId"`` = "chainId"; `type`: ``"uint48"`` = "uint48" }] ; `stateMutability`: ``"pure"`` = "pure"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"data"`` = "data"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"shiftBits"`` = "shiftBits"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"variableBits"`` = "variableBits"; `type`: ``"uint8"`` = "uint8" }] ; `name`: ``"shiftAndParse"`` = "shiftAndParse"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"pure"`` = "pure"; `type`: ``"function"`` = "function" }] = `_abi`

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/BaseVerifierHelper__factory.ts:217

___

### bytecode

▪ `Static` `Readonly` **bytecode**: ``"0x60a060405234801561001057600080fd5b506040516103b83803806103b883398101604081905261002f91610084565b600080546001600160a01b039384166001600160a01b0319918216179091556001805492909316911617905565ffffffffffff46166080526100be565b6001600160a01b038116811461008157600080fd5b50565b6000806040838503121561009757600080fd5b82516100a28161006c565b60208401519092506100b38161006c565b809150509250929050565b6080516102df6100d9600039600061010401526102df6000f3fe608060405234801561001057600080fd5b506004361061004c5760003560e01c806325c2cd121461005157806354af684e1461008b578063c60ee8a4146100ec578063cd84980e146100ff575b600080fd5b6100787f30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f000000181565b6040519081526020015b60405180910390f35b61009e6100993660046101dd565b610126565b6040805160ff909616865265ffffffffffff948516602087015273ffffffffffffffffffffffffffffffffffffffff909316928501929092521515606084015216608082015260a001610082565b6100786100fa36600461020c565b6101b9565b6100787f000000000000000000000000000000000000000000000000000000000000000081565b6000808080806008603060a060016024856101428c82886101b9565b9a5061014e8682610277565b905061015b8c82876101b9565b99506101678582610277565b90506101748c82866101b9565b98506101808482610277565b905061018d8c82856101b9565b1515975061019b8382610277565b90506101a88c82846101b9565b965050505050505091939590929450565b60006101cc600160ff841681901b610296565b8360ff1685901c1690509392505050565b6000602082840312156101ef57600080fd5b5035919050565b803560ff8116811461020757600080fd5b919050565b60008060006060848603121561022157600080fd5b83359250610231602085016101f6565b915061023f604085016101f6565b90509250925092565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b60ff818116838216019081111561029057610290610248565b92915050565b818103818111156102905761029061024856fea2646970667358221220ed07de1fe7ea5fbd9ac83ac4bed2b07a692f7674842e7768af2739d55651549b64736f6c63430008130033"``

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/BaseVerifierHelper__factory.ts:216

## Methods

### attach

▸ **attach**(`address`): [`BaseVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.BaseVerifierHelper.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |

#### Returns

[`BaseVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.BaseVerifierHelper.md)

#### Overrides

ContractFactory.attach

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/BaseVerifierHelper__factory.ts:209

___

### connect

▸ **connect**(`signer`): [`BaseVerifierHelper__factory`](typechain.factories.contracts.verifierHelpers.BaseVerifierHelper__factory.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `signer` | `Signer` |

#### Returns

[`BaseVerifierHelper__factory`](typechain.factories.contracts.verifierHelpers.BaseVerifierHelper__factory.md)

#### Overrides

ContractFactory.connect

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/BaseVerifierHelper__factory.ts:212

___

### deploy

▸ **deploy**(`_unirep`, `_verifier`, `overrides?`): `Promise`<[`BaseVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.BaseVerifierHelper.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `_unirep` | `string` |
| `_verifier` | `string` |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<[`BaseVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.BaseVerifierHelper.md)\>

#### Overrides

ContractFactory.deploy

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/BaseVerifierHelper__factory.ts:191

___

### getDeployTransaction

▸ **getDeployTransaction**(`_unirep`, `_verifier`, `overrides?`): `TransactionRequest`

#### Parameters

| Name | Type |
| :------ | :------ |
| `_unirep` | `string` |
| `_verifier` | `string` |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`TransactionRequest`

#### Overrides

ContractFactory.getDeployTransaction

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/BaseVerifierHelper__factory.ts:202

___

### connect

▸ `Static` **connect**(`address`, `signerOrProvider`): [`BaseVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.BaseVerifierHelper.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |
| `signerOrProvider` | `Provider` \| `Signer` |

#### Returns

[`BaseVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.BaseVerifierHelper.md)

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/BaseVerifierHelper__factory.ts:221

___

### createInterface

▸ `Static` **createInterface**(): `BaseVerifierHelperInterface`

#### Returns

`BaseVerifierHelperInterface`

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/BaseVerifierHelper__factory.ts:218

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
