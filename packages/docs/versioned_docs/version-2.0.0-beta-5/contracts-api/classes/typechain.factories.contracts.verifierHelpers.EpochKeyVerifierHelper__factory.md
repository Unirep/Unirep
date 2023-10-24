---
id: "typechain.factories.contracts.verifierHelpers.EpochKeyVerifierHelper__factory"
title: "Class: EpochKeyVerifierHelper__factory"
sidebar_label: "EpochKeyVerifierHelper__factory"
custom_edit_url: null
---

[contracts](../namespaces/typechain.factories.contracts.md).[verifierHelpers](../namespaces/typechain.factories.contracts.verifierHelpers.md).EpochKeyVerifierHelper__factory

## Hierarchy

- `ContractFactory`

  ↳ **`EpochKeyVerifierHelper__factory`**

## Constructors

### constructor

• **new EpochKeyVerifierHelper__factory**(`...args`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `EpochKeyVerifierHelperConstructorParams` |

#### Overrides

ContractFactory.constructor

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/EpochKeyVerifierHelper__factory.ts:376

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

▪ `Static` `Readonly` **abi**: readonly [{ `inputs`: readonly [{ `internalType`: ``"contract Unirep"`` = "contract Unirep"; `name`: ``"_unirep"`` = "\_unirep"; `type`: ``"address"`` = "address" }, { `internalType`: ``"contract IVerifier"`` = "contract IVerifier"; `name`: ``"_verifier"`` = "\_verifier"; `type`: ``"address"`` = "address" }] ; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"constructor"`` = "constructor" }, { `inputs`: readonly [] = []; `name`: ``"AttesterInvalid"`` = "AttesterInvalid"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"CallerInvalid"`` = "CallerInvalid"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [{ `internalType`: ``"uint48"`` = "uint48"; `name`: ``"chainId"`` = "chainId"; `type`: ``"uint48"`` = "uint48" }] ; `name`: ``"ChainIdNotMatch"`` = "ChainIdNotMatch"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"InvalidEpoch"`` = "InvalidEpoch"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"InvalidEpochKey"`` = "InvalidEpochKey"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"InvalidProof"`` = "InvalidProof"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"stateTreeRoot"`` = "stateTreeRoot"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"InvalidStateTreeRoot"`` = "InvalidStateTreeRoot"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"SNARK_SCALAR_FIELD"`` = "SNARK\_SCALAR\_FIELD"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"chainid"`` = "chainid"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"control"`` = "control"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"decodeEpochKeyControl"`` = "decodeEpochKeyControl"; `outputs`: readonly [{ `internalType`: ``"uint8"`` = "uint8"; `name`: ``"nonce"`` = "nonce"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"revealNonce"`` = "revealNonce"; `type`: ``"bool"`` = "bool" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"chainId"`` = "chainId"; `type`: ``"uint48"`` = "uint48" }] ; `stateMutability`: ``"pure"`` = "pure"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256[]"`` = "uint256[]"; `name`: ``"publicSignals"`` = "publicSignals"; `type`: ``"uint256[]"`` = "uint256[]" }] ; `name`: ``"decodeEpochKeySignals"`` = "decodeEpochKeySignals"; `outputs`: readonly [{ `components`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"epochKey"`` = "epochKey"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"stateTreeRoot"`` = "stateTreeRoot"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"data"`` = "data"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"chainId"`` = "chainId"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"nonce"`` = "nonce"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"revealNonce"`` = "revealNonce"; `type`: ``"bool"`` = "bool" }] ; `internalType`: ``"struct BaseVerifierHelper.EpochKeySignals"`` = "struct BaseVerifierHelper.EpochKeySignals"; `name`: ``""`` = ""; `type`: ``"tuple"`` = "tuple" }] ; `stateMutability`: ``"pure"`` = "pure"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"data"`` = "data"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"shiftBits"`` = "shiftBits"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"variableBits"`` = "variableBits"; `type`: ``"uint8"`` = "uint8" }] ; `name`: ``"shiftAndParse"`` = "shiftAndParse"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"pure"`` = "pure"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256[]"`` = "uint256[]"; `name`: ``"publicSignals"`` = "publicSignals"; `type`: ``"uint256[]"`` = "uint256[]" }, { `internalType`: ``"uint256[8]"`` = "uint256[8]"; `name`: ``"proof"`` = "proof"; `type`: ``"uint256[8]"`` = "uint256[8]" }] ; `name`: ``"verifyAndCheck"`` = "verifyAndCheck"; `outputs`: readonly [{ `components`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"epochKey"`` = "epochKey"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"stateTreeRoot"`` = "stateTreeRoot"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"data"`` = "data"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"chainId"`` = "chainId"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"nonce"`` = "nonce"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"revealNonce"`` = "revealNonce"; `type`: ``"bool"`` = "bool" }] ; `internalType`: ``"struct BaseVerifierHelper.EpochKeySignals"`` = "struct BaseVerifierHelper.EpochKeySignals"; `name`: ``""`` = ""; `type`: ``"tuple"`` = "tuple" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256[]"`` = "uint256[]"; `name`: ``"publicSignals"`` = "publicSignals"; `type`: ``"uint256[]"`` = "uint256[]" }, { `internalType`: ``"uint256[8]"`` = "uint256[8]"; `name`: ``"proof"`` = "proof"; `type`: ``"uint256[8]"`` = "uint256[8]" }] ; `name`: ``"verifyAndCheckCaller"`` = "verifyAndCheckCaller"; `outputs`: readonly [{ `components`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"epochKey"`` = "epochKey"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"stateTreeRoot"`` = "stateTreeRoot"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"data"`` = "data"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"chainId"`` = "chainId"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"nonce"`` = "nonce"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"revealNonce"`` = "revealNonce"; `type`: ``"bool"`` = "bool" }] ; `internalType`: ``"struct BaseVerifierHelper.EpochKeySignals"`` = "struct BaseVerifierHelper.EpochKeySignals"; `name`: ``""`` = ""; `type`: ``"tuple"`` = "tuple" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }] = `_abi`

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/EpochKeyVerifierHelper__factory.ts:410

___

### bytecode

▪ `Static` `Readonly` **bytecode**: ``"0x60a060405234801561001057600080fd5b50604051610ca5380380610ca583398101604081905261002f91610084565b600080546001600160a01b039384166001600160a01b0319918216179091556001805492909316911617905565ffffffffffff46166080526100be565b6001600160a01b038116811461008157600080fd5b50565b6000806040838503121561009757600080fd5b82516100a28161006c565b60208401519092506100b38161006c565b809150509250929050565b608051610bc56100e06000396000818161017b01526107340152610bc56000f3fe608060405234801561001057600080fd5b506004361061007d5760003560e01c8063870316bb1161005b578063870316bb1461013d578063bf8085ea14610150578063c60ee8a414610163578063cd84980e1461017657600080fd5b806325c2cd121461008257806354af684e146100bc57806359c960a01461011d575b600080fd5b6100a97f30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f000000181565b6040519081526020015b60405180910390f35b6100cf6100ca36600461087e565b61019d565b6040805160ff909616865265ffffffffffff948516602087015273ffffffffffffffffffffffffffffffffffffffff909316928501929092521515606084015216608082015260a0016100b3565b61013061012b3660046108e3565b610230565b6040516100b39190610925565b61013061014b3660046109af565b61042f565b61013061015e3660046109af565b6107b0565b6100a9610171366004610a22565b61085a565b6100a97f000000000000000000000000000000000000000000000000000000000000000081565b6000808080806008603060a060016024856101b98c828861085a565b9a506101c58682610a8d565b90506101d28c828761085a565b99506101de8582610a8d565b90506101eb8c828661085a565b98506101f78482610a8d565b90506102048c828561085a565b151597506102128382610a8d565b905061021f8c828461085a565b965050505050505091939590929450565b6040805161010081018252600080825260208201819052918101829052606081018290526080810182905260a0810182905260c0810182905260e08101919091526040805161010081018252600080825260208201819052918101829052606081018290526080810182905260a0810182905260c0810182905260e0810191909152838360008181106102c5576102c5610aa6565b6020029190910135825250838360018181106102e3576102e3610aa6565b905060200201358160200181815250508383600381811061030657610306610aa6565b60200291909101356040830152506103368484600281811061032a5761032a610aa6565b9050602002013561019d565b65ffffffffffff90811660a087015290151560e086015273ffffffffffffffffffffffffffffffffffffffff909116606085015216608083015260ff1660c082015280517f30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001116103d2576040517f2217bbbc00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b606081015173ffffffffffffffffffffffffffffffffffffffff90811610610426576040517fd7aa584700000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b90505b92915050565b6040805161010081018252600080825260208201819052918101829052606081018290526080810182905260a0810182905260c0810182905260e081018290529061047a8585610230565b6001546040517f7004914400000000000000000000000000000000000000000000000000000000815291925073ffffffffffffffffffffffffffffffffffffffff16906370049144906104d590889088908890600401610ad5565b602060405180830381865afa1580156104f2573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906105169190610b32565b61054c576040517f09bde33900000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6000805460608301516040517f983c9cdb00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff918216600482015291169063983c9cdb90602401602060405180830381865afa1580156105c1573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906105e59190610b54565b90508065ffffffffffff16826080015165ffffffffffff161115610635576040517fd5b25b6300000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6000546060830151608084015160208501516040517f849a51c700000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff938416600482015265ffffffffffff9092166024830152604482015291169063849a51c790606401602060405180830381865afa1580156106c7573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906106eb9190610b32565b6107325781602001516040517ff1b8a45e00000000000000000000000000000000000000000000000000000000815260040161072991815260200190565b60405180910390fd5b7f00000000000000000000000000000000000000000000000000000000000000008260a0015165ffffffffffff16146107a75760a08201516040517f4c4783a800000000000000000000000000000000000000000000000000000000815265ffffffffffff9091166004820152602401610729565b50949350505050565b6040805161010081018252600080825260208201819052918101829052606081018290526080810182905260a0810182905260c0810182905260e08101829052906107fc85858561042f565b606081015190915073ffffffffffffffffffffffffffffffffffffffff163314610852576040517fa78d09b900000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b949350505050565b600061086d600160ff841681901b610b7c565b8360ff1685901c1690509392505050565b60006020828403121561089057600080fd5b5035919050565b60008083601f8401126108a957600080fd5b50813567ffffffffffffffff8111156108c157600080fd5b6020830191508360208260051b85010111156108dc57600080fd5b9250929050565b600080602083850312156108f657600080fd5b823567ffffffffffffffff81111561090d57600080fd5b61091985828601610897565b90969095509350505050565b60006101008201905082518252602083015160208301526040830151604083015273ffffffffffffffffffffffffffffffffffffffff6060840151166060830152608083015165ffffffffffff80821660808501528060a08601511660a0850152505060ff60c08401511660c083015260e08301516109a860e084018215159052565b5092915050565b60008060006101208085870312156109c657600080fd5b843567ffffffffffffffff8111156109dd57600080fd5b6109e987828801610897565b9095509350508481018610156109fe57600080fd5b506020840190509250925092565b803560ff81168114610a1d57600080fd5b919050565b600080600060608486031215610a3757600080fd5b83359250610a4760208501610a0c565b9150610a5560408501610a0c565b90509250925092565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b60ff818116838216019081111561042957610429610a5e565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b610120808252810183905260006101407f07ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff851115610b1257600080fd5b8460051b8087838601378301019050610100836020840137949350505050565b600060208284031215610b4457600080fd5b8151801515811461042657600080fd5b600060208284031215610b6657600080fd5b815165ffffffffffff8116811461042657600080fd5b8181038181111561042957610429610a5e56fea26469706673582212206bc39a6f62b19a47dbc57b176ae6a1aa913107b7f538d8f1149c996688b52c1664736f6c63430008130033"``

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/EpochKeyVerifierHelper__factory.ts:409

## Methods

### attach

▸ **attach**(`address`): [`EpochKeyVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.EpochKeyVerifierHelper.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |

#### Returns

[`EpochKeyVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.EpochKeyVerifierHelper.md)

#### Overrides

ContractFactory.attach

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/EpochKeyVerifierHelper__factory.ts:402

___

### connect

▸ **connect**(`signer`): [`EpochKeyVerifierHelper__factory`](typechain.factories.contracts.verifierHelpers.EpochKeyVerifierHelper__factory.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `signer` | `Signer` |

#### Returns

[`EpochKeyVerifierHelper__factory`](typechain.factories.contracts.verifierHelpers.EpochKeyVerifierHelper__factory.md)

#### Overrides

ContractFactory.connect

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/EpochKeyVerifierHelper__factory.ts:405

___

### deploy

▸ **deploy**(`_unirep`, `_verifier`, `overrides?`): `Promise`<[`EpochKeyVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.EpochKeyVerifierHelper.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `_unirep` | `string` |
| `_verifier` | `string` |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<[`EpochKeyVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.EpochKeyVerifierHelper.md)\>

#### Overrides

ContractFactory.deploy

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/EpochKeyVerifierHelper__factory.ts:384

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

packages/contracts/typechain/factories/contracts/verifierHelpers/EpochKeyVerifierHelper__factory.ts:395

___

### connect

▸ `Static` **connect**(`address`, `signerOrProvider`): [`EpochKeyVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.EpochKeyVerifierHelper.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |
| `signerOrProvider` | `Provider` \| `Signer` |

#### Returns

[`EpochKeyVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.EpochKeyVerifierHelper.md)

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/EpochKeyVerifierHelper__factory.ts:414

___

### createInterface

▸ `Static` **createInterface**(): `EpochKeyVerifierHelperInterface`

#### Returns

`EpochKeyVerifierHelperInterface`

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/EpochKeyVerifierHelper__factory.ts:411

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
