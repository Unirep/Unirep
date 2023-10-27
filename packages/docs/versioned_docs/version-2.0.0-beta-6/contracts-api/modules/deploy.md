---
id: "deploy"
title: "Module: deploy"
sidebar_label: "deploy"
sidebar_position: 0
custom_edit_url: null
---

## Functions

### compileVerifier

▸ **compileVerifier**(`contractName`, `vkey`): `Promise`<{ `abi`: `any` ; `bytecode`: `any`  }\>

Compile the verifier smart contract with `solc`

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `contractName` | `string` | The name of output verifier contract |
| `vkey` | `any` | The verification key of the verifier |

#### Returns

`Promise`<{ `abi`: `any` ; `bytecode`: `any`  }\>

Output the compiled `abi` and `bytecode`

#### Defined in

[packages/contracts/deploy/utils.ts:130](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/contracts/deploy/utils.ts#L130)

___

### createVerifierName

▸ **createVerifierName**(`circuitName`): `string`

Create name of the verifier contracts. Capitalize the first character and add `Verifier` at the end.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `circuitName` | `string` | Name of the circuit, which can be chosen from `Circuit` |

#### Returns

`string`

#### Defined in

[packages/contracts/deploy/utils.ts:54](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/contracts/deploy/utils.ts#L54)

___

### deployUnirep

▸ **deployUnirep**(`deployer`, `settings?`, `prover?`): `Promise`<[`Unirep`](../interfaces/src.Unirep.md)\>

Deploy the unirep contract and verifier contracts with given `deployer` and settings

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `deployer` | `Signer` | A signer who will deploy the contracts |
| `settings?` | `CircuitConfig` | The settings that the deployer can define. See [`CircuitConfig`](https://developer.unirep.io/docs/circuits-api/circuit-config) |
| `prover?` | `Prover` | The prover which provides `vkey` of the circuit |

#### Returns

`Promise`<[`Unirep`](../interfaces/src.Unirep.md)\>

The Unirep smart contract

**`Example`**

```ts
import { ethers } from 'ethers'
import { Unirep } from '@unirep/contracts'
import { deployUnirep } from '@unirep/contracts/deploy'
const privateKey = 'YOUR/PRIVATE/KEY'
const provider = 'YOUR/ETH/PROVIDER'
const deployer = new ethers.Wallet(privateKey, provider);
const unirepContract: Unirep = await deployUnirep(deployer)
```

:::caution
The default circuit configuration is set in [`CircuitConfig.ts`](https://github.com/Unirep/Unirep/blob/1a3c9c944925ec125a7d7d8bfa9990466389477b/packages/circuits/src/CircuitConfig.ts).<br/>
Please make sure the `CircuitConfig` matches your [`prover`](circuits-api/interfaces/src.Prover.md).
If you don't compile circuits on your own, please don't change the `_settings` and `prover`.<br/>
See the current prover and settings of deployed contracts: [🤝 Testnet Deployment](https://developer.unirep.io/docs/testnet-deployment).
:::

#### Defined in

[packages/contracts/deploy/deploy.ts:189](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/contracts/deploy/deploy.ts#L189)

___

### deployVerifier

▸ **deployVerifier**(`deployer`, `circuitName`, `prover?`): `Promise`<`Contract`\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `deployer` | `Signer` | A signer or an ethereum wallet |
| `circuitName` | `string` | Name of the circuit, which can be chosen from `Circuit` |
| `prover?` | `Prover` | The prover which provides `vkey` of the circuit |

#### Returns

`Promise`<`Contract`\>

The deployed verifier smart contract

#### Defined in

[packages/contracts/deploy/deploy.ts:66](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/contracts/deploy/deploy.ts#L66)

___

### deployVerifierHelper

▸ **deployVerifierHelper**(`unirepAddress`, `deployer`, `circuitName`, `prover?`): `Promise`<`Contract`\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `unirepAddress` | `string` | - |
| `deployer` | `Signer` | A signer or an ethereum wallet |
| `circuitName` | `Circuit` | Name of the circuit, which can be chosen from `Circuit` |
| `prover?` | `Prover` | The prover which provides `vkey` of the circuit |

#### Returns

`Promise`<`Contract`\>

The deployed verifier helper contracts

#### Defined in

[packages/contracts/deploy/deploy.ts:137](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/contracts/deploy/deploy.ts#L137)

___

### deployVerifierHelpers

▸ **deployVerifierHelpers**(`unirepAddress`, `deployer`, `prover?`): `Promise`<{ `[circuit: string]`: `ethers.Contract`;  }\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `unirepAddress` | `string` | - |
| `deployer` | `Signer` | A signer or an ethereum wallet |
| `prover?` | `Prover` | The prover which provides `vkey` of the circuit |

#### Returns

`Promise`<{ `[circuit: string]`: `ethers.Contract`;  }\>

All deployed verifier helper contracts

#### Defined in

[packages/contracts/deploy/deploy.ts:112](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/contracts/deploy/deploy.ts#L112)

___

### deployVerifiers

▸ **deployVerifiers**(`deployer`, `prover?`): `Promise`<{ `[circuit: string]`: `string`;  }\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `deployer` | `Signer` | A signer or an ethereum wallet |
| `prover?` | `Prover` | The prover which provides `vkey` of the circuit |

#### Returns

`Promise`<{ `[circuit: string]`: `string`;  }\>

All deployed verifier smart contracts

#### Defined in

[packages/contracts/deploy/deploy.ts:95](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/contracts/deploy/deploy.ts#L95)

___

### genVerifier

▸ **genVerifier**(`contractName`, `vk`): `string`

Generate verifier smart contract with a given verification key.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `contractName` | `string` | The name of the verifier contract |
| `vk` | `any` | The verification key which is generated by snark protocol |

#### Returns

`string`

The string of the verifier content

#### Defined in

[packages/contracts/deploy/utils.ts:66](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/contracts/deploy/utils.ts#L66)

___

### linkLibrary

▸ **linkLibrary**(`bytecode`, `libraries?`): `string`

Link the library bytecode to a compiled smart contract bytecode.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `bytecode` | `string` | The compiled smart contract bytecode |
| `libraries` | `Object` | The name and the address of the library |

#### Returns

`string`

The combined bytecode

**`Example`**

```ts
linkLibrary(
  incArtifacts.bytecode,
  {
    ['poseidon-solidity/PoseidonT3.sol:PoseidonT3']: PoseidonT3.address,
  }
)
```

#### Defined in

[packages/contracts/deploy/utils.ts:22](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/contracts/deploy/utils.ts#L22)

___

### retryAsNeeded

▸ **retryAsNeeded**(`fn`, `maxRetry?`): `Promise`<`any`\>

Try a function several times.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `fn` | `any` | `undefined` | The function will be executed. |
| `maxRetry` | `number` | `10` | The maximum number of trying functions. |

#### Returns

`Promise`<`any`\>

#### Defined in

[packages/contracts/deploy/deploy.ts:45](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/contracts/deploy/deploy.ts#L45)

___

### tryPath

▸ **tryPath**(`file`): `any`

Try to find an artifact file in the paths.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `file` | `string` | The name of the file that will be searched. |

#### Returns

`any`

The found artifacts

#### Defined in

[packages/contracts/deploy/utils.ts:159](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/contracts/deploy/utils.ts#L159)
