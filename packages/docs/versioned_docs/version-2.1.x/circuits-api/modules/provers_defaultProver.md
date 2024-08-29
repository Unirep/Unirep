---
id: "provers_defaultProver"
title: "Module: provers/defaultProver"
sidebar_label: "provers/defaultProver"
sidebar_position: 0
custom_edit_url: null
---

## Variables

### defaultProver

• `Const` **defaultProver**: `Object`

The default prover that uses the circuits in default built folder `zksnarkBuild/`

**`Note`**

:::caution
The keys included are not safe for production use. A phase 2 trusted setup needs to be done before use.
:::

**`Example`**

```ts
import { Circuit } from '@unirep/circuits'
import prover from '@unirep/circuits/provers/defaultProver'

await prover.genProofAndPublicSignals(Circuit.signup, {
 // circuit inputs
})
```

#### Type declaration

| Name | Type |
| :------ | :------ |
| `genProofAndPublicSignals` | (`circuitName`: `string`, `inputs`: `any`) => `Promise`<`any`\> |
| `getVKey` | (`name`: `string`) => `Promise`<`any`\> |
| `verifyProof` | (`circuitName`: `string`, `publicSignals`: `PublicSignals`, `proof`: `Groth16Proof`) => `Promise`<`boolean`\> |

#### Defined in

[circuits/provers/defaultProver.ts:24](https://github.com/Unirep/Unirep/blob/60105749/packages/circuits/provers/defaultProver.ts#L24)
