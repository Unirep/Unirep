---
id: "typechain.factories.contracts.verifierHelpers.EpochKeyLiteVerifierHelper__factory"
title: "Class: EpochKeyLiteVerifierHelper__factory"
sidebar_label: "EpochKeyLiteVerifierHelper__factory"
custom_edit_url: null
---

[contracts](../namespaces/typechain.factories.contracts.md).[verifierHelpers](../namespaces/typechain.factories.contracts.verifierHelpers.md).EpochKeyLiteVerifierHelper__factory

## Hierarchy

- `ContractFactory`

  ↳ **`EpochKeyLiteVerifierHelper__factory`**

## Constructors

### constructor

• **new EpochKeyLiteVerifierHelper__factory**(`...args`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `EpochKeyLiteVerifierHelperConstructorParams` |

#### Overrides

ContractFactory.constructor

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/EpochKeyLiteVerifierHelper__factory.ts:376

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

▪ `Static` `Readonly` **abi**: readonly [{ `inputs`: readonly [{ `internalType`: ``"contract Unirep"`` = "contract Unirep"; `name`: ``"_unirep"`` = "\_unirep"; `type`: ``"address"`` = "address" }, { `internalType`: ``"contract IVerifier"`` = "contract IVerifier"; `name`: ``"_verifier"`` = "\_verifier"; `type`: ``"address"`` = "address" }] ; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"constructor"`` = "constructor" }, { `inputs`: readonly [] = []; `name`: ``"AttesterInvalid"`` = "AttesterInvalid"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"CallerInvalid"`` = "CallerInvalid"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [{ `internalType`: ``"uint48"`` = "uint48"; `name`: ``"chainId"`` = "chainId"; `type`: ``"uint48"`` = "uint48" }] ; `name`: ``"ChainIdNotMatch"`` = "ChainIdNotMatch"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"InvalidEpoch"`` = "InvalidEpoch"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"InvalidEpochKey"`` = "InvalidEpochKey"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"InvalidProof"`` = "InvalidProof"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"stateTreeRoot"`` = "stateTreeRoot"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"InvalidStateTreeRoot"`` = "InvalidStateTreeRoot"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"SNARK_SCALAR_FIELD"`` = "SNARK\_SCALAR\_FIELD"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"chainid"`` = "chainid"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"control"`` = "control"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"decodeEpochKeyControl"`` = "decodeEpochKeyControl"; `outputs`: readonly [{ `internalType`: ``"uint8"`` = "uint8"; `name`: ``"nonce"`` = "nonce"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"revealNonce"`` = "revealNonce"; `type`: ``"bool"`` = "bool" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"chainId"`` = "chainId"; `type`: ``"uint48"`` = "uint48" }] ; `stateMutability`: ``"pure"`` = "pure"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256[]"`` = "uint256[]"; `name`: ``"publicSignals"`` = "publicSignals"; `type`: ``"uint256[]"`` = "uint256[]" }] ; `name`: ``"decodeEpochKeyLiteSignals"`` = "decodeEpochKeyLiteSignals"; `outputs`: readonly [{ `components`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"epochKey"`` = "epochKey"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"stateTreeRoot"`` = "stateTreeRoot"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"data"`` = "data"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"chainId"`` = "chainId"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"nonce"`` = "nonce"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"revealNonce"`` = "revealNonce"; `type`: ``"bool"`` = "bool" }] ; `internalType`: ``"struct BaseVerifierHelper.EpochKeySignals"`` = "struct BaseVerifierHelper.EpochKeySignals"; `name`: ``""`` = ""; `type`: ``"tuple"`` = "tuple" }] ; `stateMutability`: ``"pure"`` = "pure"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"data"`` = "data"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"shiftBits"`` = "shiftBits"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"variableBits"`` = "variableBits"; `type`: ``"uint8"`` = "uint8" }] ; `name`: ``"shiftAndParse"`` = "shiftAndParse"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"pure"`` = "pure"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256[]"`` = "uint256[]"; `name`: ``"publicSignals"`` = "publicSignals"; `type`: ``"uint256[]"`` = "uint256[]" }, { `internalType`: ``"uint256[8]"`` = "uint256[8]"; `name`: ``"proof"`` = "proof"; `type`: ``"uint256[8]"`` = "uint256[8]" }] ; `name`: ``"verifyAndCheck"`` = "verifyAndCheck"; `outputs`: readonly [{ `components`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"epochKey"`` = "epochKey"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"stateTreeRoot"`` = "stateTreeRoot"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"data"`` = "data"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"chainId"`` = "chainId"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"nonce"`` = "nonce"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"revealNonce"`` = "revealNonce"; `type`: ``"bool"`` = "bool" }] ; `internalType`: ``"struct BaseVerifierHelper.EpochKeySignals"`` = "struct BaseVerifierHelper.EpochKeySignals"; `name`: ``""`` = ""; `type`: ``"tuple"`` = "tuple" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256[]"`` = "uint256[]"; `name`: ``"publicSignals"`` = "publicSignals"; `type`: ``"uint256[]"`` = "uint256[]" }, { `internalType`: ``"uint256[8]"`` = "uint256[8]"; `name`: ``"proof"`` = "proof"; `type`: ``"uint256[8]"`` = "uint256[8]" }] ; `name`: ``"verifyAndCheckCaller"`` = "verifyAndCheckCaller"; `outputs`: readonly [{ `components`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"epochKey"`` = "epochKey"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"stateTreeRoot"`` = "stateTreeRoot"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"data"`` = "data"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"chainId"`` = "chainId"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"nonce"`` = "nonce"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"revealNonce"`` = "revealNonce"; `type`: ``"bool"`` = "bool" }] ; `internalType`: ``"struct BaseVerifierHelper.EpochKeySignals"`` = "struct BaseVerifierHelper.EpochKeySignals"; `name`: ``""`` = ""; `type`: ``"tuple"`` = "tuple" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }] = `_abi`

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/EpochKeyLiteVerifierHelper__factory.ts:410

___

### bytecode

▪ `Static` `Readonly` **bytecode**: ``"0x60a060405234801561001057600080fd5b50604051610b87380380610b8783398101604081905261002f91610084565b600080546001600160a01b039384166001600160a01b0319918216179091556001805492909316911617905565ffffffffffff46166080526100be565b6001600160a01b038116811461008157600080fd5b50565b6000806040838503121561009757600080fd5b82516100a28161006c565b60208401519092506100b38161006c565b809150509250929050565b608051610aa76100e06000396000818161017b01526106120152610aa76000f3fe608060405234801561001057600080fd5b506004361061007d5760003560e01c8063870316bb1161005b578063870316bb1461013d578063bf8085ea14610150578063c60ee8a414610163578063cd84980e1461017657600080fd5b806325c2cd12146100825780632a566fc5146100bc57806354af684e146100dc575b600080fd5b6100a97f30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f000000181565b6040519081526020015b60405180910390f35b6100cf6100ca3660046107ac565b61019d565b6040516100b391906107ee565b6100ef6100ea366004610878565b610377565b6040805160ff909616865265ffffffffffff948516602087015273ffffffffffffffffffffffffffffffffffffffff909316928501929092521515606084015216608082015260a0016100b3565b6100cf61014b366004610891565b61040a565b6100cf61015e366004610891565b610692565b6100a9610171366004610904565b61073c565b6100a97f000000000000000000000000000000000000000000000000000000000000000081565b6040805161010081018252600080825260208201819052918101829052606081018290526080810182905260a0810182905260c0810182905260e08101919091526040805161010081018252600080825260208201819052918101829052606081018290526080810182905260a0810182905260c0810182905260e08101919091528383600181811061023257610232610940565b60200291909101358252508383600281811061025057610250610940565b602002919091013560408301525061027e848460008161027257610272610940565b90506020020135610377565b65ffffffffffff90811660a087015290151560e086015273ffffffffffffffffffffffffffffffffffffffff909116606085015216608083015260ff1660c082015280517f30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f00000011161031a576040517f2217bbbc00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b606081015173ffffffffffffffffffffffffffffffffffffffff9081161061036e576040517fd7aa584700000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b90505b92915050565b6000808080806008603060a060016024856103938c828861073c565b9a5061039f868261099e565b90506103ac8c828761073c565b99506103b8858261099e565b90506103c58c828661073c565b98506103d1848261099e565b90506103de8c828561073c565b151597506103ec838261099e565b90506103f98c828461073c565b965050505050505091939590929450565b6040805161010081018252600080825260208201819052918101829052606081018290526080810182905260a0810182905260c0810182905260e0810182905290610455858561019d565b6001546040517f7004914400000000000000000000000000000000000000000000000000000000815291925073ffffffffffffffffffffffffffffffffffffffff16906370049144906104b0908890889088906004016109b7565b602060405180830381865afa1580156104cd573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906104f19190610a14565b610527576040517f09bde33900000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6000805460608301516040517f983c9cdb00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff918216600482015291169063983c9cdb90602401602060405180830381865afa15801561059c573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906105c09190610a36565b90508065ffffffffffff16826080015165ffffffffffff161115610610576040517fd5b25b6300000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b7f00000000000000000000000000000000000000000000000000000000000000008260a0015165ffffffffffff16146106895760a08201516040517f4c4783a800000000000000000000000000000000000000000000000000000000815265ffffffffffff909116600482015260240160405180910390fd5b50949350505050565b6040805161010081018252600080825260208201819052918101829052606081018290526080810182905260a0810182905260c0810182905260e08101829052906106de85858561040a565b606081015190915073ffffffffffffffffffffffffffffffffffffffff163314610734576040517fa78d09b900000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b949350505050565b600061074f600160ff841681901b610a5e565b8360ff1685901c1690509392505050565b60008083601f84011261077257600080fd5b50813567ffffffffffffffff81111561078a57600080fd5b6020830191508360208260051b85010111156107a557600080fd5b9250929050565b600080602083850312156107bf57600080fd5b823567ffffffffffffffff8111156107d657600080fd5b6107e285828601610760565b90969095509350505050565b60006101008201905082518252602083015160208301526040830151604083015273ffffffffffffffffffffffffffffffffffffffff6060840151166060830152608083015165ffffffffffff80821660808501528060a08601511660a0850152505060ff60c08401511660c083015260e083015161087160e084018215159052565b5092915050565b60006020828403121561088a57600080fd5b5035919050565b60008060006101208085870312156108a857600080fd5b843567ffffffffffffffff8111156108bf57600080fd5b6108cb87828801610760565b9095509350508481018610156108e057600080fd5b506020840190509250925092565b803560ff811681146108ff57600080fd5b919050565b60008060006060848603121561091957600080fd5b83359250610929602085016108ee565b9150610937604085016108ee565b90509250925092565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b60ff81811683821601908111156103715761037161096f565b610120808252810183905260006101407f07ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8511156109f457600080fd5b8460051b8087838601378301019050610100836020840137949350505050565b600060208284031215610a2657600080fd5b8151801515811461036e57600080fd5b600060208284031215610a4857600080fd5b815165ffffffffffff8116811461036e57600080fd5b818103818111156103715761037161096f56fea264697066735822122062aa0dcdd251deef02230d3d0149a3326108b05a5094a2d9500d26bb85967c2464736f6c63430008130033"``

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/EpochKeyLiteVerifierHelper__factory.ts:409

## Methods

### attach

▸ **attach**(`address`): [`EpochKeyLiteVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.EpochKeyLiteVerifierHelper.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |

#### Returns

[`EpochKeyLiteVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.EpochKeyLiteVerifierHelper.md)

#### Overrides

ContractFactory.attach

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/EpochKeyLiteVerifierHelper__factory.ts:402

___

### connect

▸ **connect**(`signer`): [`EpochKeyLiteVerifierHelper__factory`](typechain.factories.contracts.verifierHelpers.EpochKeyLiteVerifierHelper__factory.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `signer` | `Signer` |

#### Returns

[`EpochKeyLiteVerifierHelper__factory`](typechain.factories.contracts.verifierHelpers.EpochKeyLiteVerifierHelper__factory.md)

#### Overrides

ContractFactory.connect

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/EpochKeyLiteVerifierHelper__factory.ts:405

___

### deploy

▸ **deploy**(`_unirep`, `_verifier`, `overrides?`): `Promise`<[`EpochKeyLiteVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.EpochKeyLiteVerifierHelper.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `_unirep` | `string` |
| `_verifier` | `string` |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<[`EpochKeyLiteVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.EpochKeyLiteVerifierHelper.md)\>

#### Overrides

ContractFactory.deploy

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/EpochKeyLiteVerifierHelper__factory.ts:384

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

packages/contracts/typechain/factories/contracts/verifierHelpers/EpochKeyLiteVerifierHelper__factory.ts:395

___

### connect

▸ `Static` **connect**(`address`, `signerOrProvider`): [`EpochKeyLiteVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.EpochKeyLiteVerifierHelper.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |
| `signerOrProvider` | `Provider` \| `Signer` |

#### Returns

[`EpochKeyLiteVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.EpochKeyLiteVerifierHelper.md)

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/EpochKeyLiteVerifierHelper__factory.ts:414

___

### createInterface

▸ `Static` **createInterface**(): `EpochKeyLiteVerifierHelperInterface`

#### Returns

`EpochKeyLiteVerifierHelperInterface`

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/EpochKeyLiteVerifierHelper__factory.ts:411

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
