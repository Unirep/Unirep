---
title: "Prover"
---

## Prover

The prover interface is used to write custom implementations for creating and verifying proofs. This abstracts away the logic of loading the proving keys. For example, a prover implementation could load the keys from disk, from a remote url, etc.

:::info

See the [`defaultProver`](default-prover) for an example implementation.

:::

## verifyProof

```ts
verifyProof: (
    name: string | Circuit,
    publicSignals: any,
    proof: any
) => Promise<boolean>
```

## genProofAndPublicSignals

```ts
genProofAndPublicSignals: (
    proofType: string | Circuit,
    inputs: any
) => Promise<{
    proof: any
    publicSignals: any
}>
```

## getVKey

```ts
getVKey: (name: string | Circuit) => Promise<any>
```
