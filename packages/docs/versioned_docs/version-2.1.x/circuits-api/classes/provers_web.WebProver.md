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

[circuits/provers/web.ts:49](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/provers/web.ts#L49)

## Properties

### cache

• **cache**: `Object` = `{}`

#### Index signature

▪ [key: `string`]: `any`

#### Defined in

[circuits/provers/web.ts:46](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/provers/web.ts#L46)

___

### url

• **url**: `string`

#### Defined in

[circuits/provers/web.ts:47](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/provers/web.ts#L47)

## Methods

### genProofAndPublicSignals

▸ **genProofAndPublicSignals**(`circuitName`, `inputs`): `Promise`<{ `proof`: `Groth16Proof` ; `publicSignals`: `PublicSignals`  }\>

Generate proof and public signals with `snarkjs.groth16.fullProve`

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `circuitName` | `string` |  |
| `inputs` | `any` | Name of the circuit, which can be chosen from `Circuit` |

#### Returns

`Promise`<{ `proof`: `Groth16Proof` ; `publicSignals`: `PublicSignals`  }\>

Snark proof and public signals

#### Defined in

[circuits/provers/web.ts:112](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/provers/web.ts#L112)

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

[circuits/provers/web.ts:58](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/provers/web.ts#L58)

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

[circuits/provers/web.ts:134](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/provers/web.ts#L134)

___

### verifyProof

▸ **verifyProof**(`circuitName`, `publicSignals`, `proof`): `Promise`<`boolean`\>

The function returns true if the proof of the circuit is valid, false otherwise.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `circuitName` | `string` | Name of the circuit, which can be chosen from `Circuit` |
| `publicSignals` | `PublicSignals` | The snark public signals that are generated from `genProofAndPublicSignals` |
| `proof` | `Groth16Proof` | The snark proof that is generated from `genProofAndPublicSignals` |

#### Returns

`Promise`<`boolean`\>

True if the proof is valid, false otherwise

#### Defined in

[circuits/provers/web.ts:89](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/provers/web.ts#L89)

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

[circuits/provers/web.ts:76](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/provers/web.ts#L76)
