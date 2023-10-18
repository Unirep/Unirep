---
id: "src"
title: "Module: src"
sidebar_label: "src"
sidebar_position: 0
custom_edit_url: null
---

## Enumerations

- [Circuit](../enums/src.Circuit.md)

## Classes

- [BaseProof](../classes/src.BaseProof.md)
- [CircuitConfig](../classes/src.CircuitConfig.md)
- [EpochKeyLiteProof](../classes/src.EpochKeyLiteProof.md)
- [EpochKeyProof](../classes/src.EpochKeyProof.md)
- [ReputationProof](../classes/src.ReputationProof.md)
- [ScopeNullifierProof](../classes/src.ScopeNullifierProof.md)
- [SignupProof](../classes/src.SignupProof.md)
- [UserStateTransitionProof](../classes/src.UserStateTransitionProof.md)

## Interfaces

- [Prover](../interfaces/src.Prover.md)

## Type Aliases

### EpochKeyControl

Ƭ **EpochKeyControl**: `Object`

The data is used to build epoch key control.

**`See`**

https://developer.unirep.io/docs/circuits-api/circuits#epoch-key-proof

#### Type declaration

| Name | Type |
| :------ | :------ |
| `attesterId` | `bigint` |
| `chainId` | `bigint` |
| `epoch` | `bigint` |
| `nonce` | `bigint` |
| `revealNonce` | `bigint` |

#### Defined in

