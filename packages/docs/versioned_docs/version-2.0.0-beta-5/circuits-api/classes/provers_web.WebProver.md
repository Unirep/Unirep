---
id: "provers_web.WebProver"
title: "Class: WebProver"
sidebar_label: "WebProver"
custom_edit_url: null
---

[provers/web](../modules/provers_web.md).WebProver

The circuits package includes a browser compatible prover. This prover loads the proving keys from a remote URL.
By default this url is https://keys.unirep.io/${version}/.

The server is expected to serve the `zkey`, `wasm`, and `vkey` files at their respective names in the provided subpath.
e.g. for the above url the signup zkey is at https://keys.unirep.io/${version}/signup.zkey`.
@param serverUrl The server url to the `zkey`, `wasm`, and `vkey` files.
Default: `https://keys.unirep.io/${version}/`

**`Note`**

:::caution
The keys included are not safe for production use. A phase 2 trusted setup needs to be done before use.
:::

**`Example`**

**Default key server**
```ts
import { Circuit } from '@unirep/circuits'
import prover from '@unirep/circuits/provers/web'

await prover.genProofAndPublicSignals(Circuit.signup, {
 // circuit inputs
})
```

**Custom key server**
```ts
import { Circuit } from '@unirep/circuits'
import { WebProver } from '@unirep/circuits/provers/web'

// For a local key server
const prover = new WebProver('http://localhost:8000/keys/')
await prover.genProofAndPublicSignals(Circuit.signup, {
 // circuit inputs
})
```

## Constructors

### constructor

• **new WebProver**(`serverUrl?`)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `serverUrl` | `string` | `KEY_URL` |

#### Defined in

[circuits/provers/web.ts:48](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/provers/web.ts#L48)

## Properties

### cache

• **cache**: `Object` = `{}`

#### Index signature

▪ [key: `string`]: `any`

#### Defined in

[circuits/provers/web.ts:45](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/provers/web.ts#L45)

___

### url

• **url**: `string`

#### Defined in

[circuits/provers/web.ts:46](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/provers/web.ts#L46)

## Methods

### genProofAndPublicSignals

▸ **genProofAndPublicSignals**(`circuitName`, `inputs`): `Promise`<{ `proof`: `any` ; `publicSignals`: `any`  }\>

Generate proof and public signals with `snarkjs.groth16.fullProve`

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `circuitName` | `string` |  |
| `inputs` | `any` | Name of the circuit, which can be chosen from `Circuit` |

#### Returns

`Promise`<{ `proof`: `any` ; `publicSignals`: `any`  }\>

Snark proof and public signals

#### Defined in

[circuits/provers/web.ts:111](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/provers/web.ts#L111)

___

### getKey

▸ **getKey**(`circuitUrl`): `Promise`<`any`\>

Get key object from the server.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `circuitUrl` | `string` | The url to the a `vkey`, a `zkey`s or a `wasm`. |

#### Returns

`Promise`<`any`\>

The `vkey`, the `zkey`s or the `wasm` object.

#### Defined in

[circuits/provers/web.ts:57](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/provers/web.ts#L57)

___

### getVKey

▸ **getVKey**(`circuitName`): `Promise`<`any`\>

Get vkey from a remote URL.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `circuitName` | `string` | Name of the circuit, which can be chosen from `Circuit` |

#### Returns

`Promise`<`any`\>

vkey of the circuit

#### Defined in

[circuits/provers/web.ts:133](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/provers/web.ts#L133)

___

### verifyProof

▸ **verifyProof**(`circuitName`, `publicSignals`, `proof`): `Promise`<`any`\>

The function returns true if the proof of the circuit is valid, false otherwise.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `circuitName` | `string` | Name of the circuit, which can be chosen from `Circuit` |
| `publicSignals` | `SnarkPublicSignals` | The snark public signals that are generated from `genProofAndPublicSignals` |
| `proof` | `SnarkProof` | The snark proof that is generated from `genProofAndPublicSignals` |

#### Returns

`Promise`<`any`\>

True if the proof is valid, false otherwise

#### Defined in

[circuits/provers/web.ts:88](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/provers/web.ts#L88)

___

### warmKeys

▸ **warmKeys**(`circuitName`): `Promise`<`void`\>

Load proving keys for a circuit into memory. Future proofs using these keys will not need to wait for download.
:::tip
Use this function without `await` to start the download in the background.
:::

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `circuitName` | `string` | Name of the circuit, which can be chosen from `Circuit` |

#### Returns

`Promise`<`void`\>

**`Example`**

```ts
await webProver.warmKeys(circuitName: string)
```

#### Defined in

[circuits/provers/web.ts:75](https://github.com/Unirep/Unirep/blob/3b8a4270/packages/circuits/provers/web.ts#L75)
