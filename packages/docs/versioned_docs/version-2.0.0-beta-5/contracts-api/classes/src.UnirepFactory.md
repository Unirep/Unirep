---
id: "src.UnirepFactory"
title: "Class: UnirepFactory"
sidebar_label: "UnirepFactory"
custom_edit_url: null
---

[src](../modules/src.md).UnirepFactory

## Hierarchy

- `ContractFactory`

  ↳ **`UnirepFactory`**

## Constructors

### constructor

• **new UnirepFactory**(`...args`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | `UnirepConstructorParams` |

#### Overrides

ContractFactory.constructor

#### Defined in

packages/contracts/typechain/factories/contracts/Unirep__factory.ts:1222

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

▪ `Static` `Readonly` **abi**: readonly [{ `inputs`: readonly [{ `components`: readonly [{ `internalType`: ``"uint8"`` = "uint8"; `name`: ``"stateTreeDepth"`` = "stateTreeDepth"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"epochTreeDepth"`` = "epochTreeDepth"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"historyTreeDepth"`` = "historyTreeDepth"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"fieldCount"`` = "fieldCount"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"sumFieldCount"`` = "sumFieldCount"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"numEpochKeyNoncePerEpoch"`` = "numEpochKeyNoncePerEpoch"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"replNonceBits"`` = "replNonceBits"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"replFieldBits"`` = "replFieldBits"; `type`: ``"uint8"`` = "uint8" }] ; `internalType`: ``"struct IUnirep.Config"`` = "struct IUnirep.Config"; `name`: ``"_config"`` = "\_config"; `type`: ``"tuple"`` = "tuple" }, { `internalType`: ``"contract IVerifier"`` = "contract IVerifier"; `name`: ``"_signupVerifier"`` = "\_signupVerifier"; `type`: ``"address"`` = "address" }, { `internalType`: ``"contract IVerifier"`` = "contract IVerifier"; `name`: ``"_userStateTransitionVerifier"`` = "\_userStateTransitionVerifier"; `type`: ``"address"`` = "address" }] ; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"constructor"`` = "constructor" }, { `inputs`: readonly [{ `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attester"`` = "attester"; `type`: ``"uint160"`` = "uint160" }] ; `name`: ``"AttesterAlreadySignUp"`` = "AttesterAlreadySignUp"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [{ `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }] ; `name`: ``"AttesterIdNotMatch"`` = "AttesterIdNotMatch"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"AttesterInvalid"`` = "AttesterInvalid"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [{ `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attester"`` = "attester"; `type`: ``"uint160"`` = "uint160" }] ; `name`: ``"AttesterNotSignUp"`` = "AttesterNotSignUp"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [{ `internalType`: ``"uint48"`` = "uint48"; `name`: ``"chainId"`` = "chainId"; `type`: ``"uint48"`` = "uint48" }] ; `name`: ``"ChainIdNotMatch"`` = "ChainIdNotMatch"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"EpochKeyNotProcessed"`` = "EpochKeyNotProcessed"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"EpochNotMatch"`` = "EpochNotMatch"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"InvalidEpoch"`` = "InvalidEpoch"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"InvalidEpochKey"`` = "InvalidEpochKey"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"InvalidField"`` = "InvalidField"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"historyTreeRoot"`` = "historyTreeRoot"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"InvalidHistoryTreeRoot"`` = "InvalidHistoryTreeRoot"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"InvalidProof"`` = "InvalidProof"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"InvalidSignature"`` = "InvalidSignature"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"nullilier"`` = "nullilier"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"NullifierAlreadyUsed"`` = "NullifierAlreadyUsed"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [] = []; `name`: ``"OutOfRange"`` = "OutOfRange"; `type`: ``"error"`` = "error" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"identityCommitment"`` = "identityCommitment"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"UserAlreadySignedUp"`` = "UserAlreadySignedUp"; `type`: ``"error"`` = "error" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `indexed`: ``true`` = true; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"epochKey"`` = "epochKey"; `type`: ``"uint256"`` = "uint256" }, { `indexed`: ``true`` = true; `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `indexed`: ``false`` = false; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"fieldIndex"`` = "fieldIndex"; `type`: ``"uint256"`` = "uint256" }, { `indexed`: ``false`` = false; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"change"`` = "change"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"Attestation"`` = "Attestation"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `indexed`: ``false`` = false; `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epochLength"`` = "epochLength"; `type`: ``"uint48"`` = "uint48" }, { `indexed`: ``false`` = false; `internalType`: ``"uint48"`` = "uint48"; `name`: ``"timestamp"`` = "timestamp"; `type`: ``"uint48"`` = "uint48" }] ; `name`: ``"AttesterSignedUp"`` = "AttesterSignedUp"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `indexed`: ``true`` = true; `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }] ; `name`: ``"EpochEnded"`` = "EpochEnded"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `indexed`: ``true`` = true; `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `indexed`: ``true`` = true; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"index"`` = "index"; `type`: ``"uint256"`` = "uint256" }, { `indexed`: ``false`` = false; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"leaf"`` = "leaf"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"EpochTreeLeaf"`` = "EpochTreeLeaf"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `indexed`: ``false`` = false; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"leaf"`` = "leaf"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"HistoryTreeLeaf"`` = "HistoryTreeLeaf"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `indexed`: ``true`` = true; `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `indexed`: ``true`` = true; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"index"`` = "index"; `type`: ``"uint256"`` = "uint256" }, { `indexed`: ``false`` = false; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"leaf"`` = "leaf"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"StateTreeLeaf"`` = "StateTreeLeaf"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `indexed`: ``true`` = true; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"identityCommitment"`` = "identityCommitment"; `type`: ``"uint256"`` = "uint256" }, { `indexed`: ``true`` = true; `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `indexed`: ``false`` = false; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"leafIndex"`` = "leafIndex"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"UserSignedUp"`` = "UserSignedUp"; `type`: ``"event"`` = "event" }, { `anonymous`: ``false`` = false; `inputs`: readonly [{ `indexed`: ``true`` = true; `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `indexed`: ``true`` = true; `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `indexed`: ``true`` = true; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"leafIndex"`` = "leafIndex"; `type`: ``"uint256"`` = "uint256" }, { `indexed`: ``false`` = false; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"hashedLeaf"`` = "hashedLeaf"; `type`: ``"uint256"`` = "uint256" }, { `indexed`: ``false`` = false; `internalType`: ``"uint256"`` = "uint256"; `name`: ``"nullifier"`` = "nullifier"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"UserStateTransitioned"`` = "UserStateTransitioned"; `type`: ``"event"`` = "event" }, { `inputs`: readonly [] = []; `name`: ``"SNARK_SCALAR_FIELD"`` = "SNARK\_SCALAR\_FIELD"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"_updateEpochIfNeeded"`` = "\_updateEpochIfNeeded"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"epochKey"`` = "epochKey"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"fieldIndex"`` = "fieldIndex"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"change"`` = "change"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"attest"`` = "attest"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"attestationCount"`` = "attestationCount"; `outputs`: readonly [{ `internalType`: ``"uint48"`` = "uint48"; `name`: ``""`` = ""; `type`: ``"uint48"`` = "uint48" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }] ; `name`: ``"attesterCurrentEpoch"`` = "attesterCurrentEpoch"; `outputs`: readonly [{ `internalType`: ``"uint48"`` = "uint48"; `name`: ``""`` = ""; `type`: ``"uint48"`` = "uint48" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }] ; `name`: ``"attesterEpochLength"`` = "attesterEpochLength"; `outputs`: readonly [{ `internalType`: ``"uint48"`` = "uint48"; `name`: ``""`` = ""; `type`: ``"uint48"`` = "uint48" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }] ; `name`: ``"attesterEpochRemainingTime"`` = "attesterEpochRemainingTime"; `outputs`: readonly [{ `internalType`: ``"uint48"`` = "uint48"; `name`: ``""`` = ""; `type`: ``"uint48"`` = "uint48" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }] ; `name`: ``"attesterEpochRoot"`` = "attesterEpochRoot"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }] ; `name`: ``"attesterMemberCount"`` = "attesterMemberCount"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }] ; `name`: ``"attesterSemaphoreGroupRoot"`` = "attesterSemaphoreGroupRoot"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epochLength"`` = "epochLength"; `type`: ``"uint48"`` = "uint48" }] ; `name`: ``"attesterSignUp"`` = "attesterSignUp"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"address"`` = "address"; `name`: ``"attester"`` = "attester"; `type`: ``"address"`` = "address" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epochLength"`` = "epochLength"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"bytes"`` = "bytes"; `name`: ``"signature"`` = "signature"; `type`: ``"bytes"`` = "bytes" }] ; `name`: ``"attesterSignUpViaRelayer"`` = "attesterSignUpViaRelayer"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }] ; `name`: ``"attesterStartTimestamp"`` = "attesterStartTimestamp"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }] ; `name`: ``"attesterStateTreeLeafCount"`` = "attesterStateTreeLeafCount"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }] ; `name`: ``"attesterStateTreeRoot"`` = "attesterStateTreeRoot"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"root"`` = "root"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"attesterStateTreeRootExists"`` = "attesterStateTreeRootExists"; `outputs`: readonly [{ `internalType`: ``"bool"`` = "bool"; `name`: ``""`` = ""; `type`: ``"bool"`` = "bool" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"chainid"`` = "chainid"; `outputs`: readonly [{ `internalType`: ``"uint48"`` = "uint48"; `name`: ``""`` = ""; `type`: ``"uint48"`` = "uint48" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"config"`` = "config"; `outputs`: readonly [{ `components`: readonly [{ `internalType`: ``"uint8"`` = "uint8"; `name`: ``"stateTreeDepth"`` = "stateTreeDepth"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"epochTreeDepth"`` = "epochTreeDepth"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"historyTreeDepth"`` = "historyTreeDepth"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"fieldCount"`` = "fieldCount"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"sumFieldCount"`` = "sumFieldCount"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"numEpochKeyNoncePerEpoch"`` = "numEpochKeyNoncePerEpoch"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"replNonceBits"`` = "replNonceBits"; `type`: ``"uint8"`` = "uint8" }, { `internalType`: ``"uint8"`` = "uint8"; `name`: ``"replFieldBits"`` = "replFieldBits"; `type`: ``"uint8"`` = "uint8" }] ; `internalType`: ``"struct IUnirep.Config"`` = "struct IUnirep.Config"; `name`: ``""`` = ""; `type`: ``"tuple"`` = "tuple" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"control"`` = "control"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"decodeSignupControl"`` = "decodeSignupControl"; `outputs`: readonly [{ `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"chainId"`` = "chainId"; `type`: ``"uint48"`` = "uint48" }] ; `stateMutability`: ``"pure"`` = "pure"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256[]"`` = "uint256[]"; `name`: ``"publicSignals"`` = "publicSignals"; `type`: ``"uint256[]"`` = "uint256[]" }] ; `name`: ``"decodeSignupSignals"`` = "decodeSignupSignals"; `outputs`: readonly [{ `components`: readonly [{ `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"chainId"`` = "chainId"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"stateTreeLeaf"`` = "stateTreeLeaf"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"identityCommitment"`` = "identityCommitment"; `type`: ``"uint256"`` = "uint256" }] ; `internalType`: ``"struct IUnirep.SignupSignals"`` = "struct IUnirep.SignupSignals"; `name`: ``""`` = ""; `type`: ``"tuple"`` = "tuple" }] ; `stateMutability`: ``"pure"`` = "pure"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"control"`` = "control"; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"decodeUserStateTransitionControl"`` = "decodeUserStateTransitionControl"; `outputs`: readonly [{ `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"toEpoch"`` = "toEpoch"; `type`: ``"uint48"`` = "uint48" }] ; `stateMutability`: ``"pure"`` = "pure"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256[]"`` = "uint256[]"; `name`: ``"publicSignals"`` = "publicSignals"; `type`: ``"uint256[]"`` = "uint256[]" }] ; `name`: ``"decodeUserStateTransitionSignals"`` = "decodeUserStateTransitionSignals"; `outputs`: readonly [{ `components`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``"historyTreeRoot"`` = "historyTreeRoot"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"stateTreeLeaf"`` = "stateTreeLeaf"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint48"`` = "uint48"; `name`: ``"toEpoch"`` = "toEpoch"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }, { `internalType`: ``"uint256[]"`` = "uint256[]"; `name`: ``"epochKeys"`` = "epochKeys"; `type`: ``"uint256[]"`` = "uint256[]" }] ; `internalType`: ``"struct IUnirep.UserStateTransitionSignals"`` = "struct IUnirep.UserStateTransitionSignals"; `name`: ``""`` = ""; `type`: ``"tuple"`` = "tuple" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"defaultDataHash"`` = "defaultDataHash"; `outputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"epochTreeDepth"`` = "epochTreeDepth"; `outputs`: readonly [{ `internalType`: ``"uint8"`` = "uint8"; `name`: ``""`` = ""; `type`: ``"uint8"`` = "uint8" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"fieldCount"`` = "fieldCount"; `outputs`: readonly [{ `internalType`: ``"uint8"`` = "uint8"; `name`: ``""`` = ""; `type`: ``"uint8"`` = "uint8" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"historyTreeDepth"`` = "historyTreeDepth"; `outputs`: readonly [{ `internalType`: ``"uint8"`` = "uint8"; `name`: ``""`` = ""; `type`: ``"uint8"`` = "uint8" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"identityCommitment"`` = "identityCommitment"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256"`` = "uint256"; `name`: ``"leafIdentityHash"`` = "leafIdentityHash"; `type`: ``"uint256"`` = "uint256" }, { `internalType`: ``"uint256[]"`` = "uint256[]"; `name`: ``"initialData"`` = "initialData"; `type`: ``"uint256[]"`` = "uint256[]" }] ; `name`: ``"manualUserSignUp"`` = "manualUserSignUp"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"numEpochKeyNoncePerEpoch"`` = "numEpochKeyNoncePerEpoch"; `outputs`: readonly [{ `internalType`: ``"uint8"`` = "uint8"; `name`: ``""`` = ""; `type`: ``"uint8"`` = "uint8" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"replFieldBits"`` = "replFieldBits"; `outputs`: readonly [{ `internalType`: ``"uint8"`` = "uint8"; `name`: ``""`` = ""; `type`: ``"uint8"`` = "uint8" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"replNonceBits"`` = "replNonceBits"; `outputs`: readonly [{ `internalType`: ``"uint8"`` = "uint8"; `name`: ``""`` = ""; `type`: ``"uint8"`` = "uint8" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"signupVerifier"`` = "signupVerifier"; `outputs`: readonly [{ `internalType`: ``"contract IVerifier"`` = "contract IVerifier"; `name`: ``""`` = ""; `type`: ``"address"`` = "address" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"stateTreeDepth"`` = "stateTreeDepth"; `outputs`: readonly [{ `internalType`: ``"uint8"`` = "uint8"; `name`: ``""`` = ""; `type`: ``"uint8"`` = "uint8" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"sumFieldCount"`` = "sumFieldCount"; `outputs`: readonly [{ `internalType`: ``"uint8"`` = "uint8"; `name`: ``""`` = ""; `type`: ``"uint8"`` = "uint8" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint160"`` = "uint160"; `name`: ``"attesterId"`` = "attesterId"; `type`: ``"uint160"`` = "uint160" }] ; `name`: ``"updateEpochIfNeeded"`` = "updateEpochIfNeeded"; `outputs`: readonly [{ `internalType`: ``"uint48"`` = "uint48"; `name`: ``"epoch"`` = "epoch"; `type`: ``"uint48"`` = "uint48" }] ; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256"`` = "uint256"; `name`: ``""`` = ""; `type`: ``"uint256"`` = "uint256" }] ; `name`: ``"usedNullifiers"`` = "usedNullifiers"; `outputs`: readonly [{ `internalType`: ``"bool"`` = "bool"; `name`: ``""`` = ""; `type`: ``"bool"`` = "bool" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256[]"`` = "uint256[]"; `name`: ``"publicSignals"`` = "publicSignals"; `type`: ``"uint256[]"`` = "uint256[]" }, { `internalType`: ``"uint256[8]"`` = "uint256[8]"; `name`: ``"proof"`` = "proof"; `type`: ``"uint256[8]"`` = "uint256[8]" }] ; `name`: ``"userSignUp"`` = "userSignUp"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [{ `internalType`: ``"uint256[]"`` = "uint256[]"; `name`: ``"publicSignals"`` = "publicSignals"; `type`: ``"uint256[]"`` = "uint256[]" }, { `internalType`: ``"uint256[8]"`` = "uint256[8]"; `name`: ``"proof"`` = "proof"; `type`: ``"uint256[8]"`` = "uint256[8]" }] ; `name`: ``"userStateTransition"`` = "userStateTransition"; `outputs`: readonly [] = []; `stateMutability`: ``"nonpayable"`` = "nonpayable"; `type`: ``"function"`` = "function" }, { `inputs`: readonly [] = []; `name`: ``"userStateTransitionVerifier"`` = "userStateTransitionVerifier"; `outputs`: readonly [{ `internalType`: ``"contract IVerifier"`` = "contract IVerifier"; `name`: ``""`` = ""; `type`: ``"address"`` = "address" }] ; `stateMutability`: ``"view"`` = "view"; `type`: ``"function"`` = "function" }] = `_abi`

#### Defined in

packages/contracts/typechain/factories/contracts/Unirep__factory.ts:1305

___

### bytecode

▪ `Static` `Readonly` **bytecode**: ``"0x6102006040526002805465ffffffffffff191660011790553480156200002457600080fd5b506040516200433b3803806200433b8339810160408190526200004791620002a6565b6080836060015160ff16106200008e5760405162461bcd60e51b81526020600482015260086024820152676461746173697a6560c01b604482015260640160405180910390fd5b825160ff90811660c0908152602080860151831660e0908152604080880151851661010052606088015185166101205260808089015186166101405260a0808a015187166101605294890151861661018052918801519094166101a05265ffffffffffff468181166101c0526001600160a01b0388811690935291861690935283518381524290931691830191909152916000917f01f6bdf3a22f8751bad62953107a99b8239b40791f2e14216b48c1d279f649cd910160405180910390a2600080805260208190527fad3228b676f7d3cd4284a5443f17f1962b36e491b30a40b2405849e597ba5fb580544265ffffffffffff1665ffffffffffff65ffffffffffff60601b01199091161771ffffffffffff00000000000000000000000017905560015b6101205160ff168110156200026757604080518082018252838152600060208201529051632b0aac7f60e11b815273__$75f79a42d9bcbdbb69ad79ebd80f556f39$__9163561558fe916200020c9190600401620003c2565b602060405180830381865af41580156200022a573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190620002509190620003f5565b9150806200025e816200040f565b915050620001b3565b506101e052506200043792505050565b805160ff811681146200028957600080fd5b919050565b80516001600160a01b03811681146200028957600080fd5b6000806000838503610140811215620002be57600080fd5b61010080821215620002cf57600080fd5b60405191508082016001600160401b03811183821017156200030157634e487b7160e01b600052604160045260246000fd5b6040526200030f8662000277565b82526200031f6020870162000277565b6020830152620003326040870162000277565b6040830152620003456060870162000277565b6060830152620003586080870162000277565b60808301526200036b60a0870162000277565b60a08301526200037e60c0870162000277565b60c08301526200039160e0870162000277565b60e0830152819450620003a68187016200028e565b93505050620003b961012085016200028e565b90509250925092565b60408101818360005b6002811015620003ec578151835260209283019290910190600101620003cb565b50505092915050565b6000602082840312156200040857600080fd5b5051919050565b6000600182016200043057634e487b7160e01b600052601160045260246000fd5b5060010190565b60805160a05160c05160e05161010051610120516101405161016051610180516101a0516101c0516101e051613d99620005a2600039600081816105780152610b2e015260008181610a010152610f6601526000818161053c0152818161084e01528181610c28015261241c0152600081816105130152818161059f01528181610cdd015261248d0152600081816104ea015281816107f1015281816111ce0152818161123c01526116dd0152600081816104c101528181610a8701528181610bf401528181610ca8015261238b0152600081816104980152818161091701528181610ad301528181612268015261255c01526000818161029c0152818161046f01526130510152600081816104460152818161075701528181611acf01528181611c210152612f030152600081816103a90152818161041d01528181612e5e0152612faa015260008181610706015261142c0152600081816106ba015261101e0152613d996000f3fe608060405234801561001057600080fd5b50600436106102925760003560e01c8063a32775da11610160578063bc1aa2dc116100d8578063d9d241dc1161008c578063e84ae0a811610071578063e84ae0a814610a82578063f50f062c14610aa9578063f9fe630914610abc57600080fd5b8063d9d241dc14610a5c578063e065453314610a6f57600080fd5b8063cb9ea7bc116100bd578063cb9ea7bc146109e9578063cd84980e146109fc578063d028291014610a2357600080fd5b8063bc1aa2dc14610939578063c0e05a2a1461097257600080fd5b8063ad7033681161012f578063b1f712af11610114578063b1f712af146108ec578063b29660d4146108ff578063bb485bbd1461091257600080fd5b8063ad70336814610849578063b1c089f31461087057600080fd5b8063a32775da1461079e578063a7c264ca146107ec578063aacdee3d14610813578063aad240611461082657600080fd5b806380f248a31161020e5780639101ebae116101c257806399c353c8116101a757806399c353c814610752578063a09bb6d914610779578063a15b93211461078c57600080fd5b80639101ebae14610701578063983c9cdb1461072857600080fd5b806386bebd90116101f357806386bebd901461062b5780638a46ea12146106955780638b113dc7146106b557600080fd5b806380f248a31461059a578063849a51c7146105c157600080fd5b806325c2cd1211610265578063652c76e41161024a578063652c76e4146103a457806379502c55146103cb5780637d5a42991461057357600080fd5b806325c2cd121461036a5780634144f0511461039157600080fd5b80630458b3ae1461029757806308239f79146102d55780630fcda1121461031c5780631713cf9b14610331575b600080fd5b6102be7f000000000000000000000000000000000000000000000000000000000000000081565b60405160ff90911681526020015b60405180910390f35b61030e6102e3366004613578565b73ffffffffffffffffffffffffffffffffffffffff1660009081526020819052604090206013015490565b6040519081526020016102cc565b61032f61032a3660046135fc565b610acf565b005b61030e61033f366004613578565b73ffffffffffffffffffffffffffffffffffffffff1660009081526020819052604090206014015490565b61030e7f30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f000000181565b61032f61039f366004613664565b610ee6565b6102be7f000000000000000000000000000000000000000000000000000000000000000081565b6105666040805161010081018252600080825260208201819052918101829052606081018290526080810182905260a0810182905260c0810182905260e08101919091526040518061010001604052807f000000000000000000000000000000000000000000000000000000000000000060ff1681526020017f000000000000000000000000000000000000000000000000000000000000000060ff1681526020017f000000000000000000000000000000000000000000000000000000000000000060ff1681526020017f000000000000000000000000000000000000000000000000000000000000000060ff1681526020017f000000000000000000000000000000000000000000000000000000000000000060ff1681526020017f000000000000000000000000000000000000000000000000000000000000000060ff1681526020017f000000000000000000000000000000000000000000000000000000000000000060ff1681526020017f000000000000000000000000000000000000000000000000000000000000000060ff16815250905090565b6040516102cc91906136c1565b61030e7f000000000000000000000000000000000000000000000000000000000000000081565b6102be7f000000000000000000000000000000000000000000000000000000000000000081565b61061b6105cf36600461373f565b73ffffffffffffffffffffffffffffffffffffffff831660009081526020818152604080832065ffffffffffff86168452600101825280832084845290915290205460ff169392505050565b60405190151581526020016102cc565b61066261063936600461377d565b73ffffffffffffffffffffffffffffffffffffffff81169160a09190911c65ffffffffffff1690565b6040805173ffffffffffffffffffffffffffffffffffffffff909316835265ffffffffffff9091166020830152016102cc565b6106a86106a3366004613796565b6110eb565b6040516102cc91906137d8565b6106dc7f000000000000000000000000000000000000000000000000000000000000000081565b60405173ffffffffffffffffffffffffffffffffffffffff90911681526020016102cc565b6106dc7f000000000000000000000000000000000000000000000000000000000000000081565b61073b610736366004613578565b61133f565b60405165ffffffffffff90911681526020016102cc565b6102be7f000000000000000000000000000000000000000000000000000000000000000081565b61032f610787366004613664565b6113ef565b60025461073b9065ffffffffffff1681565b61073b6107ac366004613578565b73ffffffffffffffffffffffffffffffffffffffff166000908152602081905260409020546c01000000000000000000000000900465ffffffffffff1690565b6102be7f000000000000000000000000000000000000000000000000000000000000000081565b61030e610821366004613870565b611a58565b61061b61083436600461377d565b60016020526000908152604090205460ff1681565b6102be7f000000000000000000000000000000000000000000000000000000000000000081565b6108b161087e36600461377d565b73ffffffffffffffffffffffffffffffffffffffff81169160a082901c65ffffffffffff169160d01c640fffffffff1690565b6040805173ffffffffffffffffffffffffffffffffffffffff909416845265ffffffffffff92831660208501529116908201526060016102cc565b61032f6108fa3660046138a5565b611b7f565b61073b61090d366004613578565b611b8c565b6102be7f000000000000000000000000000000000000000000000000000000000000000081565b61030e610947366004613578565b73ffffffffffffffffffffffffffffffffffffffff1660009081526020819052604090206007015490565b610985610980366004613796565b612032565b6040516102cc9190600060a08201905065ffffffffffff8084511683528060208501511660208401525073ffffffffffffffffffffffffffffffffffffffff6040840151166040830152606083015160608301526080830151608083015292915050565b61030e6109f736600461377d565b612151565b61073b7f000000000000000000000000000000000000000000000000000000000000000081565b61030e610a31366004613578565b73ffffffffffffffffffffffffffffffffffffffff1660009081526020819052604090206006015490565b61032f610a6a3660046138c0565b6121b7565b61030e610a7d366004613578565b612813565b6102be7f000000000000000000000000000000000000000000000000000000000000000081565b61073b610ab7366004613578565b61285c565b61032f610aca3660046138fb565b61293e565b60ff7f000000000000000000000000000000000000000000000000000000000000000016811115610b2c576040517f7db3aba700000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b7f00000000000000000000000000000000000000000000000000000000000000008115610b705782826000818110610b6657610b6661398b565b9050602002013590505b60005b60ff8116831115610e2b577f30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f000000184848360ff16818110610bb457610bb461398b565b9050602002013510610bf2576040517f7fa0b33700000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b7f000000000000000000000000000000000000000000000000000000000000000060ff168160ff1610158015610c6d5750610c4e7f00000000000000000000000000000000000000000000000000000000000000006002613b09565b84848360ff16818110610c6357610c6361398b565b9050602002013510155b15610ca4576040517f7db3aba700000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60007f000000000000000000000000000000000000000000000000000000000000000060ff168260ff161015610cdb576000610cfd565b7f00000000000000000000000000000000000000000000000000000000000000005b60ff1685858460ff16818110610d1557610d1561398b565b90506020020135901b90508160ff16600014610dd0576040805180820182528481526020810183905290517f561558fe00000000000000000000000000000000000000000000000000000000815273__$75f79a42d9bcbdbb69ad79ebd80f556f39$__9163561558fe91610d8c9190600401613b18565b602060405180830381865af4158015610da9573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610dcd9190613b49565b92505b6040805160ff84168152602081018390523391899165ffffffffffff917f53972e4f6d91817068c9b44a677c823be6a43847e114a630e610215a665014e0910160405180910390a45080610e2381613b62565b915050610b73565b506040805180820182528581526020810183905290517f561558fe00000000000000000000000000000000000000000000000000000000815260009173__$75f79a42d9bcbdbb69ad79ebd80f556f39$__9163561558fe91610e8f91600401613b18565b602060405180830381865af4158015610eac573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610ed09190613b49565b9050610edd8787836129c7565b50505050505050565b6000610ef28484612032565b9050806040015173ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610f64576040517fedc650d70000000000000000000000000000000000000000000000000000000081523360048201526024015b60405180910390fd5b7f000000000000000000000000000000000000000000000000000000000000000065ffffffffffff16816020015165ffffffffffff1614610fe15760208101516040517f4c4783a800000000000000000000000000000000000000000000000000000000815265ffffffffffff9091166004820152602401610f5b565b6040517f7004914400000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff7f0000000000000000000000000000000000000000000000000000000000000000169063700491449061105790879087908790600401613b81565b602060405180830381865afa158015611074573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906110989190613bde565b6110ce576040517f09bde33900000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6110e58160000151826080015183606001516129c7565b50505050565b61113b6040518060a001604052806000815260200160008152602001600065ffffffffffff168152602001600073ffffffffffffffffffffffffffffffffffffffff168152602001606081525090565b61118b6040518060a001604052806000815260200160008152602001600065ffffffffffff168152602001600073ffffffffffffffffffffffffffffffffffffffff168152602001606081525090565b8383600081811061119e5761119e61398b565b6020029190910135825250838360018181106111bc576111bc61398b565b905060200201358160200181815250507f000000000000000000000000000000000000000000000000000000000000000060ff1667ffffffffffffffff81111561120857611208613c00565b604051908082528060200260200182016040528015611231578160200160208202803683370190505b50608082015260005b7f000000000000000000000000000000000000000000000000000000000000000060ff168160ff1610156112c4578484611275836002613c2f565b60ff168181106112875761128761398b565b9050602002013582608001518260ff16815181106112a7576112a761398b565b6020908102919091010152806112bc81613b62565b91505061123a565b5061130e848460058181106112db576112db61398b565b9050602002013573ffffffffffffffffffffffffffffffffffffffff81169165ffffffffffff60a09290921c9190911690565b65ffffffffffff16604083015273ffffffffffffffffffffffffffffffffffffffff16606082015290505b92915050565b73ffffffffffffffffffffffffffffffffffffffff811660009081526020819052604081205465ffffffffffff808216916c010000000000000000000000009004168183036113d2576040517fd724105a00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff85166004820152602401610f5b565b806113dd8342613c48565b6113e79190613c67565b949350505050565b6040517f7004914400000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff7f0000000000000000000000000000000000000000000000000000000000000000169063700491449061146590869086908690600401613b81565b602060405180830381865afa158015611482573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906114a69190613bde565b6114dc576040517f09bde33900000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60006114e884846110eb565b905073ffffffffffffffffffffffffffffffffffffffff8016816060015173ffffffffffffffffffffffffffffffffffffffff1610611553576040517fd7aa584700000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6115608160600151611b8c565b50606081015173ffffffffffffffffffffffffffffffffffffffff16600090815260208190526040812060808301518051919260019290919082906115a7576115a761398b565b60209081029190910181015182528101919091526040016000205460ff161561161e5781608001516000815181106115e1576115e161398b565b60200260200101516040517fdc215c0a000000000000000000000000000000000000000000000000000000008152600401610f5b91815260200190565b6001806000846080015160008151811061163a5761163a61398b565b6020908102919091018101518252810191909152604090810160002080549215157fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff009093169290921790915582015181546601000000000000900465ffffffffffff9081169116146116d8576040517f53d3ff5300000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60005b7f000000000000000000000000000000000000000000000000000000000000000060ff168160ff1610156117f057826040015165ffffffffffff1682600b01600085608001518460ff16815181106117355761173561398b565b60209081029190910181015182528101919091526040016000205465010000000000900465ffffffffffff161080156117a7575081600b01600084608001518360ff16815181106117885761178861398b565b6020026020010151815260200190815260200160002060010154600014155b156117de576040517fb4802d1d00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b806117e881613b62565b9150506116db565b508151600090815260028201602052604090205460ff166118435781516040517fd542f6690000000000000000000000000000000000000000000000000000000081526004810191909152602401610f5b565b60148101546060830151825460208086015160405190815273ffffffffffffffffffffffffffffffffffffffff90931692660100000000000090920465ffffffffffff16917f8075e2eb7c2db44721c36becb8f6dc167d36baf92492c38f9e46def2a23f623c910160405180910390a48060120160020154826060015173ffffffffffffffffffffffffffffffffffffffff168260000160069054906101000a900465ffffffffffff1665ffffffffffff167f85b19f2589182342a97cb096284576a2aa7d3552c8cccef29cc320fb6139b878856020015186608001516000815181106119325761193261398b565b6020026020010151604051611951929190918252602082015260400190565b60405180910390a460208201516040517f226ab5d4000000000000000000000000000000000000000000000000000000008152601283016004820152602481019190915260009073__$7091785c4e08a29a969db2a728005f35a2$__9063226ab5d490604401602060405180830381865af41580156119d4573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906119f89190613b49565b82546601000000000000900465ffffffffffff1660009081526001938401602090815260408083209383529290522080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00169092179091555050505050565b73ffffffffffffffffffffffffffffffffffffffff82166000908152602081905260408120611a868461133f565b65ffffffffffff168365ffffffffffff1603611b5c576040517ff330445500000000000000000000000000000000000000000000000000000000815260168201600482015260ff7f000000000000000000000000000000000000000000000000000000000000000016602482015273__$1fb0d694a3c1e0496466c56a438cb5e7fb$__9063f330445590604401602060405180830381865af4158015611b30573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190611b549190613b49565b915050611339565b65ffffffffffff8316600090815260039091016020526040902054905092915050565b611b893382612d7d565b50565b73ffffffffffffffffffffffffffffffffffffffff81166000908152602081905260408120611bba8361133f565b815490925065ffffffffffff66010000000000009091048116908316819003611be4575050919050565b601482015415611f1d576040517ff330445500000000000000000000000000000000000000000000000000000000815260168301600482015260ff7f000000000000000000000000000000000000000000000000000000000000000016602482015260009073__$1fb0d694a3c1e0496466c56a438cb5e7fb$__9063f330445590604401602060405180830381865af4158015611c85573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190611ca99190613b49565b604080518082018252601386015481526020810183905290517f561558fe00000000000000000000000000000000000000000000000000000000815291925060009173__$75f79a42d9bcbdbb69ad79ebd80f556f39$__9163561558fe91611d149190600401613b18565b602060405180830381865af4158015611d31573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190611d559190613b49565b6040517f168703fa000000000000000000000000000000000000000000000000000000008152600c860160048201526024810182905290915060009073__$0c6eb7207c37accf1552a1c47686411ac0$__9063168703fa90604401602060405180830381865af4158015611dcd573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190611df19190613b49565b60008181526002870160205260409081902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00166001179055517fa85be61700000000000000000000000000000000000000000000000000000000815260128701600482015290915073__$7091785c4e08a29a969db2a728005f35a2$__9063a85be6179060240160006040518083038186803b158015611e9357600080fd5b505af4158015611ea7573d6000803e3d6000fd5b50505065ffffffffffff85166000908152600387016020526040908190208590555173ffffffffffffffffffffffffffffffffffffffff891691507f17d91f8a353dd835a3eba10e4c4edb965a9a096c1e79eda6a87c1c87a4baf2ac90611f119085815260200190565b60405180910390a25050505b6040517fffc2a0af00000000000000000000000000000000000000000000000000000000815260168301600482015273__$1fb0d694a3c1e0496466c56a438cb5e7fb$__9063ffc2a0af9060240160006040518083038186803b158015611f8357600080fd5b505af4158015611f97573d6000803e3d6000fd5b505050508373ffffffffffffffffffffffffffffffffffffffff16600184611fbf9190613c48565b65ffffffffffff167fa9d759e3abbb66f4f5b1de2129632028c3639ad570df1b13bd752155361ec6b660405160405180910390a35080547fffffffffffffffffffffffffffffffffffffffff000000000000ffffffffffff16660100000000000065ffffffffffff841602179055919050565b6040805160a0810182526000808252602082018190529181018290526060810182905260808101919091526040805160a0810182526000808252602082018190529181018290526060810182905260808101919091528383600081811061209b5761209b61398b565b6020029190910135608083015250838360018181106120bc576120bc61398b565b602002919091013560608301525061211d848460028181106120e0576120e061398b565b9050602002013573ffffffffffffffffffffffffffffffffffffffff81169165ffffffffffff60a083901c1691640fffffffff60d09190911c1690565b65ffffffffffff908116602085015216825273ffffffffffffffffffffffffffffffffffffffff1660408201529392505050565b600073ffffffffffffffffffffffffffffffffffffffff82106121a0576040517fd7aa584700000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6121a982611b8c565b65ffffffffffff1692915050565b60006121c233611b8c565b90508065ffffffffffff168465ffffffffffff161461220d576040517f53d3ff5300000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b7f30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f00000018510612266576040517f2217bbbc00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b7f000000000000000000000000000000000000000000000000000000000000000060ff1683106122c2576040517f7fa0b33700000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b33600090815260208181526040808320888452600b019091529020805465010000000000900465ffffffffffff16801580159061230757508265ffffffffffff168114155b15612341576040517fa225656d00000000000000000000000000000000000000000000000000000000815260048101829052602401610f5b565b8265ffffffffffff1681146123895781547fffffffffffffffffffffffffffffffffffffffffff000000000000ffffffffff166501000000000065ffffffffffff8516021782555b7f000000000000000000000000000000000000000000000000000000000000000060ff168510156124175760008260020186608081106123cb576123cb61398b565b0154905060007f30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f000000186830890508084600201886080811061240d5761240d61398b565b0155506124d09050565b6124427f00000000000000000000000000000000000000000000000000000000000000006002613b09565b841061247a576040517f7db3aba700000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6002546124b59065ffffffffffff1660ff7f00000000000000000000000000000000000000000000000000000000000000001686901b613cb3565b9350838260020186608081106124cd576124cd61398b565b01555b60408051868152602081018690523391899165ffffffffffff8a16917f53972e4f6d91817068c9b44a677c823be6a43847e114a630e610215a665014e0910160405180910390a46002805465ffffffffffff1690600061252f83613cc6565b91906101000a81548165ffffffffffff021916908365ffffffffffff16021790555050600087905060005b7f000000000000000000000000000000000000000000000000000000000000000060ff168160ff1610156126415773__$75f79a42d9bcbdbb69ad79ebd80f556f39$__63561558fe6040518060400160405280858152602001876002018560ff16608081106125cb576125cb61398b565b01548152506040518263ffffffff1660e01b81526004016125ec9190613b18565b602060405180830381865af4158015612609573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061262d9190613b49565b91508061263981613b62565b91505061255a565b50600183018054908290553360009081526020819052604090209015906016018115612728578054855464010000000090910464ffffffffff167fffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000009091161785556040517e081944000000000000000000000000000000000000000000000000000000008152600481018290526024810184905273__$1fb0d694a3c1e0496466c56a438cb5e7fb$__90620819449060440160006040518083038186803b15801561270b57600080fd5b505af415801561271f573d6000803e3d6000fd5b505050506127bc565b84546040517f2cbda923000000000000000000000000000000000000000000000000000000008152600481018390526024810185905264ffffffffff909116604482015273__$1fb0d694a3c1e0496466c56a438cb5e7fb$__90632cbda9239060640160006040518083038186803b1580156127a357600080fd5b505af41580156127b7573d6000803e3d6000fd5b505050505b845460405184815264ffffffffff90911690339065ffffffffffff8c16907fc576d248e5f3b6a9055283bcf5f8c5043c6d2a3ee75e64860b6912ddd499c5909060200160405180910390a450505050505050505050565b73ffffffffffffffffffffffffffffffffffffffff81166000908152602081905260408120805465ffffffffffff16820361284d57600080fd5b5465ffffffffffff1692915050565b73ffffffffffffffffffffffffffffffffffffffff811660009081526020819052604081205465ffffffffffff808216916c010000000000000000000000009004168183036128ef576040517fd724105a00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff85166004820152602401610f5b565b426000826128fd8584613c48565b6129079190613c67565b90508183612916836001613ceb565b6129209190613d0a565b61292a9086613ceb565b6129349190613c48565b9695505050505050565b612987848465ffffffffffff1684848080601f01602080910402602001604051908101604052809392919081815260200183838082843760009201919091525061316992505050565b6129bd576040517f8baa579f00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6110e58484612d7d565b336129d181612151565b5073ffffffffffffffffffffffffffffffffffffffff811660009081526020819052604081208054909165ffffffffffff9091169003612a55576040517fd724105a00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff83166004820152602401610f5b565b600084815260048201602052604090205460ff1615612aa3576040517f099cfcff00000000000000000000000000000000000000000000000000000000815260048101859052602401610f5b565b6000848152600482016020526040902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00166001179055805465ffffffffffff660100000000000090910481169086168114612b2d576040517f53d3ff5300000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b8273ffffffffffffffffffffffffffffffffffffffff16858265ffffffffffff167fe30000c37ce3a1e5dd87bed60030707a92a9894f9f678a0ef6031c4770f066968560120160020154604051612b8691815260200190565b60405180910390a46014820154825460405186815273ffffffffffffffffffffffffffffffffffffffff8616916601000000000000900465ffffffffffff16907f8075e2eb7c2db44721c36becb8f6dc167d36baf92492c38f9e46def2a23f623c9060200160405180910390a46040517f226ab5d40000000000000000000000000000000000000000000000000000000081526012830160048201526024810185905260009073__$7091785c4e08a29a969db2a728005f35a2$__9063226ab5d490604401602060405180830381865af4158015612c68573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190612c8c9190613b49565b65ffffffffffff831660009081526001858101602090815260408084208585529091529182902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00169091179055517f168703fa0000000000000000000000000000000000000000000000000000000081526005850160048201526024810188905290915073__$0c6eb7207c37accf1552a1c47686411ac0$__9063168703fa90604401602060405180830381865af4158015612d4f573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190612d739190613b49565b5050505050505050565b73ffffffffffffffffffffffffffffffffffffffff82166000908152602081905260409020805465ffffffffffff1615612dfb576040517f6767dda100000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff84166004820152602401610f5b565b80547fffffffffffffffffffffffffffffffffffffffffffffffffffff000000000000164265ffffffffffff161781556040517f2f4ba31b00000000000000000000000000000000000000000000000000000000815260128201600482015260ff7f000000000000000000000000000000000000000000000000000000000000000016602482015273__$7091785c4e08a29a969db2a728005f35a2$__90632f4ba31b9060440160006040518083038186803b158015612eba57600080fd5b505af4158015612ece573d6000803e3d6000fd5b50506040517f510ff26500000000000000000000000000000000000000000000000000000000815260168401600482015260ff7f000000000000000000000000000000000000000000000000000000000000000016602482015273__$1fb0d694a3c1e0496466c56a438cb5e7fb$__925063510ff265915060440160006040518083038186803b158015612f6157600080fd5b505af4158015612f75573d6000803e3d6000fd5b50506040517f12b3a2fb00000000000000000000000000000000000000000000000000000000815260058401600482015260ff7f000000000000000000000000000000000000000000000000000000000000000016602482015273__$0c6eb7207c37accf1552a1c47686411ac0$__92506312b3a2fb915060440160006040518083038186803b15801561300857600080fd5b505af415801561301c573d6000803e3d6000fd5b50506040517f12b3a2fb000000000000000000000000000000000000000000000000000000008152600c8401600482015260ff7f000000000000000000000000000000000000000000000000000000000000000016602482015273__$0c6eb7207c37accf1552a1c47686411ac0$__92506312b3a2fb915060440160006040518083038186803b1580156130af57600080fd5b505af41580156130c3573d6000803e3d6000fd5b505082547fffffffffffffffffffffffffffff000000000000ffffffffffffffffffffffff81166c0100000000000000000000000065ffffffffffff878116918202928317875560408051928352938116921691909117602082015273ffffffffffffffffffffffffffffffffffffffff871693507f01f6bdf3a22f8751bad62953107a99b8239b40791f2e14216b48c1d279f649cd92500160405180910390a2505050565b6040517fffffffffffffffffffffffffffffffffffffffff00000000000000000000000030606090811b8216602084015285901b166034820152604881018390524660688201819052600091829061320790608801604051602081830303815290604052805190602001207f19457468657265756d205369676e6564204d6573736167653a0a3332000000006000908152601c91909152603c902090565b90508573ffffffffffffffffffffffffffffffffffffffff1661322a828661324b565b73ffffffffffffffffffffffffffffffffffffffff16149695505050505050565b600080600061325a858561326f565b91509150613267816132b4565b509392505050565b60008082516041036132a55760208301516040840151606085015160001a61329987828585613467565b945094505050506132ad565b506000905060025b9250929050565b60008160048111156132c8576132c8613d34565b036132d05750565b60018160048111156132e4576132e4613d34565b0361334b576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601860248201527f45434453413a20696e76616c6964207369676e617475726500000000000000006044820152606401610f5b565b600281600481111561335f5761335f613d34565b036133c6576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601f60248201527f45434453413a20696e76616c6964207369676e6174757265206c656e677468006044820152606401610f5b565b60038160048111156133da576133da613d34565b03611b89576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602260248201527f45434453413a20696e76616c6964207369676e6174757265202773272076616c60448201527f75650000000000000000000000000000000000000000000000000000000000006064820152608401610f5b565b6000807f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a083111561349e575060009050600361354d565b6040805160008082526020820180845289905260ff881692820192909252606081018690526080810185905260019060a0016020604051602081039080840390855afa1580156134f2573d6000803e3d6000fd5b50506040517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0015191505073ffffffffffffffffffffffffffffffffffffffff81166135465760006001925092505061354d565b9150600090505b94509492505050565b73ffffffffffffffffffffffffffffffffffffffff81168114611b8957600080fd5b60006020828403121561358a57600080fd5b813561359581613556565b9392505050565b803565ffffffffffff811681146135b257600080fd5b919050565b60008083601f8401126135c957600080fd5b50813567ffffffffffffffff8111156135e157600080fd5b6020830191508360208260051b85010111156132ad57600080fd5b60008060008060006080868803121561361457600080fd5b61361d8661359c565b94506020860135935060408601359250606086013567ffffffffffffffff81111561364757600080fd5b613653888289016135b7565b969995985093965092949392505050565b600080600061012080858703121561367b57600080fd5b843567ffffffffffffffff81111561369257600080fd5b61369e878288016135b7565b9095509350508481018610156136b357600080fd5b506020840190509250925092565b60006101008201905060ff8084511683528060208501511660208401528060408501511660408401528060608501511660608401528060808501511660808401528060a08501511660a08401525060c083015161372360c084018260ff169052565b5060e083015161373860e084018260ff169052565b5092915050565b60008060006060848603121561375457600080fd5b833561375f81613556565b925061376d6020850161359c565b9150604084013590509250925092565b60006020828403121561378f57600080fd5b5035919050565b600080602083850312156137a957600080fd5b823567ffffffffffffffff8111156137c057600080fd5b6137cc858286016135b7565b90969095509350505050565b6000602080835260c0830184518285015281850151604085015265ffffffffffff604086015116606085015273ffffffffffffffffffffffffffffffffffffffff6060860151166080850152608085015160a08086015281815180845260e0870191508483019350600092505b808310156138655783518252928401926001929092019190840190613845565b509695505050505050565b6000806040838503121561388357600080fd5b823561388e81613556565b915061389c6020840161359c565b90509250929050565b6000602082840312156138b757600080fd5b6135958261359c565b600080600080608085870312156138d657600080fd5b843593506138e66020860161359c565b93969395505050506040820135916060013590565b6000806000806060858703121561391157600080fd5b843561391c81613556565b935061392a6020860161359c565b9250604085013567ffffffffffffffff8082111561394757600080fd5b818701915087601f83011261395b57600080fd5b81358181111561396a57600080fd5b88602082850101111561397c57600080fd5b95989497505060200194505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600181815b80851115613a4257817fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff04821115613a2857613a286139ba565b80851615613a3557918102915b93841c93908002906139ee565b509250929050565b600082613a5957506001611339565b81613a6657506000611339565b8160018114613a7c5760028114613a8657613aa2565b6001915050611339565b60ff841115613a9757613a976139ba565b50506001821b611339565b5060208310610133831016604e8410600b8410161715613ac5575081810a611339565b613acf83836139e9565b807fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff04821115613b0157613b016139ba565b029392505050565b600061359560ff841683613a4a565b60408101818360005b6002811015613b40578151835260209283019290910190600101613b21565b50505092915050565b600060208284031215613b5b57600080fd5b5051919050565b600060ff821660ff8103613b7857613b786139ba565b60010192915050565b610120808252810183905260006101407f07ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff851115613bbe57600080fd5b8460051b8087838601378301019050610100836020840137949350505050565b600060208284031215613bf057600080fd5b8151801515811461359557600080fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b60ff8181168382160190811115611339576113396139ba565b65ffffffffffff828116828216039080821115613738576137386139ba565b600065ffffffffffff80841680613ca7577f4e487b7100000000000000000000000000000000000000000000000000000000600052601260045260246000fd5b92169190910492915050565b80820180821115611339576113396139ba565b600065ffffffffffff808316818103613ce157613ce16139ba565b6001019392505050565b65ffffffffffff818116838216019080821115613738576137386139ba565b65ffffffffffff818116838216028082169190828114613d2c57613d2c6139ba565b505092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602160045260246000fdfea264697066735822122005f7a45c6f8c6c5ef0df42648e2f83c62c2371fb62169200f4b9e1b416f13e3a64736f6c63430008130033"``

#### Defined in

packages/contracts/typechain/factories/contracts/Unirep__factory.ts:1304

## Methods

### attach

▸ **attach**(`address`): [`Unirep`](../interfaces/src.Unirep.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |

#### Returns

[`Unirep`](../interfaces/src.Unirep.md)

#### Overrides

ContractFactory.attach

#### Defined in

packages/contracts/typechain/factories/contracts/Unirep__factory.ts:1297

___

### connect

▸ **connect**(`signer`): [`UnirepFactory`](src.UnirepFactory.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `signer` | `Signer` |

#### Returns

[`UnirepFactory`](src.UnirepFactory.md)

#### Overrides

ContractFactory.connect

#### Defined in

packages/contracts/typechain/factories/contracts/Unirep__factory.ts:1300

___

### deploy

▸ **deploy**(`_config`, `_signupVerifier`, `_userStateTransitionVerifier`, `overrides?`): `Promise`<[`Unirep`](../interfaces/src.Unirep.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `_config` | `ConfigStruct` |
| `_signupVerifier` | `string` |
| `_userStateTransitionVerifier` | `string` |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`Promise`<[`Unirep`](../interfaces/src.Unirep.md)\>

#### Overrides

ContractFactory.deploy

#### Defined in

packages/contracts/typechain/factories/contracts/Unirep__factory.ts:1271

___

### getDeployTransaction

▸ **getDeployTransaction**(`_config`, `_signupVerifier`, `_userStateTransitionVerifier`, `overrides?`): `TransactionRequest`

#### Parameters

| Name | Type |
| :------ | :------ |
| `_config` | `ConfigStruct` |
| `_signupVerifier` | `string` |
| `_userStateTransitionVerifier` | `string` |
| `overrides?` | `Overrides` & { `from?`: `string`  } |

#### Returns

`TransactionRequest`

#### Overrides

ContractFactory.getDeployTransaction

#### Defined in

packages/contracts/typechain/factories/contracts/Unirep__factory.ts:1284

___

### connect

▸ `Static` **connect**(`address`, `signerOrProvider`): [`Unirep`](../interfaces/src.Unirep.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `address` | `string` |
| `signerOrProvider` | `Provider` \| `Signer` |

#### Returns

[`Unirep`](../interfaces/src.Unirep.md)

#### Defined in

packages/contracts/typechain/factories/contracts/Unirep__factory.ts:1309

___

### createInterface

▸ `Static` **createInterface**(): `UnirepInterface`

#### Returns

`UnirepInterface`

#### Defined in

packages/contracts/typechain/factories/contracts/Unirep__factory.ts:1306

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
| `linkLibraryAddresses` | `UnirepLibraryAddresses` |

#### Returns

`string`

#### Defined in

packages/contracts/typechain/factories/contracts/Unirep__factory.ts:1231
