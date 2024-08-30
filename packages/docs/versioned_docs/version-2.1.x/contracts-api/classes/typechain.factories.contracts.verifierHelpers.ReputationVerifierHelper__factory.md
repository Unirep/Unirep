---
id: "typechain.factories.contracts.verifierHelpers.ReputationVerifierHelper__factory"
title: "Class: ReputationVerifierHelper__factory"
sidebar_label: "ReputationVerifierHelper__factory"
custom_edit_url: null
---

[contracts](../namespaces/typechain.factories.contracts.md).[verifierHelpers](../namespaces/typechain.factories.contracts.verifierHelpers.md).ReputationVerifierHelper__factory

## Hierarchy

- `ContractFactory`

  ↳ **`ReputationVerifierHelper__factory`**

## Constructors

### constructor

• **new ReputationVerifierHelper__factory**(`...args`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `ReputationVerifierHelperConstructorParams` |

#### Overrides

ContractFactory.constructor

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/ReputationVerifierHelper__factory.ts:525

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

▪ `Static` `Readonly` **abi**: readonly [{ `inputs`: readonly [{ `internalType`: ``"contract Unirep"`` = "contract Unirep"; `name`: ``"_unirep"`` = "\_unirep"; `type`: ``"address"`` = "address" }, { `internalType`: ``"contract IVerifier"`` = "contract IVerifier"; `name`: ``"_verifier"`` = "\_verifier"; `type`: ``"address"`` = "address" }] ; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"constructor"`` = "constructor" }, { `inputs`: readonly [] = []; `name`: ``"AttesterInvalid"`` = "AttesterInvalid"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"CallerInvalid"`` = "CallerInvalid"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [{ `internalType`: ``"uint48"`` = "uint48"; `name`: ``"chainId"`` = "chainId"; `type`: ``"uint48"`` = "uint48" }] ; `name`: ``"ChainIdNotMatch"`` = "ChainIdNotMatch"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"InvalidEpoch"`` = "InvalidEpoch"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"InvalidEpochKey"`` = "InvalidEpochKey"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"InvalidProof"`` = "InvalidProof"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"stateTreeRoot"`` = "stateTreeRoot"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"InvalidStateTreeRoot"`` = "InvalidStateTreeRoot"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"SNARK_SCALAR_FIELD"`` = "SNARK\_SCALAR\_FIELD"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"chainid"`` = "chainid"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"control"`` = "control"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"decodeEpochKeyControl"`` = "decodeEpochKeyControl"; `outputs`: readonly [{ `internalType`: ``"uint8"`` = "uint8"; `name`: ``"nonce"`` = "nonce"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"revealNonce"`` = "revealNonce"; `type`: ``"bool"`` = "bool" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"chainId"`` = "chainId"; `type`: ``"uint48"`` = "uint48" }] ; `stateMutability`: ``"pure"`` = "pure"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"control"`` = "control"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"decodeReputationControl"`` = "decodeReputationControl"; `outputs`: readonly [{ `internalType`: ``"uint64"`` = "uint64"; `name`: ``"minRep"`` = "minRep"; `type`: ``"uint64"`` = "uint64" }, { `internalType`: ``"uint64"`` = "uint64"; `name`: ``"maxRep"`` = "maxRep"; `type`: ``"uint64"`` = "uint64" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"proveMinRep"`` = "proveMinRep"; `type`: ``"bool"`` = "bool" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"proveMaxRep"`` = "proveMaxRep"; `type`: ``"bool"`` = "bool" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"proveZeroRep"`` = "proveZeroRep"; `type`: ``"bool"`` = "bool" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"proveGraffiti"`` = "proveGraffiti"; `type`: ``"bool"`` = "bool" }] ; `stateMutability`: ``"pure"`` = "pure"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256[]"`` = "uint256[]"; `name`: ``"publicSignals"`` = "publicSignals"; `type`: ``"uint256[]"`` = "uint256[]" }] ; `name`: ``"decodeReputationSignals"`` = "decodeReputationSignals"; `outputs`: readonly [{ `components`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"epochKey"`` = "epochKey"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"stateTreeRoot"`` = "stateTreeRoot"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"minRep"`` = "minRep"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"maxRep"`` = "maxRep"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"graffiti"`` = "graffiti"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"data"`` = "data"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"chainId"`` = "chainId"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"nonce"`` = "nonce"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"revealNonce"`` = "revealNonce"; `type`: ``"bool"`` = "bool" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"proveMinRep"`` = "proveMinRep"; `type`: ``"bool"`` = "bool" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"proveMaxRep"`` = "proveMaxRep"; `type`: ``"bool"`` = "bool" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"proveZeroRep"`` = "proveZeroRep"; `type`: ``"bool"`` = "bool" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"proveGraffiti"`` = "proveGraffiti"; `type`: ``"bool"`` = "bool" }] ; `internalType`: ``"struct BaseVerifierHelper.ReputationSignals"`` = "struct BaseVerifierHelper.ReputationSignals"; `name`: ``""`` = ""; `type`: ``"tuple"`` = "tuple" }] ; `stateMutability`: ``"pure"`` = "pure"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"data"`` = "data"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"shiftBits"`` = "shiftBits"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"variableBits"`` = "variableBits"; `type`: ``"uint8"`` = "uint8" }] ; `name`: ``"shiftAndParse"`` = "shiftAndParse"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"pure"`` = "pure"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256[]"`` = "uint256[]"; `name`: ``"publicSignals"`` = "publicSignals"; `type`: ``"uint256[]"`` = "uint256[]" }, { `internalType`: ``"uint256[8]"`` = "uint256[8]"; `name`: ``"proof"`` = "proof"; `type`: ``"uint256[8]"`` = "uint256[8]" }] ; `name`: ``"verifyAndCheck"`` = "verifyAndCheck"; `outputs`: readonly [{ `components`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"epochKey"`` = "epochKey"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"stateTreeRoot"`` = "stateTreeRoot"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"minRep"`` = "minRep"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"maxRep"`` = "maxRep"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"graffiti"`` = "graffiti"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"data"`` = "data"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"chainId"`` = "chainId"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"nonce"`` = "nonce"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"revealNonce"`` = "revealNonce"; `type`: ``"bool"`` = "bool" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"proveMinRep"`` = "proveMinRep"; `type`: ``"bool"`` = "bool" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"proveMaxRep"`` = "proveMaxRep"; `type`: ``"bool"`` = "bool" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"proveZeroRep"`` = "proveZeroRep"; `type`: ``"bool"`` = "bool" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"proveGraffiti"`` = "proveGraffiti"; `type`: ``"bool"`` = "bool" }] ; `internalType`: ``"struct BaseVerifierHelper.ReputationSignals"`` = "struct BaseVerifierHelper.ReputationSignals"; `name`: ``""`` = ""; `type`: ``"tuple"`` = "tuple" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256[]"`` = "uint256[]"; `name`: ``"publicSignals"`` = "publicSignals"; `type`: ``"uint256[]"`` = "uint256[]" }, { `internalType`: ``"uint256[8]"`` = "uint256[8]"; `name`: ``"proof"`` = "proof"; `type`: ``"uint256[8]"`` = "uint256[8]" }] ; `name`: ``"verifyAndCheckCaller"`` = "verifyAndCheckCaller"; `outputs`: readonly [{ `components`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"epochKey"`` = "epochKey"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"stateTreeRoot"`` = "stateTreeRoot"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"minRep"`` = "minRep"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"maxRep"`` = "maxRep"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"graffiti"`` = "graffiti"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"data"`` = "data"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"chainId"`` = "chainId"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"nonce"`` = "nonce"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"revealNonce"`` = "revealNonce"; `type`: ``"bool"`` = "bool" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"proveMinRep"`` = "proveMinRep"; `type`: ``"bool"`` = "bool" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"proveMaxRep"`` = "proveMaxRep"; `type`: ``"bool"`` = "bool" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"proveZeroRep"`` = "proveZeroRep"; `type`: ``"bool"`` = "bool" }, { `internalType`: ``"bool"`` = "bool"; `name`: ``"proveGraffiti"`` = "proveGraffiti"; `type`: ``"bool"`` = "bool" }] ; `internalType`: ``"struct BaseVerifierHelper.ReputationSignals"`` = "struct BaseVerifierHelper.ReputationSignals"; `name`: ``""`` = ""; `type`: ``"tuple"`` = "tuple" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }] = `_abi`

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/ReputationVerifierHelper__factory.ts:559

___

### bytecode

▪ `Static` `Readonly` **bytecode**: ``"0x60a060405234801561001057600080fd5b50604051610f7b380380610f7b83398101604081905261002f91610084565b600080546001600160a01b039384166001600160a01b0319918216179091556001805492909316911617905565ffffffffffff46166080526100be565b6001600160a01b038116811461008157600080fd5b50565b6000806040838503121561009757600080fd5b82516100a28161006c565b60208401519092506100b38161006c565b809150509250929050565b608051610e9b6100e0600039600081816101c901526105ce0152610e9b6000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c8063bf8085ea1161005b578063bf8085ea1461019e578063c60ee8a4146101b1578063cd84980e146101c4578063d8757938146101eb57600080fd5b806325c2cd121461008d57806354af684e146100c7578063870316bb14610128578063b38f3d7214610148575b600080fd5b6100b47f30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f000000181565b6040519081526020015b60405180910390f35b6100da6100d5366004610af4565b6101fe565b6040805160ff909616865265ffffffffffff948516602087015273ffffffffffffffffffffffffffffffffffffffff909316928501929092521515606084015216608082015260a0016100be565b61013b610136366004610b59565b610291565b6040516100be9190610bb6565b61015b610156366004610af4565b61064c565b6040805167ffffffffffffffff978816815296909516602087015292151593850193909352151560608401529015156080830152151560a082015260c0016100be565b61013b6101ac366004610b59565b610702565b6100b46101bf366004610cb6565b6107e4565b6100b47f000000000000000000000000000000000000000000000000000000000000000081565b61013b6101f9366004610cf2565b610808565b6000808080806008603060a0600160248561021a8c82886107e4565b9a506102268682610d63565b90506102338c82876107e4565b995061023f8582610d63565b905061024c8c82866107e4565b98506102588482610d63565b90506102658c82856107e4565b151597506102738382610d63565b90506102808c82846107e4565b965050505050505091939590929450565b604080516101e081018252600080825260208201819052918101829052606081018290526080810182905260a0810182905260c0810182905260e08101829052610100810182905261012081018290526101408101829052610160810182905261018081018290526101a081018290526101c08101829052906103148585610808565b6001546040517f7004914400000000000000000000000000000000000000000000000000000000815291925073ffffffffffffffffffffffffffffffffffffffff169063700491449061036f90889088908890600401610d7c565b602060405180830381865afa15801561038c573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906103b09190610dd9565b6103e6576040517f09bde33900000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6000805460c08301516040517f983c9cdb00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff918216600482015291169063983c9cdb90602401602060405180830381865afa15801561045b573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061047f9190610dfb565b90508065ffffffffffff168260e0015165ffffffffffff1611156104cf576040517fd5b25b6300000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60005460c083015160e084015160208501516040517f849a51c700000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff938416600482015265ffffffffffff9092166024830152604482015291169063849a51c790606401602060405180830381865afa158015610561573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906105859190610dd9565b6105cc5781602001516040517ff1b8a45e0000000000000000000000000000000000000000000000000000000081526004016105c391815260200190565b60405180910390fd5b7f000000000000000000000000000000000000000000000000000000000000000082610100015165ffffffffffff1614610643576101008201516040517f4c4783a800000000000000000000000000000000000000000000000000000000815265ffffffffffff90911660048201526024016105c3565b50949350505050565b6000808080808060406001826106638a82856107e4565b985061066f8382610d63565b905061067c8a82856107e4565b97506106888382610d63565b90506106958a82846107e4565b151596506106a38282610d63565b90506106b08a82846107e4565b151595506106be8282610d63565b90506106cb8a82846107e4565b151594506106d98282610d63565b90506106e68a82846107e4565b151593506106f48282610d63565b905050505091939550919395565b604080516101e081018252600080825260208201819052918101829052606081018290526080810182905260a0810182905260c0810182905260e08101829052610100810182905261012081018290526101408101829052610160810182905261018081018290526101a081018290526101c0810182905290610786858585610291565b60c081015190915073ffffffffffffffffffffffffffffffffffffffff1633146107dc576040517fa78d09b900000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b949350505050565b60006107f7600160ff841681901b610e23565b8360ff1685901c1690509392505050565b604080516101e081018252600080825260208201819052918101829052606081018290526080810182905260a0810182905260c0810182905260e08101829052610100810182905261012081018290526101408101829052610160810182905261018081018290526101a081018290526101c0810191909152604080516101e081018252600080825260208201819052918101829052606081018290526080810182905260a0810182905260c0810182905260e08101829052610100810182905261012081018290526101408101829052610160810182905261018081018290526101a081018290526101c08101919091528383600081811061090d5761090d610e36565b60200291909101358252508383600181811061092b5761092b610e36565b905060200201358160200181815250508383600481811061094e5761094e610e36565b60200291909101356080830152508383600581811061096f5761096f610e36565b602002919091013560a08301525061099f8484600281811061099357610993610e36565b905060200201356101fe565b65ffffffffffff90811661010087015290151561014086015273ffffffffffffffffffffffffffffffffffffffff90911660c08501521660e083015260ff16610120820152610a06848460038181106109fa576109fa610e36565b9050602002013561064c565b15156101c087015215156101a08601521515610180850152151561016084015267ffffffffffffffff908116606084015216604082015280517f30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f000000111610a97576040517f2217bbbc00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60c081015173ffffffffffffffffffffffffffffffffffffffff90811610610aeb576040517fd7aa584700000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b90505b92915050565b600060208284031215610b0657600080fd5b5035919050565b60008083601f840112610b1f57600080fd5b50813567ffffffffffffffff811115610b3757600080fd5b6020830191508360208260051b8501011115610b5257600080fd5b9250929050565b6000806000610120808587031215610b7057600080fd5b843567ffffffffffffffff811115610b8757600080fd5b610b9387828801610b0d565b909550935050848101861015610ba857600080fd5b506020840190509250925092565b60006101e082019050825182526020830151602083015260408301516040830152606083015160608301526080830151608083015260a083015160a083015260c0830151610c1c60c084018273ffffffffffffffffffffffffffffffffffffffff169052565b5060e0830151610c3660e084018265ffffffffffff169052565b506101008381015165ffffffffffff16908301526101208084015160ff16908301526101408084015115159083015261016080840151151590830152610180808401511515908301526101a0808401511515908301526101c0928301511515929091019190915290565b803560ff81168114610cb157600080fd5b919050565b600080600060608486031215610ccb57600080fd5b83359250610cdb60208501610ca0565b9150610ce960408501610ca0565b90509250925092565b60008060208385031215610d0557600080fd5b823567ffffffffffffffff811115610d1c57600080fd5b610d2885828601610b0d565b90969095509350505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b60ff8181168382160190811115610aee57610aee610d34565b610120808252810183905260006101407f07ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff851115610db957600080fd5b8460051b8087838601378301019050610100836020840137949350505050565b600060208284031215610deb57600080fd5b81518015158114610aeb57600080fd5b600060208284031215610e0d57600080fd5b815165ffffffffffff81168114610aeb57600080fd5b81810381811115610aee57610aee610d34565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fdfea2646970667358221220bdb94e5db40b4f3da64aaaec0c583434f78a9fafedbdf77b2a8311c19707493c64736f6c63430008130033"``

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/ReputationVerifierHelper__factory.ts:558

## Methods

### attach

▸ **attach**(`address`): [`ReputationVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.ReputationVerifierHelper.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |

#### Returns

[`ReputationVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.ReputationVerifierHelper.md)

#### Overrides

ContractFactory.attach

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/ReputationVerifierHelper__factory.ts:551

___

### connect

▸ **connect**(`signer`): [`ReputationVerifierHelper__factory`](typechain.factories.contracts.verifierHelpers.ReputationVerifierHelper__factory.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `signer` | `Signer` |

#### Returns

[`ReputationVerifierHelper__factory`](typechain.factories.contracts.verifierHelpers.ReputationVerifierHelper__factory.md)

#### Overrides

ContractFactory.connect

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/ReputationVerifierHelper__factory.ts:554

___

### deploy

▸ **deploy**(`_unirep`, `_verifier`, `overrides?`): `Promise`<[`ReputationVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.ReputationVerifierHelper.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `_unirep` | `string` |
| `_verifier` | `string` |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<[`ReputationVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.ReputationVerifierHelper.md)\>

#### Overrides

ContractFactory.deploy

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/ReputationVerifierHelper__factory.ts:533

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

packages/contracts/typechain/factories/contracts/verifierHelpers/ReputationVerifierHelper__factory.ts:544

___

### connect

▸ `Static` **connect**(`address`, `signerOrProvider`): [`ReputationVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.ReputationVerifierHelper.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |
| `signerOrProvider` | `Provider` \| `Signer` |

#### Returns

[`ReputationVerifierHelper`](../interfaces/typechain.contracts.verifierHelpers.ReputationVerifierHelper.md)

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/ReputationVerifierHelper__factory.ts:563

___

### createInterface

▸ `Static` **createInterface**(): `ReputationVerifierHelperInterface`

#### Returns

`ReputationVerifierHelperInterface`

#### Defined in

packages/contracts/typechain/factories/contracts/verifierHelpers/ReputationVerifierHelper__factory.ts:560

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