[circuits/src/type.ts:9](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/type.ts#L9)

___

### Field

Ƭ **Field**: `bigint` \| `string`

#### Defined in

[circuits/src/type.ts:3](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/type.ts#L3)

___

### ReputationControl

Ƭ **ReputationControl**: `Object`

The data is used to build reputation control.

**`See`**

https://developer.unirep.io/docs/circuits-api/circuits#reputation-proof

#### Type declaration

| Name | Type |
| :------ | :------ |
| `maxRep` | `bigint` |
| `minRep` | `bigint` |
| `proveGraffiti` | `bigint` |
| `proveMaxRep` | `bigint` |
| `proveMinRep` | `bigint` |
| `proveZeroRep` | `bigint` |

#### Defined in

[circuits/src/type.ts:21](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/type.ts#L21)

___

### SignupControl

Ƭ **SignupControl**: `Object`

The data is used to build signup control.

**`See`**

https://developer.unirep.io/docs/circuits-api/circuits#signup-proof

#### Type declaration

| Name | Type |
| :------ | :------ |
| `attesterId` | `bigint` |
| `chainId` | `bigint` |
| `epoch` | `bigint` |

#### Defined in

[circuits/src/type.ts:43](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/type.ts#L43)

___

### UserStateTransitionControl

Ƭ **UserStateTransitionControl**: `Object`

The data is used to build user state transition control.

**`See`**

https://developer.unirep.io/docs/circuits-api/circuits#user-state-transition-proof

#### Type declaration

| Name | Type |
| :------ | :------ |
| `attesterId` | `bigint` |
| `toEpoch` | `bigint` |

#### Defined in

[circuits/src/type.ts:34](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/type.ts#L34)

## Variables

### SNARK\_SCALAR\_FIELD

• `Const` **SNARK\_SCALAR\_FIELD**: ``"21888242871839275222246405745257275088548364400416034343698204186575808495617"``

A decimal string representing the field prime.

#### Defined in

utils/build/crypto.d.ts:4

## Functions

### buildEpochKeyControl

▸ **buildEpochKeyControl**(`params`, `config?`): `bigint`

Encode data to a 253 bits variable.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `params` | [`EpochKeyControl`](src.md#epochkeycontrol) | `undefined` | The data is going to be encoded. { `nonce`, `epoch`, `attesterId`, `revealNonce`, `chainId` } |
| `config` | [`CircuitConfig`](../classes/src.CircuitConfig.md) | `CircuitConfig.default` | The circuit config. Default: `CircuitConfig.default` |

#### Returns

`bigint`

a 253 bits control.

#### Defined in

[circuits/src/utils.ts:196](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/utils.ts#L196)

___

### buildReputationControl

▸ **buildReputationControl**(`params`, `config?`): `bigint`

Encode data to a 253 bits variable.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `params` | [`ReputationControl`](src.md#reputationcontrol) | `undefined` | The data is going to be encoded. { `minRep`, `maxRep`, `proveMinRep`, `proveMaxRep`, `proveZeroRep`, `proveGraffiti` } |
| `config` | [`CircuitConfig`](../classes/src.CircuitConfig.md) | `CircuitConfig.default` | The circuit config. Default: `CircuitConfig.default` |

#### Returns

`bigint`

a 253 bits control.

#### Defined in

[circuits/src/utils.ts:229](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/utils.ts#L229)

___

### buildSignupControl

▸ **buildSignupControl**(`params`, `config?`): `bigint`

Encode data to a 253 bits variable.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `params` | [`SignupControl`](src.md#signupcontrol) | `undefined` | The data is going to be encoded. { `attesterId`, `epoch`, `chainId` } |
| `config` | [`CircuitConfig`](../classes/src.CircuitConfig.md) | `CircuitConfig.default` | The circuit config. Default: `CircuitConfig.default` |

#### Returns

`bigint`

a 253 bits control.

#### Defined in

[circuits/src/utils.ts:293](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/utils.ts#L293)

___

### buildUserStateTransitionControl

▸ **buildUserStateTransitionControl**(`params`, `config?`): `bigint`

Encode data to a 253 bits variable.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `params` | [`UserStateTransitionControl`](src.md#userstatetransitioncontrol) | `undefined` | The data is going to be encoded. { `attesterId`, `toEpoch` } |
| `config` | [`CircuitConfig`](../classes/src.CircuitConfig.md) | `CircuitConfig.default` | The circuit config. Default: `CircuitConfig.default` |

#### Returns

`bigint`

a 253 bits control.

#### Defined in

[circuits/src/utils.ts:270](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/utils.ts#L270)

___

### decodeEpochKeyControl

▸ **decodeEpochKeyControl**(`control`, `config?`): [`EpochKeyControl`](src.md#epochkeycontrol)

Decode the raw control field to desired data.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `control` | `bigint` | `undefined` | The raw control field generated by `genProofAndPublicSignals` |
| `config` | [`CircuitConfig`](../classes/src.CircuitConfig.md) | `CircuitConfig.default` | The circuit config. Default: `CircuitConfig.default` |

#### Returns

[`EpochKeyControl`](src.md#epochkeycontrol)

{ `nonce`, `epoch`, `attesterId`, `revealNonce`, `chainId` }

#### Defined in

[circuits/src/utils.ts:70](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/utils.ts#L70)

___

### decodeReputationControl

▸ **decodeReputationControl**(`control`, `config?`): `Object`

Decode the raw control field to desired data.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `control` | `bigint` | `undefined` | The raw control field generated by `genProofAndPublicSignals` |
| `config` | [`CircuitConfig`](../classes/src.CircuitConfig.md) | `CircuitConfig.default` | The circuit config. Default: `CircuitConfig.default` |

#### Returns

`Object`

{ `minRep`, `maxRep`, `proveMinRep`, `proveMaxRep`, `proveZeroRep`, `proveGraffiti` }

| Name | Type |
| :------ | :------ |
| `maxRep` | `bigint` |
| `minRep` | `bigint` |
| `proveGraffiti` | `bigint` |
| `proveMaxRep` | `bigint` |
| `proveMinRep` | `bigint` |
| `proveZeroRep` | `bigint` |

#### Defined in

[circuits/src/utils.ts:107](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/utils.ts#L107)

___

### decodeSignupControl

▸ **decodeSignupControl**(`control`, `config?`): [`SignupControl`](src.md#signupcontrol)

Decode the raw control field to desired data.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `control` | `bigint` | `undefined` | The raw control field generated by `genProofAndPublicSignals` |
| `config` | [`CircuitConfig`](../classes/src.CircuitConfig.md) | `CircuitConfig.default` | The circuit config. Default: `CircuitConfig.default` |

#### Returns

[`SignupControl`](src.md#signupcontrol)

{ `attesterId`, `epoch`, `chainId` }

#### Defined in

[circuits/src/utils.ts:170](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/utils.ts#L170)

___

### decodeUserStateTransitionControl

▸ **decodeUserStateTransitionControl**(`control`, `config?`): [`UserStateTransitionControl`](src.md#userstatetransitioncontrol)

Decode the raw control field to desired data.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `control` | `bigint` | `undefined` | The raw control field generated by `genProofAndPublicSignals` |
| `config` | [`CircuitConfig`](../classes/src.CircuitConfig.md) | `CircuitConfig.default` | The circuit config. Default: `CircuitConfig.default` |

#### Returns

[`UserStateTransitionControl`](src.md#userstatetransitioncontrol)

{ `attesterId`, `toEpoch` }

#### Defined in

[circuits/src/utils.ts:148](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/utils.ts#L148)

___

### formatProofForSnarkjsVerification

▸ **formatProofForSnarkjsVerification**(`proof`): `SnarkProof`

Format an one dimensional array for `snarkjs` verification

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `proof` | [`Field`](src.md#field)[] | The string array of the proof |

#### Returns

`SnarkProof`

The `SnarkProof` type proof data

#### Defined in

[circuits/src/utils.ts:34](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/utils.ts#L34)

___

### formatProofForVerifierContract

▸ **formatProofForVerifierContract**(`proof`): `string`[]

Format snark proof for verifier smart contract

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `proof` | `SnarkProof` | The proof of `SnarkProof` type |

#### Returns

`string`[]

An one dimensional array of stringified proof data

#### Defined in

[circuits/src/utils.ts:16](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/utils.ts#L16)

___

### shiftBits

▸ **shiftBits**(`data`, `shiftBits`, `variableBits`): `bigint`

Shift `shiftBits` bits and compute the **AND** operation in `variableBits` bits `data`.
For example, Get `data` from LSB `20` to `30` bits.
Then use `shiftBits(data, 20, 10)` to get the `10` bits data.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `data` | `bigint` | The raw data in `bigint` type. |
| `shiftBits` | `bigint` | The shifted bits. |
| `variableBits` | `bigint` | The output data bits. |

#### Returns

`bigint`

#### Defined in

[circuits/src/utils.ts:56](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/src/utils.ts#L56)
